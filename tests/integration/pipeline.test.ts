import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadContent } from "../../src/content/loader.js";
import { normalizeTags, resolvePageTitle } from "../../src/content/frontmatter.js";
import { containsMath, parseMarkdown, renderMarkdownTree } from "../../src/content/markdown.js";
import { extractToc } from "../../src/content/toc.js";
import { buildTargetIndex, resolveReferenceFragments } from "../../src/content/targets.js";
import { buildSiteGraph } from "../../src/graph/backlinks.js";
import { buildExplorerTree } from "../../src/graph/navigation.js";
import { renderExplorer } from "../../src/rendering/explorer.js";
import { getSlug, toHtmlPath } from "../../util.js";
import { copyAssets, writeStaticAssets } from "../../src/output/assets.js";
import { writePages } from "../../src/output/writer.js";
import { loadPageTemplate } from "../../src/output/templates.js";
import { renderPage } from "../../src/rendering/page.js";
import { createPresentationContext } from "../../src/rendering/context.js";
import type { SiteIdentity } from "../../src/site.js";
import type { Page, PageMetadata } from "../../src/domain/page.js";
import type { Root } from "mdast";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;

const ORIGINAL_BASE_PATH = process.env.MUFFIN_BASE_PATH;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
  if (ORIGINAL_BASE_PATH === undefined) {
    delete process.env.MUFFIN_BASE_PATH;
  } else {
    process.env.MUFFIN_BASE_PATH = ORIGINAL_BASE_PATH;
  }
});

const site: SiteIdentity = { title: "Muffin", lang: "en" };

interface ParseVaultOptions {
  exclude?: string[];
  vaultDir?: string;
}

async function parseVault(files: Record<string, string>, options: ParseVaultOptions = {}) {
  const vaultDir = options.vaultDir ?? dir;
  for (const [relPath, body] of Object.entries(files)) {
    writeFile(vaultDir, relPath, body);
  }
  const { contents, assets, slugMap } = await loadContent(vaultDir, options.exclude ?? []);
  const assetPaths = assets.map((asset) => asset.relPath);
  const parsed: Array<{ path: string; relPath: string; tree: Root }> = [];
  for (const content of contents) {
    const tree = await parseMarkdown(content.body, slugMap, content.relPath, assetPaths);
    parsed.push({ path: content.path, relPath: content.relPath, tree });
  }
  const targetIndex = buildTargetIndex(parsed);
  resolveReferenceFragments(parsed, targetIndex);
  const graph = await buildSiteGraph(parsed);
  return { vaultDir, contents, assets, slugMap, parsed, graph, targetIndex };
}

async function renderVault(files: Record<string, string>, options: ParseVaultOptions = {}) {
  const { vaultDir, contents, parsed } = await parseVault(files, options);
  let hasMath = false;
  for (const entry of parsed) {
    if (containsMath(entry.tree)) {
      hasMath = true;
    }
  }

  const outputRoot = path.join(vaultDir, "muffin");
  const metadata: PageMetadata[] = [];
  const pages: Array<{ path: string; renderedHtml: string }> = [];
  for (const content of contents) {
    const parsedContent = parsed.find((p) => p.path === content.path);
    if (!parsedContent) continue;
    const slug = getSlug(content.path);
    const statusValue = content.frontmatter.status;
    const pageMetadata: PageMetadata = {
      frontmatter: content.frontmatter,
      ...(typeof statusValue === "string" ? { status: statusValue } : {}),
      updated: "2026-01-01",
      tags: normalizeTags(content.frontmatter.tags),
    };
    metadata.push(pageMetadata);
    const renderedPage: Page = {
      path: content.path,
      relPath: content.relPath,
      slug,
      title: resolvePageTitle(content.frontmatter, content.path),
      metadata: pageMetadata,
      // TOC is extracted before rendering mutates the shared AST.
      toc: extractToc(parsedContent.tree),
      content: await renderMarkdownTree(parsedContent.tree),
    };
    pages.push({
      path: content.path,
      renderedHtml: renderPage(
        createPresentationContext(renderedPage, site, "", { hasMath }),
        loadPageTemplate(),
      ),
    });
  }

  writePages(pages, { contentRoot: vaultDir, outputRoot });
  writeStaticAssets({ outputRoot, hasMath });

  return { outputRoot, html: pages[0]?.renderedHtml ?? "", metadata };
}

describe("content pipeline", () => {
  it("discovers files, tracks only wikilinks in the graph, and pages render end to end", async () => {
    const { vaultDir, contents, parsed, graph } = await parseVault({
      "Home.md": '---\ntitle: Home\n---\n\nWelcome to [[About]]. Visit https://example.com or [plain](https://x.io).',
      "Projects/DeepDive.md": "# Deep dive.",
      "About.md": "# About\n\nSee **notes**.",
      "Notes/Deep Note.md": "Linked [[Home]].",
    });

    expect(contents.map((content) => content.relPath).sort()).toEqual([
      "About.md",
      "Home.md",
      "Notes/Deep Note.md",
      "Projects/DeepDive.md",
    ]);
    expect(graph.forwardLinks["Home.md"]).toEqual(["About.md"]);
    expect(graph.forwardLinks["About.md"]).toEqual([]);
    expect(graph.backlinks["Home.md"]).toEqual(["Notes/Deep Note.md"]);
    expect(graph.backlinks["Notes/Deep Note.md"]).toBeUndefined();

    const pages: Array<{ path: string; renderedHtml: string }> = [];
    for (const content of contents) {
      const parsedContent = parsed.find((p) => p.path === content.path);
      if (!parsedContent) continue;
      pages.push({
        path: content.path,
        renderedHtml: await renderMarkdownTree(parsedContent.tree),
      });
    }
    const outputRoot = path.join(vaultDir, "muffin");
    writePages(pages, { contentRoot: vaultDir, outputRoot });

    const aboutHtml = fs.readFileSync(path.join(outputRoot, "About.html"), "utf-8");
    expect(aboutHtml).toContain('<h1 id="about">About</h1>');
    expect(aboutHtml).toContain("<strong>notes</strong>");
  });

  it("builds a vault with image and PDF embeds, copies assets, and excludes embeds from the graph", async () => {
    const { vaultDir, contents, assets, parsed, graph } = await parseVault({
      "home.md": "# Home\n\nSee ![[test.png|300]], ![[report.pdf]], and [[About]].",
      "About.md": "# About",
      "images/test.png": "PNGDATA",
      "files/report.pdf": "%PDF-BINARY",
    });

    expect(assets.map((asset) => asset.relPath).sort()).toEqual([
      "files/report.pdf",
      "images/test.png",
    ]);
    expect(graph.forwardLinks["home.md"]).toEqual(["About.md"]);

    const pages: Array<{ path: string; renderedHtml: string }> = [];
    for (const content of contents) {
      const parsedContent = parsed.find((p) => p.path === content.path);
      if (!parsedContent) continue;
      pages.push({
        path: content.path,
        renderedHtml: await renderMarkdownTree(parsedContent.tree),
      });
    }

    const outputRoot = path.join(vaultDir, "muffin");
    writePages(pages, { contentRoot: vaultDir, outputRoot });
    copyAssets(assets, { outputRoot });

    const homeHtml = fs.readFileSync(path.join(outputRoot, "home.html"), "utf-8");
    expect(homeHtml).toContain('<img src="/images/test.png" alt="test" width="300">');
    expect(homeHtml).toContain(
      '<iframe class="pdf-embed" src="/files/report.pdf" title="report"></iframe>',
    );
    expect(homeHtml).toContain('<a href="/About.html">About</a>');

    expect(fs.readFileSync(path.join(outputRoot, "images", "test.png"), "utf-8")).toBe("PNGDATA");
    expect(fs.readFileSync(path.join(outputRoot, "files", "report.pdf"), "utf-8")).toBe(
      "%PDF-BINARY",
    );
  });

  it("resolves heading and block references end to end alongside math, PDFs, and callouts", async () => {
    const { vaultDir, parsed, graph } = await parseVault({
      "Home.md": [
        "See [[Target#References]], [[Target#^call-body]], and [[Target#Missing Section]].",
        "",
        "Math $E = mc^2$ with ![[report.pdf]].",
        "",
        "> [!tip] Tip",
        "> Link [[Target]] inside a callout.",
      ].join("\n"),
      "Target.md": [
        "# References",
        "",
        "body ^para-block",
        "",
        "> [!note] Block",
        "> inside ^call-body",
      ].join("\n"),
      "files/report.pdf": "%PDF-BINARY",
    });

    const home = parsed.find((p) => p.path === path.join(vaultDir, "Home.md"));
    const target = parsed.find((p) => p.path === path.join(vaultDir, "Target.md"));
    expect(home).toBeDefined();
    expect(target).toBeDefined();
    const homeHtml = await renderMarkdownTree(home!.tree);
    const targetHtml = await renderMarkdownTree(target!.tree);

    expect(homeHtml).toContain('<a href="/Target.html#references">References</a>');
    expect(homeHtml).toContain('<a href="/Target.html#%5Ecall-body">^call-body</a>');
    expect(homeHtml).toContain('<a href="/Target.html#missing-section">Missing Section</a>');
    expect(homeHtml).toContain('<a href="/Target.html">Target</a>');
    expect(homeHtml).toContain('<span class="katex">');
    expect(homeHtml).toContain('<iframe class="pdf-embed" src="/files/report.pdf"');
    expect(homeHtml).toContain('data-callout="tip"');

    expect(targetHtml).toContain('<h1 id="references">References</h1>');
    expect(targetHtml).toContain('<p id="^para-block">body</p>');
    expect(targetHtml).toContain('<div class="callout-body"><p id="^call-body">inside</p></div>');

    expect(graph.forwardLinks["Home.md"]).toEqual(["Target.md", "Target.md", "Target.md", "Target.md"]);
    expect(graph.backlinks["Target.md"]).toEqual(["Home.md"]);
  });

  it("renders GFM and OFM features through the full pipeline", async () => {
    const { parsed, graph } = await parseVault({
      "Home.md": [
        "# Home",
        "",
        "| Feature | Check |",
        "| --- | --- |",
        "| \u2764\u2764 | done \u2764 |",
        "",
        "- [x] task done",
        "- [ ] task todo",
        "",
        "==highlight== and %%hidden text%%.",
        "",
        "$E = mc^2$",
        "",
        "> [!note] Heads up",
        "> callout body with [[About]]",
        "",
        "Footnote here[^1].",
        "",
        "[^1]: the footnote body",
      ].join("\n"),
      "About.md": "# About",
    });

    const home = parsed.find((p) => p.path.endsWith("Home.md"));
    expect(home).toBeDefined();
    const html = await renderMarkdownTree(home!.tree);

    expect(html).toContain("<table>");
    expect(html).toContain("<th>Feature</th>");
    expect(html).toContain('<ul class="contains-task-list">');
    expect(html).toContain('<input type="checkbox" checked disabled> task done');
    expect(html).toContain("<mark>highlight</mark>");
    expect(html).toContain('<span class="katex">');
    expect(html).toContain('data-callout="note"');
    expect(html).toContain('<a href="/About.html">About</a>');
    expect(html).toContain('class="footnotes"');
    expect(html).not.toContain("%%");
    expect(graph.forwardLinks["Home.md"]).toEqual(["About.md"]);
  });

  it("loads a constant-driven build via MUFFIN_BASE_PATH and site constants, honoring exclude and homepage", async () => {
    const vaultDir = path.join(dir, "notes");
    writeFile(vaultDir, "Home.md", "# Home\n\nWelcome to [[About]].");
    writeFile(vaultDir, "About.md", "# About");
    writeFile(vaultDir, "drafts/Secret.md", "# Secret");
    writeFile(vaultDir, "images/logo.png", "png");

    const { contents, parsed } = await parseVault(
      {},
      { vaultDir, exclude: ["drafts/**"] },
    );
    expect(contents.map((content) => content.relPath).sort()).toEqual(["About.md", "Home.md"]);

    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const pages: Array<{ path: string; renderedHtml: string }> = [];
    for (const content of contents) {
      const parsedContent = parsed.find((p) => p.path === content.path);
      if (!parsedContent) continue;
      pages.push({
        path: content.path,
        renderedHtml: await renderMarkdownTree(parsedContent.tree),
      });
    }

    const outputRoot = path.join(dir, "out");
    writePages(pages, { homepage: "Home", contentRoot: vaultDir, outputRoot });
    writeStaticAssets({ outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "index.html"), "utf-8")).toContain(
      'href="/Muffin/About.html"',
    );
    expect(fs.readFileSync(path.join(outputRoot, "styles.css"), "utf-8")).toContain(
      "--color-text: #E8EAED;",
    );
    expect(fs.existsSync(path.join(outputRoot, "About.html"))).toBe(true);
    expect(fs.existsSync(path.join(outputRoot, "drafts", "Secret.html"))).toBe(false);
    expect(fs.existsSync(path.join(outputRoot, "theme.css"))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), "drafts", "Secret.html"))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), "out", "Home.html"))).toBe(false);
  });
});

describe("current-page explorer highlighting", () => {
  async function renderWithExplorer(
    files: Record<string, string>,
    basePath = "",
  ): Promise<Map<string, string>> {
    if (basePath !== "") process.env.MUFFIN_BASE_PATH = basePath;
    const { vaultDir, contents, parsed } = await parseVault(files);
    const explorerTree = buildExplorerTree(contents);
    const template = loadPageTemplate();
    const siteIdentity: SiteIdentity = { title: "Muffin", lang: "en" };
    const pages: Array<{ path: string; renderedHtml: string }> = [];

    for (const content of contents) {
      const parsedContent = parsed.find((p) => p.path === content.path);
      if (!parsedContent) continue;
      const renderedPage: Page = {
        path: content.path,
        relPath: content.relPath,
        slug: getSlug(content.path),
        title: resolvePageTitle(content.frontmatter, content.path),
        metadata: {
          frontmatter: content.frontmatter,
          updated: "2026-01-01",
          tags: normalizeTags(content.frontmatter.tags),
        },
        toc: extractToc(parsedContent.tree),
        content: await renderMarkdownTree(parsedContent.tree),
      };
      pages.push({
        path: content.path,
        renderedHtml: renderPage(
          createPresentationContext(
            renderedPage,
            siteIdentity,
            renderExplorer(explorerTree, content.relPath),
            { hasMath: false },
          ),
          template,
        ),
      });
    }

    const outputRoot = path.join(vaultDir, "muffin");
    writePages(pages, { contentRoot: vaultDir, outputRoot });

    const htmlByRelPath = new Map<string, string>();
    for (const content of contents) {
      htmlByRelPath.set(
        content.relPath,
        fs.readFileSync(path.join(outputRoot, toHtmlPath(content.relPath)), "utf-8"),
      );
    }
    return htmlByRelPath;
  }

  it("activates exactly one explorer item per page, keyed by relPath, for duplicate basenames", async () => {
    const htmlByRelPath = await renderWithExplorer({
      "notes/project.md": "# Notes Project",
      "archive/project.md": "# Archive Project",
    });

    const notesHtml = htmlByRelPath.get("notes/project.md")!;
    const archiveHtml = htmlByRelPath.get("archive/project.md")!;

    expect(notesHtml.match(/aria-current="page"/g)).toHaveLength(1);
    expect(notesHtml.match(/explorer-current/g) ?? []).toHaveLength(1);
    expect(notesHtml).toContain(
      'data-explorer-path="notes/project.md"><a href="/notes/project.html" aria-current="page">project</a>',
    );

    expect(archiveHtml.match(/aria-current="page"/g)).toHaveLength(1);
    expect(archiveHtml).toContain(
      'data-explorer-path="archive/project.md"><a href="/archive/project.html" aria-current="page">project</a>',
    );
    expect(archiveHtml).toContain('data-explorer-path="notes/project.md"><a href="/notes/project.html">');
  });

  it("marks the ancestor folder active only for the page inside it", async () => {
    const htmlByRelPath = await renderWithExplorer({
      "notes/project.md": "# Notes Project",
      "archive/project.md": "# Archive Project",
    });

    const notesHtml = htmlByRelPath.get("notes/project.md")!;
    expect(notesHtml.match(/explorer-active-folder/g) ?? []).toHaveLength(1);
    expect(notesHtml).toContain('<details data-folder-path="notes">');
    expect(notesHtml).toContain('<li class="explorer-folder explorer-active-folder">');

    const archiveHtml = htmlByRelPath.get("archive/project.md")!;
    expect(archiveHtml.match(/explorer-active-folder/g) ?? []).toHaveLength(1);
    expect(archiveHtml).toContain('<details data-folder-path="archive">');
  });

  it("emits body data-relpath and base-pathed explorer links under a base path", async () => {
    const htmlByRelPath = await renderWithExplorer(
      { "notes/project.md": "# Notes Project" },
      "/Muffin",
    );

    const html = htmlByRelPath.get("notes/project.md")!;
    expect(html).toContain('<body data-slug="project" data-relpath="notes/project.md" data-base-path="/Muffin">');
    expect(html).toContain('data-explorer-path="notes/project.md"><a href="/Muffin/notes/project.html" aria-current="page">project</a>');
  });
});

describe("conditional KaTeX output", () => {
  it("emits no katex for a math-free vault and katex assets plus the link for a math vault", async () => {
    const plain = await renderVault({ "Home.md": "# Home" });
    expect(fs.existsSync(path.join(plain.outputRoot, "katex"))).toBe(false);
    expect(plain.html).not.toContain("katex");

    const math = await renderVault({ "Home.md": "Inline $C_L$ math." }, { vaultDir: path.join(dir, "math") });
    expect(fs.existsSync(path.join(math.outputRoot, "katex", "katex.min.css"))).toBe(true);
    expect(fs.existsSync(path.join(math.outputRoot, "katex", "fonts"))).toBe(true);
    expect(math.html).toContain('<link rel="stylesheet" href="/katex/katex.min.css">');
    expect(math.html).toContain('<span class="katex">');
  });
});

describe("frontmatter tags through the pipeline", () => {
  it("normalizes tags into metadata across page shapes and preserves raw frontmatter", async () => {
    const { metadata } = await renderVault({
      "Tagged.md": "---\nstatus: draft\ntags:\n  - programming\n  - typescript\n---\n\n# Tagged",
      "Plain.md": "# Plain",
      "Single.md": "---\ntags: programming\n---\n\n# Single",
      "Ordered.md": "---\ntags:\n  - TypeScript\n  - Muffin\n  - Programming\n---\n\n# Ordered",
    });

    const tagged = metadata.find((m) => m.frontmatter.status === "draft");
    expect(tagged?.tags).toEqual(["programming", "typescript"]);
    expect(tagged?.status).toBe("draft");

    expect(metadata.find((m) => Object.keys(m.frontmatter).length === 0)?.tags).toEqual([]);

    const single = metadata.find((m) => m.frontmatter.tags === "programming");
    expect(single?.tags).toEqual(["programming"]);
    expect(single?.frontmatter.tags).toBe("programming");

    const ordered = metadata.find(
      (m) => Array.isArray(m.frontmatter.tags) && m.frontmatter.tags[0] === "TypeScript",
    );
    expect(ordered?.tags).toEqual(["TypeScript", "Muffin", "Programming"]);
  });
});

describe("frontmatter title through the pipeline", () => {
  it("renders the explicit frontmatter title into the document <title>", async () => {
    const { html } = await renderVault({
      "Titled.md": "---\ntitle: Custom Page Title\n---\n\n# Titled",
    });

    expect(html).toContain("<title>Custom Page Title</title>");
    expect(html).toContain("<h1>Custom Page Title</h1>");
  });
});
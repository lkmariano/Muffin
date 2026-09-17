import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadContent } from "../../src/content/loader.js";
import { parseMarkdown, renderMarkdownTree } from "../../src/content/markdown.js";
import { buildSiteGraph, resolveBacklinks } from "../../src/graph/backlinks.js";
import { getSlug } from "../../util.js";
import { copyAssets, writeStaticAssets } from "../../src/output/assets.js";
import { writePages } from "../../src/output/writer.js";
import { loadConfig } from "../../src/config/loader.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
});

describe("content pipeline", () => {
  it("discovers files, builds the graph, and renders pages end to end", async () => {
    writeFile(dir, "Home.md", "---\ntitle: Home\n---\n\nWelcome to [[About]].");
    writeFile(dir, "Projects/DeepDive.md", "# Deep dive.");
    writeFile(dir, "About.md", "# About\n\nSee **notes**.");
    writeFile(dir, "Notes/Deep Note.md", "Linked [[Home]].");

    const { contents, slugMap } = await loadContent(dir);
    expect(contents).toHaveLength(4);

    const parsed = await Promise.all(
      contents.map(async (content) => ({
        path: content.path,
        tree: await parseMarkdown(content.body, slugMap, content.path),
      })),
    );

    const graph = await buildSiteGraph(parsed);

    const pages: Array<{
      slug: string;
      html: string;
      backlinks: Array<{ title: string; href: string }>;
    }> = [];
    for (const content of contents) {
      const slug = getSlug(content.path);
      const parsedContent = parsed.find((p) => p.path === content.path);
      if (!parsedContent) continue;
      const html = await renderMarkdownTree(parsedContent.tree);
      pages.push({
        slug,
        html,
        backlinks: resolveBacklinks(graph, slug, slugMap),
      });
    }

    const home = pages.find((page) => page.slug === "home");
    expect(home).toBeDefined();
    expect(home?.html).toContain("Welcome to");
    expect(home?.html).toContain("</a>");

    expect(graph.forwardLinks["home"]).toEqual(["about"]);
    expect(graph.backlinks["home"]).toEqual(["deep-note"]);
  });

  it("builds a vault with image embeds, copies assets, and excludes embeds from the graph", async () => {
    writeFile(dir, "home.md", "# Home");
    writeFile(dir, "notes/example.md", "See ![[test.png|300]].");
    writeFile(dir, "images/test.png", "PNGDATA");

    const { contents, assets, slugMap } = await loadContent(dir);
    const assetPaths = assets.map((asset) => asset.relPath);

    const parsed = await Promise.all(
      contents.map(async (content) => ({
        path: content.path,
        tree: await parseMarkdown(content.body, slugMap, content.relPath, assetPaths),
      })),
    );

    const graph = await buildSiteGraph(parsed);

    const pages: Array<{ path: string; renderedHtml: string }> = [];
    for (const content of contents) {
      const parsedContent = parsed.find((p) => p.path === content.path);
      if (!parsedContent) continue;
      pages.push({
        path: content.path,
        renderedHtml: await renderMarkdownTree(parsedContent.tree),
      });
    }

    const outputRoot = path.join(dir, "muffin");
    writePages(pages, { contentRoot: dir, outputRoot });
    copyAssets(assets, { outputRoot });

    const exampleHtml = fs.readFileSync(
      path.join(outputRoot, "notes", "example.html"),
      "utf-8",
    );
    expect(exampleHtml).toContain('<img src="/images/test.png" alt="test" width="300">');

    expect(fs.existsSync(path.join(outputRoot, "home.html"))).toBe(true);
    expect(fs.readFileSync(path.join(outputRoot, "images", "test.png"), "utf-8")).toBe("PNGDATA");

    expect(graph.forwardLinks["example"]).toEqual([]);
    expect(graph.backlinks["example"]).toBeUndefined();
  });

  it("only records wikilinks in the graph, not autolinks or plain links", async () => {
    writeFile(dir, "Home.md", "Visit https://example.com.\n\n[plain](https://x.io).\n\nSee [[About]].");
    writeFile(dir, "About.md", "# About");

    const { contents, slugMap } = await loadContent(dir);
    const parsed = await Promise.all(
      contents.map(async (content) => ({
        path: content.path,
        tree: await parseMarkdown(content.body, slugMap, content.path),
      })),
    );

    const graph = await buildSiteGraph(parsed);

    expect(graph.forwardLinks["home"]).toEqual(["about"]);
    expect(graph.forwardLinks["about"]).toEqual([]);
  });

  it("renders GFM and simple OFM features through the full pipeline", async () => {
    writeFile(dir, "Home.md", [
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
    ].join("\n"));
    writeFile(dir, "About.md", "# About");

    const { contents, slugMap } = await loadContent(dir);
    const parsed = await Promise.all(
      contents.map(async (content) => ({
        path: content.path,
        tree: await parseMarkdown(content.body, slugMap, content.path),
      })),
    );
    const graph = await buildSiteGraph(parsed);

    const home = parsed.find((p) => p.path === path.join(dir, "Home.md"));
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
    expect(graph.forwardLinks["home"]).toEqual(["about"]);
  });

  it("copies PDF assets, renders PDF embeds, and keeps them out of the graph", async () => {
    writeFile(dir, "home.md", "# Home\n\nSee ![[report.pdf]] and [[About]].");
    writeFile(dir, "About.md", "# About");
    writeFile(dir, "files/report.pdf", "%PDF-BINARY");

    const { contents, assets, slugMap } = await loadContent(dir);
    const assetPaths = assets.map((asset) => asset.relPath);
    expect(assetPaths).toContain("files/report.pdf");

    const parsed = await Promise.all(
      contents.map(async (content) => ({
        path: content.path,
        tree: await parseMarkdown(content.body, slugMap, content.relPath, assetPaths),
      })),
    );

    const graph = await buildSiteGraph(parsed);
    expect(graph.forwardLinks["home"]).toEqual(["about"]);

    const pages: Array<{ path: string; renderedHtml: string }> = [];
    for (const content of contents) {
      const parsedContent = parsed.find((p) => p.path === content.path);
      if (!parsedContent) continue;
      pages.push({
        path: content.path,
        renderedHtml: await renderMarkdownTree(parsedContent.tree),
      });
    }

    const outputRoot = path.join(dir, "muffin");
    writePages(pages, { contentRoot: dir, outputRoot });
    copyAssets(assets, { outputRoot });

    const homeHtml = fs.readFileSync(path.join(outputRoot, "Home.html"), "utf-8");
    expect(homeHtml).toContain(
      '<iframe class="pdf-embed" src="/files/report.pdf" title="report"></iframe>',
    );

    expect(
      fs.readFileSync(path.join(outputRoot, "files", "report.pdf"), "utf-8"),
    ).toBe("%PDF-BINARY");
  });

  it("loads a muffin.config.ts and drives discovery, exclusion, homepage, and theme", async () => {
    const vaultDir = path.join(dir, "notes");
    writeFile(vaultDir, "Home.md", "# Home\n\nWelcome to [[About]].");
    writeFile(vaultDir, "About.md", "# About");
    writeFile(vaultDir, "drafts/Secret.md", "# Secret");
    writeFile(vaultDir, "images/logo.png", "png");

    const outputDir = path.join(dir, "site-out");
    const configFile = writeFile(
      dir,
      "muffin.config.ts",
      [
        "export default {",
        `  content: { directory: ${JSON.stringify(vaultDir)}, exclude: ["drafts/**"] },`,
        '  homepage: { page: "Home" },',
        `  output: { directory: ${JSON.stringify(outputDir)} },`,
        '  theme: { tokens: { layout: { contentWidth: "720px" } } },',
        "};",
      ].join("\n"),
    );

    const config = await loadConfig(configFile);
    expect(config.content.exclude).toEqual(["drafts/**"]);
    expect(config.homepage).toBe("Home");

    const { contents, slugMap } = await loadContent(
      config.content.directory,
      config.content.exclude,
    );
    expect(contents.map((content) => content.relPath).sort()).toEqual(["About.md", "Home.md"]);

    const parsed = await Promise.all(
      contents.map(async (content) => ({
        path: content.path,
        tree: await parseMarkdown(content.body, slugMap, content.relPath),
      })),
    );
    const graph = await buildSiteGraph(parsed);

    const pages: Array<{ path: string; renderedHtml: string }> = [];
    for (const content of contents) {
      const parsedContent = parsed.find((p) => p.path === content.path);
      if (!parsedContent) continue;
      pages.push({
        path: content.path,
        renderedHtml: await renderMarkdownTree(parsedContent.tree),
      });
    }

    writePages(pages, {
      homepage: config.homepage,
      contentRoot: config.content.directory,
      outputRoot: config.output.directory,
    });
    writeStaticAssets(config.theme, { outputRoot: config.output.directory });

    expect(fs.readFileSync(path.join(outputDir, "index.html"), "utf-8")).toContain(
      "Welcome to",
    );
    expect(fs.existsSync(path.join(outputDir, "drafts", "Secret.html"))).toBe(false);
    expect(fs.readFileSync(path.join(outputDir, "theme.css"), "utf-8")).toContain(
      "--layout-content-width: 720px;",
    );
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadContent } from "../../src/content/loader.js";
import { parseMarkdown, renderMarkdownTree } from "../../src/content/markdown.js";
import { buildSiteGraph, resolveBacklinks } from "../../src/graph/backlinks.js";
import { resolvePageType } from "../../src/domain/page.js";
import { getSlug } from "../../util.js";
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
    writeFile(dir, "Projects/Portfolio.md", "---\ntype: portfolio\n---\n\n# Portfolio items.");
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
      pageType: string;
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
        // CHANGED: mirrors build.ts — frontmatter.type resolves the page type.
        pageType: resolvePageType(content.frontmatter),
        html,
        backlinks: resolveBacklinks(graph, slug, slugMap),
      });
    }

    const home = pages.find((page) => page.slug === "home");
    expect(home).toBeDefined();
    expect(home?.html).toContain("Welcome to");
    expect(home?.html).toContain("</a>");

    // CHANGED: the frontmatter-declared portfolio type survives the pipeline.
    const portfolio = pages.find((page) => page.slug === "portfolio");
    expect(portfolio?.pageType).toBe("portfolio");

    expect(graph.forwardLinks["home"]).toEqual(["about"]);
    expect(graph.backlinks["home"]).toEqual(["deep-note"]);
  });
});

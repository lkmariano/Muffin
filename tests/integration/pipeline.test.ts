import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMarkdownFiles } from "../../src/content/loader.js";
import { buildSiteGraph } from "../../src/graph/backlinks.js";
import { renderMarkdownFile } from "../../src/content/markdown.js";
import { getSlug, getTitle } from "../../util.js";
import { withBasePath } from "../../basePath.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";
import path from "node:path";

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
    writeFile(dir, "About.md", "# About\n\nSee **notes**.");
    writeFile(dir, "Notes/Deep Note.md", "Linked [[Home]].");

    const markdownFiles = await getMarkdownFiles(dir);
    expect(markdownFiles).toHaveLength(3);

    const slugMap: Record<string, string[]> = {};
    for (const file of markdownFiles) {
      const slug = getSlug(file);
      if (!slugMap[slug]) {
        slugMap[slug] = [];
      }
      slugMap[slug].push(file);
    }

    const graph = await buildSiteGraph(markdownFiles, slugMap);

    const resolveBacklinks = (slug: string): Array<{ title: string; href: string }> =>
      (graph.backlinks[slug] ?? [])
        .map((sourceSlug) => slugMap[sourceSlug]?.[0])
        .filter((filePath): filePath is string => typeof filePath === "string")
        .map((filePath) => ({
          title: getTitle(filePath),
          href: withBasePath(`/${path.relative("./content", filePath).replace(/\.md$/, ".html").replace(/\\/g, "/")}`),
        }));

    const pages: Array<{
      slug: string;
      html: string;
      frontmatter: Record<string, unknown>;
      backlinks: Array<{ title: string; href: string }>;
    }> = [];
    for (const file of markdownFiles) {
      const { html, frontmatter } = await renderMarkdownFile(file, slugMap);
      pages.push({
        slug: getSlug(file),
        html,
        frontmatter,
        backlinks: resolveBacklinks(getSlug(file)),
      });
    }

    const home = pages.find((page) => page.slug === "home");
    expect(home).toBeDefined();
    expect(home?.html).toContain("Welcome to");
    expect(home?.html).toContain("</a>");
    expect(home?.frontmatter.title).toBe("Home");

    expect(graph.forwardLinks["home"]).toEqual(["about"]);
    expect(graph.backlinks["home"]).toEqual(["deep-note"]);
  });
});
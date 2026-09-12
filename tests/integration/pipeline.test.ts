import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { getMarkdownFiles } from "../../src/content/loader.js";
import { buildSiteGraph, resolveBacklinks } from "../../src/graph/backlinks.js";
import { renderMarkdown } from "../../src/content/markdown.js";
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

    const contentMap = new Map<string, string>();
    for (const file of markdownFiles) {
      contentMap.set(file, fs.readFileSync(file, "utf-8"));
    }

    const graph = await buildSiteGraph(contentMap, slugMap);

    const pages: Array<{
      slug: string;
      html: string;
      frontmatter: Record<string, unknown>;
      backlinks: Array<{ title: string; href: string }>;
    }> = [];
    for (const file of markdownFiles) {
      const { html, frontmatter } = await renderMarkdown(contentMap.get(file)!, slugMap, file);
      pages.push({
        slug: getSlug(file),
        html,
        frontmatter,
        backlinks: resolveBacklinks(graph, getSlug(file), slugMap),
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
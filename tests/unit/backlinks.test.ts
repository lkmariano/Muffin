import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSiteGraph, resolveBacklinks } from "../../src/graph/backlinks.js";
import { loadContent } from "../../src/content/loader.js";
import { parseMarkdown } from "../../src/content/markdown.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

async function parseContents(directory: string) {
  const { contents, slugMap } = await loadContent(directory);
  const parsed = await Promise.all(
    contents.map(async (content) => ({
      path: content.path,
      tree: await parseMarkdown(content.body, slugMap, content.path),
    })),
  );
  return { contents, parsed, slugMap };
}

let dir: string;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
});

describe("buildSiteGraph", () => {
  it("computes forward and back links from wikilinks", async () => {
    writeFile(dir, "Alpha.md", "# Alpha\n\nLinks to [[Beta]] and [[Gamma]].");
    writeFile(dir, "Beta.md", "# Beta\n\nLinks to [[Alpha]].");
    writeFile(dir, "Gamma.md", "# Gamma");

    const { parsed } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    expect(graph.forwardLinks["alpha"]).toEqual(["beta", "gamma"]);
    expect(graph.forwardLinks["beta"]).toEqual(["alpha"]);
    expect(graph.forwardLinks["gamma"]).toEqual([]);
    expect(graph.backlinks["beta"]).toEqual(["alpha"]);
    expect(graph.backlinks["alpha"]).toEqual(["beta"]);
  });

  it("does not record duplicate sources in backlinks", async () => {
    writeFile(dir, "Source.md", "[[Target]] then again [[Target]].");
    writeFile(dir, "Target.md", "# Target");

    const { parsed } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    expect(graph.backlinks["target"]).toEqual(["source"]);
  });

  it("resolves backlinks to titles and .html hrefs", async () => {
    writeFile(dir, "Alpha.md", "Links [[Beta]].");
    writeFile(dir, "Beta.md", "# Beta");

    const { parsed, slugMap } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    const backlinks = resolveBacklinks(graph, "beta", slugMap);
    expect(backlinks).toHaveLength(1);
    expect(backlinks[0]?.title).toBe("Alpha");
    expect(backlinks[0]?.href.endsWith("Alpha.html")).toBe(true);
  });

  it("returns an empty list when a slug has no backlinks", async () => {
    writeFile(dir, "Alpha.md", "# Alpha");

    const { parsed, slugMap } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    expect(resolveBacklinks(graph, "alpha", slugMap)).toEqual([]);
  });
});
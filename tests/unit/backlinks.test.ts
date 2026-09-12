import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { buildSiteGraph, resolveBacklinks } from "../../src/graph/backlinks.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
});

function buildContentMap(filePaths: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const file of filePaths) {
    map.set(file, fs.readFileSync(file, "utf-8"));
  }
  return map;
}

describe("buildSiteGraph", () => {
  it("computes forward and back links from wikilinks", async () => {
    const alpha = writeFile(dir, "Alpha.md", "# Alpha\n\nLinks to [[Beta]] and [[Gamma]].");
    const beta = writeFile(dir, "Beta.md", "# Beta\n\nLinks to [[Alpha]].");
    const gamma = writeFile(dir, "Gamma.md", "# Gamma");

    const slugMap = {
      alpha: [alpha],
      beta: [beta],
      gamma: [gamma],
    };

    const graph = await buildSiteGraph(buildContentMap([alpha, beta, gamma]), slugMap);

    expect(graph.forwardLinks["alpha"]).toEqual(["beta", "gamma"]);
    expect(graph.forwardLinks["beta"]).toEqual(["alpha"]);
    expect(graph.forwardLinks["gamma"]).toEqual([]);
    expect(graph.backlinks["beta"]).toEqual(["alpha"]);
    expect(graph.backlinks["alpha"]).toEqual(["beta"]);
  });

  it("does not record duplicate sources in backlinks", async () => {
    const source = writeFile(dir, "Source.md", "[[Target]] then again [[Target]].");
    const target = writeFile(dir, "Target.md", "# Target");

    const slugMap = { source: [source], target: [target] };
    const graph = await buildSiteGraph(buildContentMap([source, target]), slugMap);

    expect(graph.backlinks["target"]).toEqual(["source"]);
  });

  it("resolves backlinks to titles and .html hrefs", async () => {
    const alpha = writeFile(dir, "Alpha.md", "Links [[Beta]].");
    const beta = writeFile(dir, "Beta.md", "# Beta");

    const slugMap = { alpha: [alpha], beta: [beta] };
    const graph = await buildSiteGraph(buildContentMap([alpha, beta]), slugMap);

    const backlinks = resolveBacklinks(graph, "beta", slugMap);
    expect(backlinks).toHaveLength(1);
    expect(backlinks[0]?.title).toBe("Alpha");
    expect(backlinks[0]?.href.endsWith("Alpha.html")).toBe(true);
  });

  it("returns an empty list when a slug has no backlinks", async () => {
    const alpha = writeFile(dir, "Alpha.md", "# Alpha");

    const slugMap = { alpha: [alpha] };
    const graph = await buildSiteGraph(buildContentMap([alpha]), slugMap);

    expect(resolveBacklinks(graph, "alpha", slugMap)).toEqual([]);
  });
});
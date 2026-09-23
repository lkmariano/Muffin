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
      relPath: content.relPath,
      tree: await parseMarkdown(content.body, slugMap, content.relPath),
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
  it("computes forward and back links by relPath and does not record duplicate sources", async () => {
    writeFile(dir, "Alpha.md", "# Alpha\n\nLinks to [[Beta]] and [[Gamma]] and [[Beta]].");
    writeFile(dir, "Beta.md", "# Beta\n\nLinks to [[Alpha]].");
    writeFile(dir, "Gamma.md", "# Gamma");

    const { parsed } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    expect(graph.forwardLinks["Alpha.md"]).toEqual(["Beta.md", "Gamma.md", "Beta.md"]);
    expect(graph.forwardLinks["Beta.md"]).toEqual(["Alpha.md"]);
    expect(graph.forwardLinks["Gamma.md"]).toEqual([]);
    expect(graph.backlinks["Beta.md"]).toEqual(["Alpha.md"]);
    expect(graph.backlinks["Alpha.md"]).toEqual(["Beta.md"]);
    expect(graph.backlinks["Gamma.md"]).toEqual(["Alpha.md"]);
  });

  it("resolves backlinks to titles and .html hrefs", async () => {
    writeFile(dir, "Alpha.md", "Links [[Beta]].");
    writeFile(dir, "Beta.md", "# Beta");

    const { parsed } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    const backlinks = resolveBacklinks(graph, "Beta.md");
    expect(backlinks).toHaveLength(1);
    expect(backlinks[0]?.title).toBe("Alpha");
    expect(backlinks[0]?.href.endsWith("Alpha.html")).toBe(true);
  });

  it("returns an empty list when a relPath has no backlinks", async () => {
    writeFile(dir, "Alpha.md", "# Alpha");

    const { parsed } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    expect(resolveBacklinks(graph, "Alpha.md")).toEqual([]);
  });
});

describe("buildSiteGraph with duplicate filenames", () => {
  it("routes backlinks to the correct duplicate-filename target", async () => {
    writeFile(dir, "notes/note.md", "# Note");
    writeFile(dir, "notes/source.md", "Links [[note]].");
    writeFile(dir, "archive/note.md", "# Note");

    const { parsed } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    // Same-folder-first resolution pins the source to its folder's copy.
    expect(graph.backlinks["notes/note.md"]).toEqual(["notes/source.md"]);
    expect(graph.backlinks["archive/note.md"]).toBeUndefined();
  });

  it("keeps duplicate-basename sources distinct", async () => {
    writeFile(dir, "notes/source.md", "Links [[project]].");
    writeFile(dir, "archive/source.md", "Links [[project]].");
    writeFile(dir, "notes/project.md", "# Project");
    writeFile(dir, "archive/project.md", "# Project");

    const { parsed } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    expect(graph.backlinks["notes/project.md"]).toEqual(["notes/source.md"]);
    expect(graph.backlinks["archive/project.md"]).toEqual(["archive/source.md"]);
  });

  it("keeps multiple backlinks distinct and preserves their order", async () => {
    writeFile(dir, "Alpha.md", "Links [[Gamma]].");
    writeFile(dir, "Beta.md", "Links [[Gamma]].");
    writeFile(dir, "Gamma.md", "# Gamma");

    const { parsed } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    expect(graph.backlinks["Gamma.md"]).toEqual(["Alpha.md", "Beta.md"]);

    const backlinks = resolveBacklinks(graph, "Gamma.md");
    expect(backlinks.map((link) => link.title)).toEqual(["Alpha", "Beta"]);
  });

  it("resolves an ambiguous reference onto exactly one page, the first candidate", async () => {
    writeFile(dir, "a/dup.md", "# Dup");
    writeFile(dir, "b/dup.md", "# Dup");
    writeFile(dir, "Top.md", "Links [[dup]].");

    const { parsed, slugMap } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    // Candidates resolve by scan order for an ambiguous top-level reference.
    const candidates = slugMap["dup"] ?? [];
    expect(candidates).toHaveLength(2);
    const first = candidates[0]!;
    const second = candidates[1]!;
    expect(graph.forwardLinks["Top.md"]).toEqual([first]);
    expect(graph.backlinks[first]).toEqual(["Top.md"]);
    expect(graph.backlinks[second]).toBeUndefined();
  });

  it("leaves unresolved references out of the graph", async () => {
    writeFile(dir, "Home.md", "Links [[Missing]] and plain text.");

    const { parsed } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    expect(graph.forwardLinks["Home.md"]).toEqual([]);
    expect(Object.keys(graph.backlinks)).toHaveLength(0);
  });

  it("points a backlink at the actual source page, not the first basename match", async () => {
    // Two different notes share a basename; each crosses to its own target.
    writeFile(dir, "one/Same.md", "Links [[target]].");
    writeFile(dir, "two/Same.md", "Links [[other]].");
    writeFile(dir, "one/target.md", "# Target");
    writeFile(dir, "two/other.md", "# Other");

    const { parsed } = await parseContents(dir);
    const graph = await buildSiteGraph(parsed);

    expect(graph.backlinks["one/target.md"]).toEqual(["one/Same.md"]);
    expect(graph.backlinks["two/other.md"]).toEqual(["two/Same.md"]);

    const targetBacklinks = resolveBacklinks(graph, "one/target.md");
    expect(targetBacklinks).toHaveLength(1);
    expect(targetBacklinks[0]?.href).toBe("/one/Same.html");
  });
});
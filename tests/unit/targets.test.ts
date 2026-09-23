import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { visit } from "unist-util-visit";
import { loadContent } from "../../src/content/loader.js";
import { parseMarkdown } from "../../src/content/markdown.js";
import {
  buildTargetIndex,
  resolveFragmentAnchor,
  resolveReferenceFragments,
  type PageTargetIndex,
} from "../../src/content/targets.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";
import type { Root } from "mdast";

let dir: string;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
});

async function parseVault(files: Record<string, string>) {
  for (const [relPath, body] of Object.entries(files)) {
    writeFile(dir, relPath, body);
  }
  const { contents, slugMap } = await loadContent(dir);
  const parsed = await Promise.all(
    contents.map(async (content) => ({
      path: content.path,
      relPath: content.relPath,
      tree: await parseMarkdown(content.body, slugMap, content.relPath),
    })),
  );
  return { parsed, slugMap };
}

function collectFragments(tree: Root): Array<string | undefined> {
  const fragments: Array<string | undefined> = [];
  visit(tree, "link", (node: any) => {
    fragments.push(node.data?.finalFragment);
  });
  return fragments;
}

describe("buildTargetIndex", () => {
  it("indexes page headings (first duplicate wins) and blocks", async () => {
    const { parsed } = await parseVault({
      "Target.md": "# Some Heading\n\n# Some Heading\n\nbody ^my-block",
    });
    const index = buildTargetIndex(parsed);

    expect(index["Target.md"]?.headings).toEqual({ "some-heading": "some-heading" });
    expect(index["Target.md"]?.blocks).toEqual({ "my-block": "^my-block" });
  });

  it("keys pages by relPath regardless of folder depth", async () => {
    const { parsed } = await parseVault({
      "Notes/Deep/Target.md": "# Heading\n\nbody ^b",
    });
    const index = buildTargetIndex(parsed);
    expect(index["Notes/Deep/Target.md"]?.headings).toEqual({ heading: "heading" });
    expect(index["Notes/Deep/Target.md"]?.blocks).toEqual({ b: "^b" });
  });
});

describe("buildTargetIndex with duplicate filenames", () => {
  it("keeps duplicate-basename pages distinct in the index", async () => {
    const { parsed } = await parseVault({
      "notes/project.md": "# Notes Heading\n\nbody ^notes-block",
      "archive/project.md": "# Archive Heading\n\nbody ^archive-block",
    });
    const index = buildTargetIndex(parsed);

    expect(index["notes/project.md"]?.headings).toEqual({
      "notes-heading": "notes-heading",
    });
    expect(index["archive/project.md"]?.headings).toEqual({
      "archive-heading": "archive-heading",
    });
    expect(index["notes/project.md"]?.blocks).toEqual({ "notes-block": "^notes-block" });
    expect(index["archive/project.md"]?.blocks).toEqual({ "archive-block": "^archive-block" });
  });

  it("resolves heading references to the correct duplicate page", async () => {
    const { parsed } = await parseVault({
      "notes/project.md": "# Notes Heading\n\nbody",
      "archive/project.md": "# Archive Heading\n\nbody",
      "notes/source.md": "See [[project#Notes Heading]].",
      "archive/source.md": "See [[project#Archive Heading]].",
    });
    const index = buildTargetIndex(parsed);
    resolveReferenceFragments(parsed, index);

    const notesSource = parsed.find((entry) => entry.relPath === "notes/source.md");
    const archiveSource = parsed.find((entry) => entry.relPath === "archive/source.md");
    expect(collectFragments(notesSource!.tree)).toEqual(["#notes-heading"]);
    expect(collectFragments(archiveSource!.tree)).toEqual(["#archive-heading"]);
  });

  it("resolves block references to the correct duplicate page", async () => {
    const { parsed } = await parseVault({
      "notes/project.md": "# P\n\nbody ^notes-block",
      "archive/project.md": "# P\n\nbody ^archive-block",
      "notes/source.md": "See [[project#^notes-block]].",
      "archive/source.md": "See [[project#^archive-block]].",
    });
    const index = buildTargetIndex(parsed);
    resolveReferenceFragments(parsed, index);

    const notesSource = parsed.find((entry) => entry.relPath === "notes/source.md");
    const archiveSource = parsed.find((entry) => entry.relPath === "archive/source.md");
    expect(collectFragments(notesSource!.tree)).toEqual(["#^notes-block"]);
    expect(collectFragments(archiveSource!.tree)).toEqual(["#^archive-block"]);
  });

  it("keeps equal block ids anchored to their own page", async () => {
    const { parsed } = await parseVault({
      "notes/project.md": "# P\n\nbody ^shared",
      "archive/project.md": "# P\n\nbody ^shared",
    });
    const index = buildTargetIndex(parsed);

    expect(index["notes/project.md"]?.blocks).toEqual({ shared: "^shared" });
    expect(index["archive/project.md"]?.blocks).toEqual({ shared: "^shared" });
  });

  it("keeps an ordinary single-file reference working", async () => {
    const { parsed } = await parseVault({
      "Source.md": "See [[Target#Some Heading]] and [[Target#^my-block]].",
      "Target.md": "# Some Heading\n\nbody ^my-block",
    });
    const index = buildTargetIndex(parsed);
    resolveReferenceFragments(parsed, index);

    const source = parsed.find((entry) => entry.relPath === "Source.md");
    expect(collectFragments(source!.tree)).toEqual(["#some-heading", "#^my-block"]);
  });
});

describe("resolveFragmentAnchor", () => {
  it("looks up headings by slugified text and resolves duplicate text to the first anchor", () => {
    const page: PageTargetIndex = { headings: { "some-heading": "some-heading" }, blocks: {} };
    expect(resolveFragmentAnchor(page, { type: "heading", text: "Some Heading" })).toBe(
      "some-heading",
    );
  });

  it("preserves a normalized fragment for a missing page or target", () => {
    expect(resolveFragmentAnchor(undefined, { type: "heading", text: "Missing Heading" })).toBe(
      "missing-heading",
    );
    expect(resolveFragmentAnchor(undefined, { type: "block", text: "nope" })).toBe("^nope");
  });
});

describe("resolveReferenceFragments", () => {
  it("attaches resolved and unresolved fragments to wikilinks", async () => {
    const { parsed } = await parseVault({
      "Source.md":
        "See [[Target#Some Heading]], [[Target#^my-block]], [[Target#Missing Heading]], and [[Target#^nope]].",
      "Target.md": "# Some Heading\n\nbody ^my-block",
    });
    const index = buildTargetIndex(parsed);
    resolveReferenceFragments(parsed, index);

    const source = parsed.find((entry) => entry.path.endsWith("Source.md"));
    const fragments: Array<string | undefined> = [];
    visit(source!.tree, "link", (node: any) => {
      fragments.push(node.data?.finalFragment);
    });

    expect(fragments).toEqual([
      "#some-heading",
      "#^my-block",
      "#missing-heading",
      "#^nope",
    ]);
  });

  it("leaves whole-page wikilinks without a fragment untouched", async () => {
    const { parsed } = await parseVault({
      "Source.md": "See [[Target]].",
      "Target.md": "# Heading",
    });
    const index = buildTargetIndex(parsed);
    resolveReferenceFragments(parsed, index);

    const source = parsed.find((entry) => entry.path.endsWith("Source.md"));
    const fragments: Array<string | undefined> = [];
    visit(source!.tree, "link", (node: any) => {
      fragments.push(node.data?.finalFragment);
    });
    expect(fragments).toEqual([undefined]);
  });

  it("resolves a heading whose natural slug is a duplicate suffix to its own unique anchor", async () => {
    const { parsed } = await parseVault({
      "Source.md": "See [[Target#Heading 1]].",
      "Target.md": "# Heading\n\n# Heading\n\n# Heading 1",
    });
    const index = buildTargetIndex(parsed);
    resolveReferenceFragments(parsed, index);

    const source = parsed.find((entry) => entry.path.endsWith("Source.md"));
    const fragments: Array<string | undefined> = [];
    visit(source!.tree, "link", (node: any) => {
      fragments.push(node.data?.finalFragment);
    });
    expect(fragments).toEqual(["#heading-1-1"]);

    const target = parsed.find((entry) => entry.path.endsWith("Target.md"));
    const ids: Array<string | undefined> = [];
    visit(target!.tree, "heading", (node: any) => {
      ids.push(node.data?.headingId);
    });
    expect(ids).toEqual(["heading", "heading-1", "heading-1-1"]);
  });
});
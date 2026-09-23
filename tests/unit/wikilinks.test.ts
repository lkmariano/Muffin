import { afterEach, describe, expect, it } from "vitest";
import {
  parseWikilinkTarget,
  resolveWikilink,
  wikilinkToUrl,
  wikilinkPlugin,
} from "../../plugins/wikilinks.js";

const ORIGINAL_BASE_PATH = process.env.MUFFIN_BASE_PATH;

afterEach(() => {
  if (ORIGINAL_BASE_PATH === undefined) {
    delete process.env.MUFFIN_BASE_PATH;
  } else {
    process.env.MUFFIN_BASE_PATH = ORIGINAL_BASE_PATH;
  }
});

describe("parseWikilinkTarget", () => {
  it("parses page, heading, and block targets including empty fragments", () => {
    expect(parseWikilinkTarget("note")).toEqual({ page: "note" });
    expect(parseWikilinkTarget("note#Some Heading")).toEqual({
      page: "note",
      fragment: { type: "heading", text: "Some Heading" },
    });
    expect(parseWikilinkTarget("note#^my-block")).toEqual({
      page: "note",
      fragment: { type: "block", text: "my-block" },
    });
    expect(parseWikilinkTarget("note#")).toEqual({ page: "note" });
  });

  it("keeps the folder path in the page part", () => {
    expect(parseWikilinkTarget("Folder/Note#Heading")).toEqual({
      page: "Folder/Note",
      fragment: { type: "heading", text: "Heading" },
    });
  });
});

describe("resolveWikilink", () => {
  it("resolves the single candidate for a slug", () => {
    const slugMap = { note: ["content/a.md"] };
    expect(resolveWikilink("content/b.md", "note", slugMap)).toBe("content/a.md");
  });

  it("walks up the folder tree to prefer a duplicate in the source branch", () => {
    const slugMap = { note: ["content/other/note.md", "content/projects/note.md"] };
    expect(resolveWikilink("content/projects/page.md", "note", slugMap)).toBe(
      "content/projects/note.md",
    );
    expect(resolveWikilink("content/projects/deep/page.md", "note", slugMap)).toBe(
      "content/projects/note.md",
    );
  });

  it("falls back to the first candidate when no parent folder matches", () => {
    const slugMap = { note: ["content/a/note.md", "content/b/note.md"] };
    expect(resolveWikilink("content/c/page.md", "note", slugMap)).toBe("content/a/note.md");
  });
});

describe("wikilinkPlugin", () => {
  it("resolves a wikilink to a link node with a display label", () => {
    const tree = textTree("See [[Folder/Note|custom label]].");
    const slugMap = { note: ["content/folder/Note.md"] };

    wikilinkPlugin(slugMap, "content/page.md")(tree);

    const link = expectLink(tree, "custom label");
    expect(link.url).toBe("content/folder/Note.md");
  });

  it("keeps heading and block fragment targets on the link node", () => {
    const tree = textTree("See [[Note#Some Heading]] and [[Note#^my-block]].");
    const slugMap = { note: ["content/Note.md"] };

    wikilinkPlugin(slugMap, "content/page.md")(tree);

    const links = tree.children[0].children.filter((child: any) => child.type === "link");
    expect(links).toHaveLength(2);
    expect(links[0].data.fragmentTarget).toEqual({ type: "heading", text: "Some Heading" });
    expect(links[1].data.fragmentTarget).toEqual({ type: "block", text: "my-block" });
  });

  it("prefers the display label for fragment references", () => {
    const tree = textTree("See [[Note#Some Heading|the heading]].");

    wikilinkPlugin({ note: ["content/Note.md"] }, "content/page.md")(tree);

    const link = expectLink(tree, "the heading");
    expect(link.data.fragmentTarget).toEqual({ type: "heading", text: "Some Heading" });
  });
});

describe("wikilinkToUrl", () => {
  it("converts a relPath to a site-relative output URL", () => {
    expect(wikilinkToUrl("a.md")).toBe("/a.html");
    expect(wikilinkToUrl("projects/deep note.md")).toBe("/projects/deep note.html");
  });

  it("applies the MUFFIN_BASE_PATH base path when set", () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    expect(wikilinkToUrl("a.md")).toBe("/Muffin/a.html");
  });
});

function textTree(value: string): any {
  return {
    type: "root",
    children: [{ type: "paragraph", children: [{ type: "text", value }] }],
  };
}

function expectLink(tree: any, display: string): any {
  const link = tree.children[0].children.find((child: any) => child.type === "link");
  expect(link).toBeDefined();
  expect(link.children).toEqual([{ type: "text", value: display }]);
  expect(link.data.isWikilink).toBe(true);
  return link;
}
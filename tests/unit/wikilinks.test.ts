import { describe, expect, it } from "vitest";
import { resolveWikilink, wikilinkToUrl, wikilinkToUrlPlugin, wikilinkPlugin } from "../../plugins/wikilinks.js";

describe("resolveWikilink", () => {
  it("resolves the single candidate for a slug", () => {
    const slugMap = { note: ["content/a.md"] };
    expect(resolveWikilink("content/b.md", "note", slugMap)).toBe("content/a.md");
  });

  it("returns undefined when no candidate exists", () => {
    expect(resolveWikilink("content/a.md", "missing", {})).toBeUndefined();
  });

  it("prefers the candidate in the same folder over other duplicates", () => {
    const slugMap = { note: ["content/other/note.md", "content/projects/note.md"] };
    expect(resolveWikilink("content/projects/page.md", "note", slugMap)).toBe(
      "content/projects/note.md",
    );
  });

  it("walks up the folder tree to find a duplicate", () => {
    const slugMap = { note: ["content/other/note.md", "content/projects/note.md"] };
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
  it("resolves a simple wikilink to a link node", () => {
    const tree = textTree("See [[Note]].");
    const slugMap = { note: ["content/Note.md"] };

    wikilinkPlugin(slugMap, "content/page.md")(tree);

    const link = expectLink(tree, "Note");
    expect(link.url).toBe("content/Note.md");
  });

  it("resolves a folder-qualified wikilink to its target", () => {
    const tree = textTree("See [[Folder/Note]].");
    const slugMap = { note: ["content/folder/Note.md"] };

    wikilinkPlugin(slugMap, "content/page.md")(tree);

    const link = expectLink(tree, "Note");
    expect(link.url).toBe("content/folder/Note.md");
  });

  it("resolves a folder-qualified wikilink with a display label", () => {
    const tree = textTree("See [[Folder/Note|custom label]].");
    const slugMap = { note: ["content/folder/Note.md"] };

    wikilinkPlugin(slugMap, "content/page.md")(tree);

    const link = expectLink(tree, "custom label");
    expect(link.url).toBe("content/folder/Note.md");
  });

  it("uses duplicate-filename folder precedence for folder-qualified wikilinks", () => {
    const tree = textTree("See [[Folder/Note]].");
    const slugMap = { note: ["content/other/Note.md", "content/folder/Note.md"] };

    wikilinkPlugin(slugMap, "content/folder/page.md")(tree);

    const link = expectLink(tree, "Note");
    expect(link.url).toBe("content/folder/Note.md");
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

describe("wikilinkToUrl", () => {
  it("converts a relPath to a site-relative output URL", () => {
    expect(wikilinkToUrl("a.md", "")).toBe("/a.html");
  });

  it("preserves the folder structure for nested files", () => {
    expect(wikilinkToUrl("projects/deep note.md", "")).toBe("/projects/deep note.html");
  });

  it("applies an explicit base path", () => {
    expect(wikilinkToUrl("a.md", "/Muffin")).toBe("/Muffin/a.html");
  });
});

describe("wikilinkToUrlPlugin", () => {
  it("converts only wikilink link urls from relPaths to output URLs", () => {
    const tree: any = {
      type: "root",
      children: [
        { type: "link", url: "a.md", data: { isWikilink: true }, children: [] },
        { type: "link", url: "https://example.com", children: [] },
      ],
    };

    wikilinkToUrlPlugin("")(tree);

    expect(tree.children[0].url).toBe("/a.html");
    expect(tree.children[1].url).toBe("https://example.com");
  });
});
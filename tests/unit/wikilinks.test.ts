import { describe, expect, it } from "vitest";
import { resolveWikilink } from "../../plugins/wikilinks.js";

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
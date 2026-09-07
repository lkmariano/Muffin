import { describe, expect, it } from "vitest";
import { getSlug, getTitle } from "../../util.js";

describe("getSlug", () => {
  it("lowercases the filename", () => {
    expect(getSlug("/some/dir/MyNote.md")).toBe("mynote");
  });

  it("converts spaces and underscores to hyphens", () => {
    expect(getSlug("Hello World.md")).toBe("hello-world");
    expect(getSlug("my_note.md")).toBe("my-note");
  });

  it("retains existing hyphens", () => {
    expect(getSlug("already-slugged.md")).toBe("already-slugged");
  });

  it("strips the .md extension regardless of directory", () => {
    expect(getSlug("notes/Projects/Muffin/Todo.md")).toBe("todo");
  });
});

describe("getTitle", () => {
  it("returns the basename without the .md extension", () => {
    expect(getTitle("notes/Projects/My Note.md")).toBe("My Note");
  });
});
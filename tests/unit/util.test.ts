import { describe, expect, it } from "vitest";
import { formatDate, getSlug, getTitle, toHtmlPath } from "../../util.js";

describe("getSlug", () => {
  it("lowercases, converts spaces and underscores to hyphens, and strips the extension", () => {
    expect(getSlug("/some/dir/MyNote.md")).toBe("mynote");
    expect(getSlug("Hello World.md")).toBe("hello-world");
    expect(getSlug("my_note.md")).toBe("my-note");
    expect(getSlug("already-slugged.md")).toBe("already-slugged");
    expect(getSlug("notes/Projects/Muffin/Todo.md")).toBe("todo");
  });
});

describe("getTitle", () => {
  it("returns the basename without the .md extension", () => {
    expect(getTitle("notes/Projects/My Note.md")).toBe("My Note");
  });
});

describe("toHtmlPath", () => {
  it("swaps .md for .html and normalizes backslashes", () => {
    expect(toHtmlPath("notes/Deep Note.md")).toBe("notes/Deep Note.html");
    expect(toHtmlPath("notes\\Deep Note.md")).toBe("notes/Deep Note.html");
  });
});

describe("formatDate", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(formatDate(new Date("2026-01-02T10:30:00Z"))).toBe("2026-01-02");
  });
});
import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatRfc822,
  getSlug,
  getTitle,
  toHtmlPath,
} from "../../util.js";

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

describe("formatRfc822", () => {
  it("formats an ISO date as an RFC-822 pubDate in UTC with zero padding", () => {
    expect(formatRfc822("2026-09-21")).toBe("Mon, 21 Sep 2026 00:00:00 +0000");
    expect(formatRfc822("2026-01-05")).toBe("Mon, 05 Jan 2026 00:00:00 +0000");
    expect(formatRfc822("2026-10-31")).toBe("Sat, 31 Oct 2026 00:00:00 +0000");
  });

  it("returns unparseable input unchanged", () => {
    expect(formatRfc822("2026-13-01")).toBe("2026-13-01");
    expect(formatRfc822("2026-02-30")).toBe("2026-02-30");
    expect(formatRfc822("garbage")).toBe("garbage");
  });
});
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderMarkdownFile } from "../../src/content/markdown.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
});

describe("renderMarkdownFile", () => {
  it("renders markdown to HTML", async () => {
    const file = writeFile(dir, "note.md", "# Heading\n\nSome **bold** text.");

    const { html } = await renderMarkdownFile(file, {});

    expect(html).toContain("<h1>Heading</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("extracts frontmatter without rendering it into HTML", async () => {
    const file = writeFile(dir, "note.md", "---\ntitle: My Note\nstatus: published\n---\n\nBody text.");

    const { html, frontmatter } = await renderMarkdownFile(file, {});

    expect(frontmatter).toEqual({ title: "My Note", status: "published" });
    expect(html).toContain("Body text.");
    expect(html).not.toContain("---");
  });

  it("resolves wikilinks to anchors using the display text", async () => {
    const target = writeFile(dir, "Target Note.md", "# Target");
    const source = writeFile(dir, "source.md", "See [[Target Note|custom label]]");

    const slugMap = { "target-note": [target] };
    const { html } = await renderMarkdownFile(source, slugMap);

    expect(html).toContain("<p>See ");
    expect(html).toContain(">custom label</a>");
    expect(html).toContain("Target%20Note.html");
  });

  it("renders unresolved wikilinks as plain text", async () => {
    const source = writeFile(dir, "source.md", "See [[Missing Note]]");

    const { html } = await renderMarkdownFile(source, {});

    expect(html).toContain("See Missing Note");
    expect(html).not.toContain("<a");
  });
});
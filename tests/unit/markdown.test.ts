import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { renderMarkdown } from "../../src/content/markdown.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
});

describe("renderMarkdown", () => {
  it("renders markdown to HTML", async () => {
    const file = writeFile(dir, "note.md", "# Heading\n\nSome **bold** text.");
    const content = fs.readFileSync(file, "utf-8");

    const { html } = await renderMarkdown(content, {}, file);

    expect(html).toContain("<h1>Heading</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("extracts frontmatter without rendering it into HTML", async () => {
    const file = writeFile(dir, "note.md", "---\ntitle: My Note\nstatus: published\n---\n\nBody text.");
    const content = fs.readFileSync(file, "utf-8");

    const { html, frontmatter } = await renderMarkdown(content, {}, file);

    expect(frontmatter).toEqual({ title: "My Note", status: "published" });
    expect(html).toContain("Body text.");
    expect(html).not.toContain("---");
  });

  it("resolves wikilinks to anchors using the display text", async () => {
    const target = writeFile(dir, "Target Note.md", "# Target");
    const source = writeFile(dir, "source.md", "See [[Target Note|custom label]]");
    const content = fs.readFileSync(source, "utf-8");

    const slugMap = { "target-note": [target] };
    const { html } = await renderMarkdown(content, slugMap, source);

    expect(html).toContain("<p>See ");
    expect(html).toContain(">custom label</a>");
    expect(html).toContain("Target%20Note.html");
  });

  it("renders unresolved wikilinks as plain text", async () => {
    const source = writeFile(dir, "source.md", "See [[Missing Note]]");
    const content = fs.readFileSync(source, "utf-8");

    const { html } = await renderMarkdown(content, {}, source);

    expect(html).toContain("See Missing Note");
    expect(html).not.toContain("<a");
  });
});
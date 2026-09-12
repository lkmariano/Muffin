import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseMarkdown, renderMarkdown, renderMarkdownTree } from "../../src/content/markdown.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
});

describe("parseMarkdown + renderMarkdownTree", () => {
  it("parses once and renders the shared tree to the same HTML as renderMarkdown", async () => {
    const target = writeFile(dir, "Target Note.md", "# Target");
    const source = writeFile(dir, "source.md", "See [[Target Note|custom label]]");
    const body = fs.readFileSync(source, "utf-8");

    const slugMap = { "target-note": [path.relative(dir, target)] };

    const tree = await parseMarkdown(body, slugMap, path.relative(dir, source));
    const html = await renderMarkdownTree(tree);

    expect(html).toEqual(await renderMarkdown(body, slugMap, path.relative(dir, source)));
    expect(html).toContain("<p>See ");
    expect(html).toContain(">custom label</a>");
    expect(html).toContain("Target%20Note.html");
  });
});

describe("renderMarkdown", () => {
  it("renders markdown to HTML", async () => {
    const file = writeFile(dir, "note.md", "# Heading\n\nSome **bold** text.");
    const body = fs.readFileSync(file, "utf-8");

    const html = await renderMarkdown(body, {}, path.relative(dir, file));

    expect(html).toContain("<h1>Heading</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("resolves wikilinks to anchors using the display text", async () => {
    const target = writeFile(dir, "Target Note.md", "# Target");
    const source = writeFile(dir, "source.md", "See [[Target Note|custom label]]");
    const body = fs.readFileSync(source, "utf-8");

    const slugMap = { "target-note": [path.relative(dir, target)] };
    const html = await renderMarkdown(body, slugMap, path.relative(dir, source));

    expect(html).toContain("<p>See ");
    expect(html).toContain(">custom label</a>");
    expect(html).toContain("Target%20Note.html");
  });

  it("renders unresolved wikilinks as plain text", async () => {
    const source = writeFile(dir, "source.md", "See [[Missing Note]]");
    const body = fs.readFileSync(source, "utf-8");

    const html = await renderMarkdown(body, {}, path.relative(dir, source));

    expect(html).toContain("See Missing Note");
    expect(html).not.toContain("<a");
  });
});
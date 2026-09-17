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

  it("renders a resolved image embed with a root-relative asset URL", async () => {
    const source = writeFile(dir, "notes/example.md", "See ![[test.png|300]].");
    const body = fs.readFileSync(source, "utf-8");

    const html = await renderMarkdown(body, {}, "notes/example.md", "", ["images/test.png"]);

    expect(html).toContain('<img src="/images/test.png" alt="test" width="300">');
  });

  it("renders a nested page image embed with a root-relative URL", async () => {
    const source = writeFile(dir, "notes/example.md", "See ![[test.png]].");
    const body = fs.readFileSync(source, "utf-8");

    const html = await renderMarkdown(body, {}, "notes/example.md", "", ["images/test.png"]);

    expect(html).toContain('<img src="/images/test.png" alt="test">');
  });

  it("renders missing image embeds as literal text", async () => {
    const source = writeFile(dir, "source.md", "See ![[missing.png]]");
    const body = fs.readFileSync(source, "utf-8");

    const html = await renderMarkdown(body, {}, "source.md", "", ["images/test.png"]);

    expect(html).toContain("![[missing.png]]");
    expect(html).not.toContain("<img");
  });

  it("keeps embeds of discovered non-image assets as literal text", async () => {
    const source = writeFile(dir, "source.md", "See ![[clip.mp4]]");
    const body = fs.readFileSync(source, "utf-8");

    const html = await renderMarkdown(body, {}, "source.md", "", ["clip.mp4"]);

    expect(html).toContain("![[clip.mp4]]");
    expect(html).not.toContain("<img");
  });

  it("renders multiple image embeds", async () => {
    const source = writeFile(dir, "source.md", "![[a.png]] and ![[b.gif|120]]");
    const body = fs.readFileSync(source, "utf-8");

    const html = await renderMarkdown(body, {}, "source.md", "", ["a.png", "b.gif"]);

    expect(html).toContain('<img src="/a.png" alt="a">');
    expect(html).toContain('<img src="/b.gif" alt="b" width="120">');
  });

  it("applies the base path to image embed URLs", async () => {
    const source = writeFile(dir, "source.md", "![[test.png]]");
    const body = fs.readFileSync(source, "utf-8");

    const html = await renderMarkdown(body, {}, "source.md", "/Muffin", ["test.png"]);

    expect(html).toContain('<img src="/Muffin/test.png" alt="test">');
  });

  it("leaves standard markdown images unchanged", async () => {
    const source = writeFile(dir, "source.md", "![alt](plain.png)");
    const body = fs.readFileSync(source, "utf-8");

    const html = await renderMarkdown(body, {}, "source.md", "", ["plain.png"]);

    expect(html).toContain('<img src="plain.png" alt="alt">');
  });

  it("keeps wikilinks working alongside image embeds", async () => {
    const target = writeFile(dir, "Target Note.md", "# Target");
    const source = writeFile(dir, "source.md", "See [[Target Note]] and ![[test.png]]");
    const body = fs.readFileSync(source, "utf-8");

    const slugMap = { "target-note": [path.relative(dir, target)] };
    const html = await renderMarkdown(body, slugMap, path.relative(dir, source), "", ["images/test.png"]);

    expect(html).toContain("Target%20Note.html");
    expect(html).toContain('<img src="/images/test.png" alt="test">');
  });
});
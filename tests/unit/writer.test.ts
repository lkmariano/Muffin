import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { writePages, type OutputPage } from "../../src/output/writer.js";
import { cleanupTempDir, makeTempDir } from "../helpers.js";

let dir: string;
let contentRoot: string;
let outputRoot: string;

beforeEach(() => {
  dir = makeTempDir();
  contentRoot = path.join(dir, "content");
  outputRoot = path.join(dir, "muffin");
});

afterEach(() => {
  cleanupTempDir(dir);
});

function makePages(): OutputPage[] {
  return [
    { path: path.join(contentRoot, "projects.md"), renderedHtml: "<h1>Projects</h1>" },
    { path: path.join(contentRoot, "notes.md"), renderedHtml: "<h1>Notes</h1>" },
  ];
}

describe("writePages homepage", () => {
  it("writes an index.html alias for the configured homepage page", () => {
    writePages(makePages(), { homepage: "projects", contentRoot, outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "projects.html"), "utf-8")).toBe("<h1>Projects</h1>");
    expect(fs.readFileSync(path.join(outputRoot, "index.html"), "utf-8")).toBe("<h1>Projects</h1>");
  });

  it("does not write index.html when no homepage is configured", () => {
    writePages(makePages(), { contentRoot, outputRoot });

    expect(fs.existsSync(path.join(outputRoot, "index.html"))).toBe(false);
  });

  it("does not write index.html when the homepage page has no match", () => {
    writePages(makePages(), { homepage: "missing", contentRoot, outputRoot });

    expect(fs.existsSync(path.join(outputRoot, "index.html"))).toBe(false);
    expect(fs.existsSync(path.join(outputRoot, "projects.html"))).toBe(true);
  });
});

describe("writePages default homepage", () => {
  it("uses home.md as index.html when no homepage is configured", () => {
    const pages = [
      ...makePages(),
      { path: path.join(contentRoot, "home.md"), renderedHtml: "<h1>Home</h1>" },
    ];
    writePages(pages, { contentRoot, outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "index.html"), "utf-8")).toBe("<h1>Home</h1>");
    expect(fs.existsSync(path.join(outputRoot, "home.html"))).toBe(true);
  });

  it("uses home.md over index.md", () => {
    const pages = [
      ...makePages(),
      { path: path.join(contentRoot, "home.md"), renderedHtml: "<h1>Home</h1>" },
      { path: path.join(contentRoot, "index.md"), renderedHtml: "<h1>Index</h1>" },
    ];
    writePages(pages, { contentRoot, outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "index.html"), "utf-8")).toBe("<h1>Home</h1>");
  });

  it("uses index.md when home.md is absent", () => {
    const pages = [
      ...makePages(),
      { path: path.join(contentRoot, "index.md"), renderedHtml: "<h1>Index</h1>" },
    ];
    writePages(pages, { contentRoot, outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "index.html"), "utf-8")).toBe("<h1>Index</h1>");
  });

  it("matches fallback basenames case-insensitively", () => {
    const pages = [
      ...makePages(),
      { path: path.join(contentRoot, "HOME.md"), renderedHtml: "<h1>Home</h1>" },
    ];
    writePages(pages, { contentRoot, outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "index.html"), "utf-8")).toBe("<h1>Home</h1>");
  });

  it("gives explicit homepage precedence over fallbacks", () => {
    const pages = [
      ...makePages(),
      { path: path.join(contentRoot, "home.md"), renderedHtml: "<h1>Home</h1>" },
    ];
    writePages(pages, { homepage: "projects", contentRoot, outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "index.html"), "utf-8")).toBe("<h1>Projects</h1>");
  });

  it("does not write index.html when no fallback home or index page exists", () => {
    writePages(makePages(), { contentRoot, outputRoot });

    expect(fs.existsSync(path.join(outputRoot, "index.html"))).toBe(false);
  });
});

describe("writePages pruning", () => {
  it("removes stale pages no longer present in the content set", () => {
    writePages(makePages(), { contentRoot, outputRoot });
    expect(fs.existsSync(path.join(outputRoot, "notes.html"))).toBe(true);
    expect(fs.existsSync(path.join(outputRoot, "projects.html"))).toBe(true);

    writePages([makePages()[0]!], { contentRoot, outputRoot });

    expect(fs.existsSync(path.join(outputRoot, "notes.html"))).toBe(false);
    expect(fs.existsSync(path.join(outputRoot, "projects.html"))).toBe(true);
  });

  it("removes stale nested pages and the empty directories they leave behind", () => {
    const nested = {
      path: path.join(contentRoot, "Projects", "Tiketa", "Tiketa.md"),
      renderedHtml: "<h1>Tiketa</h1>",
    };
    writePages([nested], { contentRoot, outputRoot });

    const nestedOutput = path.join(outputRoot, "Projects", "Tiketa", "Tiketa.html");
    expect(fs.existsSync(nestedOutput)).toBe(true);

    writePages([], { contentRoot, outputRoot });

    expect(fs.existsSync(nestedOutput)).toBe(false);
    expect(fs.existsSync(path.join(outputRoot, "Projects", "Tiketa"))).toBe(false);
  });

  it("removes an orphaned index.html when the homepage no longer matches", () => {
    writePages(makePages(), { homepage: "projects", contentRoot, outputRoot });
    expect(fs.existsSync(path.join(outputRoot, "index.html"))).toBe(true);

    writePages(makePages(), { contentRoot, outputRoot });

    expect(fs.existsSync(path.join(outputRoot, "index.html"))).toBe(false);
    expect(fs.existsSync(path.join(outputRoot, "projects.html"))).toBe(true);
  });

  it("leaves non-html files in the output root untouched", () => {
    writePages(makePages(), { contentRoot, outputRoot });
    const cssPath = path.join(outputRoot, "styles.css");
    fs.writeFileSync(cssPath, ":root {}", "utf-8");

    writePages(makePages().slice(0, 1), { contentRoot, outputRoot });

    expect(fs.existsSync(cssPath)).toBe(true);
  });
});
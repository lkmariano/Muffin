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

  it("uses home.md as the fallback homepage, matching case-insensitively", () => {
    const pages = [
      ...makePages(),
      { path: path.join(contentRoot, "HOME.md"), renderedHtml: "<h1>Home</h1>" },
      { path: path.join(contentRoot, "index.md"), renderedHtml: "<h1>Index</h1>" },
    ];
    writePages(pages, { contentRoot, outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "index.html"), "utf-8")).toBe("<h1>Home</h1>");
    expect(fs.existsSync(path.join(outputRoot, "home.html"))).toBe(true);
  });

  it("writes no index.html when no homepage matches or is configured", () => {
    writePages(makePages(), { contentRoot, outputRoot });
    expect(fs.existsSync(path.join(outputRoot, "index.html"))).toBe(false);

    writePages(makePages(), { homepage: "missing", contentRoot, outputRoot });
    expect(fs.existsSync(path.join(outputRoot, "index.html"))).toBe(false);
    expect(fs.existsSync(path.join(outputRoot, "projects.html"))).toBe(true);
  });
});

describe("writePages pruning", () => {
  it("removes stale pages and the empty nested directories they leave behind", () => {
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

  it("removes an orphaned index.html and leaves non-html files untouched", () => {
    writePages(makePages(), { homepage: "projects", contentRoot, outputRoot });
    expect(fs.existsSync(path.join(outputRoot, "index.html"))).toBe(true);

    const cssPath = path.join(outputRoot, "styles.css");
    fs.writeFileSync(cssPath, ":root {}", "utf-8");

    writePages(makePages().slice(0, 1), { contentRoot, outputRoot });

    expect(fs.existsSync(path.join(outputRoot, "index.html"))).toBe(false);
    expect(fs.existsSync(path.join(outputRoot, "projects.html"))).toBe(true);
    expect(fs.existsSync(cssPath)).toBe(true);
  });
});
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
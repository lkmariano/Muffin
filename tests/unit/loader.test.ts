import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadContent } from "../../src/content/loader.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
});

describe("loadContent", () => {
  it("discovers all markdown files and derives root-relative relPaths", async () => {
    writeFile(dir, "Root.md", "# Root");
    writeFile(dir, "Sub/Nested.md", "# Nested");

    const { contents } = await loadContent(dir);
    expect(contents).toHaveLength(2);
    expect(contents.find((c) => c.relPath === "Root.md")).toBeDefined();
    expect(contents.find((c) => c.relPath === "Sub/Nested.md")).toBeDefined();
  });

  it("parses frontmatter, passes tags through, and sets body and mtime", async () => {
    const file = writeFile(
      dir,
      "Page.md",
      "---\ntitle: My Page\nstatus: draft\ntags:\n  - programming\n  - typescript\n---\n\nBody here.",
    );

    const { contents } = await loadContent(dir);
    const page = contents[0];
    expect(page?.frontmatter).toEqual({
      title: "My Page",
      status: "draft",
      tags: ["programming", "typescript"],
    });
    expect(page?.body).toBe("\nBody here.");
    expect(page?.mtime).toBeInstanceOf(Date);
    expect(page?.path).toBe(file);
  });

  it("returns empty frontmatter and the full body when no frontmatter is present", async () => {
    writeFile(dir, "Note.md", "# Note\n\nSome text.");

    const { contents } = await loadContent(dir);
    const note = contents[0];
    expect(note?.frontmatter).toEqual({});
    expect(note?.body).toContain("# Note");
  });

  it("builds the slugMap mapping slugs to their relPaths", async () => {
    writeFile(dir, "Alpha.md", "# Alpha");
    writeFile(dir, "Sub/Beta.md", "# Beta");

    const { slugMap } = await loadContent(dir);
    expect(Object.keys(slugMap)).toHaveLength(2);
    expect(slugMap["alpha"]).toBeDefined();
    expect(slugMap["alpha"]?.[0]).toContain("Alpha.md");
    expect(slugMap["beta"]).toBeDefined();
    expect(slugMap["beta"]?.[0]).toContain("Beta.md");
  });
});

describe("loadContent assets", () => {
  it("discovers image and PDF assets, deriving relPaths and creating output folders", async () => {
    writeFile(dir, "note.md", "# Note");
    writeFile(dir, "images/test.png", "png");
    writeFile(dir, "notes/pic.jpg", "jpg");
    writeFile(dir, "notes/logo.svg", "svg");
    writeFile(dir, "anim.gif", "gif");
    writeFile(dir, "manual.pdf", "%PDF");
    writeFile(dir, "docs/report.pdf", "%PDF");

    const { assets } = await loadContent(dir);

    expect(assets.map((asset) => asset.relPath).sort()).toEqual([
      "anim.gif",
      "docs/report.pdf",
      "images/test.png",
      "manual.pdf",
      "notes/logo.svg",
      "notes/pic.jpg",
    ]);
  });

  it("matches asset extensions case-insensitively", async () => {
    writeFile(dir, "IMG.PNG", "png");
    writeFile(dir, "logo.WebP", "webp");
    writeFile(dir, "Photo.JPEG", "jpeg");
    writeFile(dir, "Guide.PDF", "%PDF");

    const { assets } = await loadContent(dir);

    expect(assets.map((asset) => asset.relPath).sort()).toEqual([
      "Guide.PDF",
      "IMG.PNG",
      "Photo.JPEG",
      "logo.WebP",
    ]);
  });

  it("ignores files that are not recognized assets", async () => {
    writeFile(dir, "data.txt", "x");
    writeFile(dir, ".DS_Store", "x");
    writeFile(dir, "clip.mp4", "x");

    const { assets } = await loadContent(dir);

    expect(assets).toEqual([]);
  });
});

describe("loadContent exclude", () => {
  it("filters markdown and assets matching a folder glob", async () => {
    writeFile(dir, "Keep.md", "# Keep");
    writeFile(dir, "drafts/Notes/Draft.md", "# Draft");
    writeFile(dir, "drafts/pic.png", "png");
    writeFile(dir, "images/ok.png", "png");

    const { contents, assets } = await loadContent(dir, ["drafts/**"]);

    expect(contents.map((content) => content.relPath)).toEqual(["Keep.md"]);
    expect(assets.map((asset) => asset.relPath)).toEqual(["images/ok.png"]);
  });

  it("filters a single file by name pattern", async () => {
    writeFile(dir, "Home.md", "# Home");
    writeFile(dir, "draft_note.md", "# Draft");

    const { contents } = await loadContent(dir, ["draft_*"]);

    expect(contents.map((content) => content.relPath)).toEqual(["Home.md"]);
  });
});
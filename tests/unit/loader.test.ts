import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadContent } from "../../src/content/loader.js";
import { getSlug } from "../../util.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
});

describe("loadContent", () => {
  it("discovers all Markdown files including nested directories", async () => {
    writeFile(dir, "Root.md", "# Root");
    writeFile(dir, "Sub/Nested.md", "# Nested");

    const { contents } = await loadContent(dir);
    expect(contents).toHaveLength(2);
  });

  it("derives a root-relative relPath for each file", async () => {
    writeFile(dir, "Root.md", "# Root");
    writeFile(dir, "Sub/Nested.md", "# Nested");

    const { contents } = await loadContent(dir);
    const root = contents.find((c) => c.relPath === "Root.md");
    const nested = contents.find((c) => c.relPath === "Sub/Nested.md");
    expect(root).toBeDefined();
    expect(nested).toBeDefined();
  });

  it("parses frontmatter into the frontmatter field", async () => {
    writeFile(dir, "Page.md", "---\ntitle: My Page\nstatus: draft\n---\n\nBody here.");

    const { contents } = await loadContent(dir);
    const page = contents[0];
    expect(page).toBeDefined();
    expect(page?.frontmatter).toEqual({ title: "My Page", status: "draft" });
    expect(page?.body).toBe("\nBody here.");
  });

  it("returns empty frontmatter and full body when no frontmatter is present", async () => {
    writeFile(dir, "Note.md", "# Note\n\nSome text.");

    const { contents } = await loadContent(dir);
    const note = contents[0];
    expect(note).toBeDefined();
    expect(note?.frontmatter).toEqual({});
    expect(note?.body).toContain("# Note");
  });

  it("sets mtime to the file's modification time", async () => {
    const file = writeFile(dir, "Dated.md", "# Dated");

    const { contents } = await loadContent(dir);
    const page = contents[0];
    expect(page).toBeDefined();
    expect(page?.mtime).toBeInstanceOf(Date);
    expect(page?.path).toBe(file);
  });

  it("builds the slugMap mapping slugs to file paths", async () => {
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
  it("discovers asset files alongside Markdown", async () => {
    writeFile(dir, "note.md", "# Note");
    writeFile(dir, "images/test.png", "png");
    writeFile(dir, "notes/pic.jpg", "jpg");
    writeFile(dir, "notes/logo.svg", "svg");
    writeFile(dir, "notes/web.webp", "webp");
    writeFile(dir, "anim.gif", "gif");

    const { assets } = await loadContent(dir);

    expect(assets.map((asset) => asset.relPath).sort()).toEqual([
      "anim.gif",
      "images/test.png",
      "notes/logo.svg",
      "notes/pic.jpg",
      "notes/web.webp",
    ]);
  });

  it("matches asset extensions case-insensitively", async () => {
    writeFile(dir, "IMG.PNG", "png");
    writeFile(dir, "logo.WebP", "webp");
    writeFile(dir, "Photo.JPEG", "jpeg");

    const { assets } = await loadContent(dir);

    expect(assets.map((asset) => asset.relPath).sort()).toEqual([
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

  it("discovers PDF assets at the root and in nested folders", async () => {
    writeFile(dir, "manual.pdf", "%PDF");
    writeFile(dir, "docs/report.pdf", "%PDF");

    const { assets } = await loadContent(dir);

    expect(assets.map((asset) => asset.relPath).sort()).toEqual([
      "docs/report.pdf",
      "manual.pdf",
    ]);
  });

  it("matches PDF extensions case-insensitively", async () => {
    writeFile(dir, "Guide.PDF", "%PDF");
    writeFile(dir, "brochure.Pdf", "%PDF");

    const { assets } = await loadContent(dir);

    expect(assets.map((asset) => asset.relPath).sort()).toEqual([
      "Guide.PDF",
      "brochure.Pdf",
    ]);
  });

  it("returns an empty asset list when the vault has no assets", async () => {
    writeFile(dir, "note.md", "# Note");

    const { assets } = await loadContent(dir);

    expect(assets).toEqual([]);
  });

  it("derives a root-relative relPath for each asset", async () => {
    writeFile(dir, "images/nested/test.png", "png");

    const { assets } = await loadContent(dir);

    expect(assets).toHaveLength(1);
    expect(assets[0]?.relPath).toBe("images/nested/test.png");
  });

  it("keeps contents and slugMap intact when assets are present", async () => {
    writeFile(dir, "Note.md", "# Note");
    writeFile(dir, "images/test.png", "png");

    const { contents, slugMap } = await loadContent(dir);

    expect(contents).toHaveLength(1);
    expect(slugMap["note"]).toBeDefined();
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

  it("applies no filtering when no patterns are given", async () => {
    writeFile(dir, "A.md", "# A");
    writeFile(dir, "B.md", "# B");

    const { contents } = await loadContent(dir);
    expect(contents).toHaveLength(2);
  });

  it("leaves assets in non-excluded folders untouched", async () => {
    writeFile(dir, "Note.md", "# Note");
    writeFile(dir, "images/logo.png", "png");
    writeFile(dir, "drafts/logo.png", "png");
    writeFile(dir, "drafts/Draft.md", "# Draft");

    const { contents, assets } = await loadContent(dir, ["drafts/**"]);

    expect(contents.map((content) => content.relPath)).toEqual(["Note.md"]);
    expect(assets.map((asset) => asset.relPath)).toEqual(["images/logo.png"]);
  });
});

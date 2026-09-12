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

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadContent } from "../../src/content/loader.js";
import { buildExplorerTree } from "../../src/graph/navigation.js";
import { renderExplorer } from "../../src/rendering/explorer.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
});

describe("buildExplorerTree", () => {
  it("lists folders before files and sorts within each group", async () => {
    writeFile(dir, "B File.md", "# b");
    writeFile(dir, "A Folder/note.md", "# note");
    writeFile(dir, "A Folder/README.md", "# readme");

    const { contents } = await loadContent(dir);
    const tree = buildExplorerTree(contents);
    expect(tree).toHaveLength(2);
    expect(tree[0]?.type).toBe("folder");
    expect(tree[0]?.name).toBe("A Folder");
    expect(tree[0]?.children).toHaveLength(2);
    expect(tree[1]?.type).toBe("file");
    expect(tree[1]?.name).toBe("B File");
  });

  it("ignores dotfiles and non-markdown files", async () => {
    writeFile(dir, ".hidden.md", "# secret");
    writeFile(dir, "notes.txt", "still text");
    writeFile(dir, "Visible.md", "# visible");

    const { contents } = await loadContent(dir);
    const tree = buildExplorerTree(contents);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe("Visible");
  });

  it("excludes files inside dotfolders and hidden files in visible folders", async () => {
    writeFile(dir, ".folder/inner.md", "# inner");
    writeFile(dir, ".folder/sub/deep.md", "# deep");
    writeFile(dir, "visible/.hidden.md", "# hidden");
    writeFile(dir, "visible/note.md", "# note");

    const { contents } = await loadContent(dir);
    const tree = buildExplorerTree(contents);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.type).toBe("folder");
    expect(tree[0]?.name).toBe("visible");
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children?.[0]?.name).toBe("note");
  });

  it("omits empty folders", async () => {
    writeFile(dir, "Kept.md", "# kept");

    const { contents } = await loadContent(dir);
    const tree = buildExplorerTree(contents);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe("Kept");
  });

  it("records slug, relative path, and .html href on file nodes", async () => {
    writeFile(dir, "My Note.md", "# note");
    writeFile(dir, "Nested/Deep Note.md", "# deep");

    const { contents } = await loadContent(dir);
    const tree = buildExplorerTree(contents);
    const node = tree[0];
    expect(node?.type).toBe("folder");
    expect(node?.path).toBe("Nested");
    const child = node?.children?.[0];
    expect(child).toBeDefined();
    expect(child?.path).toBe("Nested/Deep Note.md");
    expect(child?.name).toBe("Deep Note");
    expect(child?.slug).toBe("deep-note");
    expect(child?.href).toBe("Nested/Deep Note.html");
    expect(tree[1]?.slug).toBe("my-note");
    expect(tree[1]?.href).toBe("My Note.html");
    expect(tree[1]?.path).toBe("My Note.md");
  });

  it("returns no nodes for empty content", () => {
    expect(buildExplorerTree([])).toEqual([]);
  });
});

describe("renderExplorer", () => {
  it("renders file nodes as links", () => {
    const html = renderExplorer([
      { name: "Note", path: "Note.md", slug: "note", href: "Note.html", type: "file" },
    ]);
    expect(html).toBe('<ul><li class="explorer-file"><a href="/Note.html">Note</a></li></ul>');
  });

  it("escapes HTML in file names", () => {
    const html = renderExplorer([
      { name: "A&B <Note>", path: "note.md", slug: "note", href: "A&B.html", type: "file" },
    ]);
    expect(html).toContain("A&amp;B &lt;Note&gt;");
  });
});
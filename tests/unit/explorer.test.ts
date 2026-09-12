import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  it("lists folders before files and sorts within each group", () => {
    writeFile(dir, "B File.md", "# b");
    writeFile(dir, "A Folder/note.md", "# note");
    writeFile(dir, "A Folder/README.md", "# readme");

    const tree = buildExplorerTree(dir);
    expect(tree).toHaveLength(2);
    expect(tree[0]?.type).toBe("folder");
    expect(tree[0]?.name).toBe("A Folder");
    expect(tree[0]?.children).toHaveLength(2);
    expect(tree[1]?.type).toBe("file");
    expect(tree[1]?.name).toBe("B File");
  });

  it("ignores dotfiles and non-markdown files", () => {
    writeFile(dir, ".hidden.md", "# secret");
    writeFile(dir, "notes.txt", "still text");
    writeFile(dir, "Visible.md", "# visible");

    const tree = buildExplorerTree(dir);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe("Visible");
  });

  it("omits empty folders", () => {
    fs.mkdirSync(path.join(dir, "empty"), { recursive: true });
    writeFile(dir, "Kept.md", "# kept");

    const tree = buildExplorerTree(dir);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe("Kept");
  });

  it("records slug and .html href on file nodes", () => {
    writeFile(dir, "My Note.md", "# note");

    const tree = buildExplorerTree(dir);
    const node = tree[0];
    expect(node?.slug).toBe("my-note");
    expect(node?.href).toBe("My Note.html");
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
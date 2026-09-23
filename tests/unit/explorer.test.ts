import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadContent } from "../../src/content/loader.js";
import { buildExplorerTree } from "../../src/graph/navigation.js";
import { renderExplorer } from "../../src/rendering/explorer.js";
import type { ExplorerNode } from "../../src/domain/explorer.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;

const ORIGINAL_BASE_PATH = process.env.MUFFIN_BASE_PATH;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
  if (ORIGINAL_BASE_PATH === undefined) {
    delete process.env.MUFFIN_BASE_PATH;
  } else {
    process.env.MUFFIN_BASE_PATH = ORIGINAL_BASE_PATH;
  }
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

  it("ignores dotfiles, dotfolders, and non-markdown files", async () => {
    writeFile(dir, ".hidden.md", "# secret");
    writeFile(dir, "notes.txt", "still text");
    writeFile(dir, ".folder/inner.md", "# inner");
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

  it("records slug, relative path, and .html href on file nodes", async () => {
    writeFile(dir, "My Note.md", "# note");
    writeFile(dir, "Nested/Deep Note.md", "# deep");

    const { contents } = await loadContent(dir);
    const tree = buildExplorerTree(contents);
    expect(tree[0]?.type).toBe("folder");
    const child = tree[0]?.children?.[0];
    expect(child?.path).toBe("Nested/Deep Note.md");
    expect(child?.name).toBe("Deep Note");
    expect(child?.slug).toBe("deep-note");
    expect(child?.href).toBe("Nested/Deep Note.html");
    expect(tree[1]?.slug).toBe("my-note");
    expect(tree[1]?.href).toBe("My Note.html");
  });
});

describe("renderExplorer", () => {
  it("renders file nodes as links in the notes group with the base path applied", () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const html = renderExplorer([
      { name: "Note", path: "Note.md", slug: "note", href: "Note.html", type: "file" },
    ]);
    expect(html).toBe(
      '<ul class="explorer-notes"><li class="explorer-file" data-explorer-path="Note.md"><a href="/Muffin/Note.html">Note</a></li></ul>',
    );
  });

  it("splits top-level folders from root notes into two groups", () => {
    const tree: ExplorerNode[] = [
      { name: "notes", path: "notes", type: "folder", children: [] },
      { name: "Home", path: "Home.md", slug: "home", href: "Home.html", type: "file" },
      { name: "About", path: "About.md", slug: "about", href: "About.html", type: "file" },
    ];
    const html = renderExplorer(tree);

    expect(html).toMatch(/^<ul class="explorer-folders">.*<\/ul><ul class="explorer-notes">.*<\/ul>$/s);
    expect(html).toContain('<ul class="explorer-folders">');
    expect(html).toContain('<li class="explorer-folder">');
    expect(html).toContain('<ul class="explorer-notes">');
    expect(html.match(/class="explorer-notes"/g)).toHaveLength(1);
  });

  it("escapes HTML in file names", () => {
    const html = renderExplorer([
      { name: "A&B <Note>", path: "note.md", slug: "note", href: "A&B.html", type: "file" },
    ]);
    expect(html).toContain("A&amp;B &lt;Note&gt;");
  });

  it("exposes data-folder-path on folder details", () => {
    const html = renderExplorer([
      { name: "notes", path: "notes", type: "folder", children: [] },
    ]);
    expect(html).toContain('<details data-folder-path="notes">');
  });

  it("marks the matching file as current with aria-current and a class", () => {
    const tree: ExplorerNode[] = [
      { name: "project", path: "notes/project.md", slug: "project", href: "notes/project.html", type: "file" },
      { name: "other", path: "archive/other.md", slug: "other", href: "archive/other.html", type: "file" },
    ];
    const html = renderExplorer(tree, "notes/project.md");

    expect(html).toContain(
      '<li class="explorer-file explorer-current" data-explorer-path="notes/project.md"><a href="/notes/project.html" aria-current="page">project</a></li>',
    );
    expect(html).toContain(
      '<li class="explorer-file" data-explorer-path="archive/other.md"><a href="/archive/other.html">other</a></li>',
    );
    expect((html.match(/aria-current/g) ?? []).length).toBe(1);
  });

  it("activates duplicate filenames independently by relPath", () => {
    const tree: ExplorerNode[] = [
      { name: "project", path: "notes/project.md", slug: "project", href: "notes/project.html", type: "file" },
      { name: "project", path: "archive/project.md", slug: "project", href: "archive/project.html", type: "file" },
    ];

    const notes = renderExplorer(tree, "notes/project.md");
    expect(notes).toContain(
      '<li class="explorer-file explorer-current" data-explorer-path="notes/project.md"><a href="/notes/project.html" aria-current="page">project</a></li>',
    );
    expect(notes).toContain(
      '<li class="explorer-file" data-explorer-path="archive/project.md"><a href="/archive/project.html">project</a></li>',
    );

    const archive = renderExplorer(tree, "archive/project.md");
    expect(archive).toContain(
      '<li class="explorer-file explorer-current" data-explorer-path="archive/project.md"><a href="/archive/project.html" aria-current="page">project</a></li>',
    );
    expect(archive).toContain(
      '<li class="explorer-file" data-explorer-path="notes/project.md"><a href="/notes/project.html">project</a></li>',
    );
  });

  it("does not activate a page that is absent from the tree", () => {
    const html = renderExplorer(
      [{ name: "note", path: "note.md", slug: "note", href: "note.html", type: "file" }],
      "absent.md",
    );
    expect(html).not.toContain("aria-current");
    expect(html).not.toContain("explorer-current");
  });

  it("marks ancestor folders of the current page as active", () => {
    const tree: ExplorerNode[] = [
      {
        name: "notes",
        path: "notes",
        type: "folder",
        children: [
          {
            name: "sub",
            path: "notes/sub",
            type: "folder",
            children: [{ name: "deep", path: "notes/sub/deep.md", slug: "deep", href: "notes/sub/deep.html", type: "file" }],
          },
        ],
      },
    ];
    const html = renderExplorer(tree, "notes/sub/deep.md");

    expect(html).toContain('<li class="explorer-folder explorer-active-folder">');
    expect(html).toContain('<details data-folder-path="notes">');
    expect(html).toContain('<details data-folder-path="notes/sub">');
  });

  it("only marks folders that actually contain the current page as active", () => {
    const tree: ExplorerNode[] = [
      {
        name: "notes",
        path: "notes",
        type: "folder",
        children: [{ name: "a", path: "notes/a.md", slug: "a", href: "notes/a.html", type: "file" }],
      },
      {
        name: "archive",
        path: "archive",
        type: "folder",
        children: [{ name: "b", path: "archive/b.md", slug: "b", href: "archive/b.html", type: "file" }],
      },
    ];
    const html = renderExplorer(tree, "archive/b.md");

    expect(html).toContain('<li class="explorer-folder explorer-active-folder">');
    expect(html.match(/explorer-active-folder/g)).toHaveLength(1);
  });

  it("keeps the base path on hrefs while applying current-state hooks", () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const tree: ExplorerNode[] = [
      { name: "project", path: "notes/project.md", slug: "project", href: "notes/project.html", type: "file" },
    ];
    const html = renderExplorer(tree, "notes/project.md");
    expect(html).toContain('<a href="/Muffin/notes/project.html" aria-current="page">');
  });

  it("escapes relPath values in data attributes", () => {
    const html = renderExplorer([
      { name: "Note", path: 'a"&b.md', slug: "note", href: 'a"&b.html', type: "file" },
    ]);
    expect(html).toContain('data-explorer-path="a&quot;&amp;b.md"');
  });
});
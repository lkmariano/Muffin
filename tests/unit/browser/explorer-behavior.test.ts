// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { DOMWindow } from "jsdom";
import { renderExplorer } from "../../../src/rendering/explorer.js";
import type { ExplorerNode } from "../../../src/domain/explorer.js";
import type { Page } from "../../../src/domain/page.js";
import {
  EXPLORER_KEY,
  loadRenderedPage,
} from "./helpers.js";
import type { StorageWindow } from "./helpers.js";

const EXPLORER_TREE: ExplorerNode[] = [
  {
    name: "notes",
    path: "notes",
    type: "folder",
    children: [
      { name: "project", path: "notes/project.md", slug: "project", href: "notes/project.html", type: "file" },
    ],
  },
  { name: "other", path: "other.md", slug: "other", href: "other.html", type: "file" },
  { name: "wiki", path: "wiki.md", slug: "wiki", href: "wiki.html", type: "file" },
];

function makePage(relPath = "notes/project.md", title = "Notes Project"): Page {
  return {
    path: `/vault/${relPath}`,
    relPath,
    slug: relPath.split("/").pop()!.replace(/\.md$/, "").toLowerCase(),
    title,
    metadata: { frontmatter: {}, updated: "2026-01-01", tags: [] },
    content: "<p>body</p>",
    toc: [],
  };
}

function explorerHtml(currentRelPath = "notes/project.md"): string {
  return renderExplorer(EXPLORER_TREE, currentRelPath);
}

function storedPayload(
  win: StorageWindow,
  key = EXPLORER_KEY,
): { folders: Record<string, boolean> } {
  const raw = win.localStorage.getItem(key);
  return raw ? JSON.parse(raw) : { folders: {} };
}

function seedStorage(
  key: string,
  payload: { folders?: Record<string, boolean> },
): (win: DOMWindow) => void {
  return (win: DOMWindow) => {
    win.localStorage.setItem(key, JSON.stringify(payload));
  };
}

describe("Explorer persistence (browser)", () => {
  it("restores persisted folder state and persists a new toggle on desktop", () => {
    const dom = loadRenderedPage(makePage(), {
      explorerHtml: explorerHtml(),
      beforeParse: seedStorage(EXPLORER_KEY, { folders: { notes: true } }),
    });
    const win = dom.window;
    const doc = dom.window.document;

    const folder = doc.querySelector('details[data-folder-path="notes"]') as HTMLDetailsElement;
    expect(folder).not.toBeNull();
    expect(folder.open).toBe(true);

    folder.open = false;
    folder.dispatchEvent(new dom.window.Event("toggle"));

    expect(storedPayload(win).folders.notes).toBe(false);
  });

  it("survives navigation: a second page load restores the saved folder state", () => {
    const first = loadRenderedPage(makePage(), {
      explorerHtml: explorerHtml(),
    });
    const win = first.window;
    const folder = first.window.document.querySelector(
      'details[data-folder-path="notes"]',
    ) as HTMLDetailsElement;

    folder.open = true;
    folder.dispatchEvent(new first.window.Event("toggle"));

    const saved = win.localStorage.getItem(EXPLORER_KEY);
    expect(saved).not.toBeNull();

    const second = loadRenderedPage(makePage("other.md", "Other"), {
      explorerHtml: explorerHtml("other.md"),
      beforeParse: (w) => w.localStorage.setItem(EXPLORER_KEY, saved!),
    });

    const restored = second.window.document.querySelector(
      'details[data-folder-path="notes"]',
    ) as HTMLDetailsElement;
    expect(restored.open).toBe(true);
  });

  it("keeps aria-expanded truthful for the toggle-all button", () => {
    const dom = loadRenderedPage(makePage(), {
      explorerHtml: explorerHtml(),
    });
    const doc = dom.window.document;
    const toggle = doc.getElementById("explorer-toggle-all") as HTMLButtonElement;
    const storage = dom.window;

    // All folders start collapsed (the renderer emits <details> without
    // `open`) → the button can expand them all at once.
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(storedPayload(storage).folders.notes).toBe(true);

    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(storedPayload(storage).folders.notes).toBe(false);
  });

  it("scopes storage to the site base path", () => {
    const dom = loadRenderedPage(makePage(), {
      basePath: "/Muffin",
      explorerHtml: explorerHtml(),
    });
    const win = dom.window;
    const doc = dom.window.document;

    const toggle = doc.getElementById("explorer-toggle-all") as HTMLButtonElement;
    expect(doc.body.getAttribute("data-base-path")).toBe("/Muffin");

    toggle.click();

    const scoped = win.localStorage.getItem("muffin:explorer:v1:/Muffin");
    expect(scoped).toBeTruthy();
    expect(win.localStorage.getItem(EXPLORER_KEY)).toBeNull();
  });

  it("keeps working when storage is unavailable", () => {
    const dom = loadRenderedPage(makePage(), {
      explorerHtml: explorerHtml(),
      beforeParse: (w) => {
        Object.defineProperty(w, "localStorage", {
          configurable: true,
          value: {
            getItem: () => {
              throw new Error("denied");
            },
            setItem: () => {
              throw new Error("denied");
            },
            removeItem: () => {
              throw new Error("denied");
            },
          },
        });
      },
    });
    const doc = dom.window.document;

    const content = doc.querySelector(".explorer-content") as HTMLElement;
    const toggle = doc.getElementById("explorer-toggle-all") as HTMLButtonElement;

    toggle.click();

    expect(content).not.toBeNull();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("Current-page highlighting (browser/render)", () => {
  it("body[data-relpath] matches the current Explorer item's data-explorer-path", () => {
    const dom = loadRenderedPage(makePage(), {
      explorerHtml: explorerHtml(),
    });
    const doc = dom.window.document;

    const bodyRelPath = doc.body.getAttribute("data-relpath");
    const current = doc.querySelector('.explorer-file a[aria-current="page"]') as HTMLElement | null;

    expect(bodyRelPath).toBe("notes/project.md");
    expect(current).not.toBeNull();
    expect(
      (current!.closest(".explorer-file") as HTMLElement).getAttribute("data-explorer-path"),
    ).toBe(bodyRelPath);

    const others = doc.querySelectorAll(".explorer-file a[aria-current='page']");
    expect(others.length).toBe(1);
  });

  it("desktop header button exposes aria-controls and an accessible name", () => {
    const dom = loadRenderedPage(makePage(), {
      explorerHtml: explorerHtml(),
    });
    const doc = dom.window.document;

    const toggle = doc.getElementById("explorer-toggle-all") as HTMLButtonElement;
    expect(toggle.getAttribute("aria-controls")).toBe("explorer-content");
    expect((toggle.querySelector(".explorer-title") as HTMLElement).textContent).toBe(
      "Explorer",
    );
    expect(toggle.querySelector(".explorer-header-chevron svg.chevron")).not.toBeNull();
  });
});
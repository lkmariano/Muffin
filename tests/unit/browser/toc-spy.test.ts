// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { DOMWindow } from "jsdom";
import type { Page } from "../../../src/domain/page.js";
import type { TocEntry } from "../../../src/domain/page.js";
import {
  installSyncRequestAnimationFrame,
  loadRenderedPage,
} from "./helpers.js";

function makeTocPage(toc: TocEntry[], content: string): Page {
  return {
    path: "/vault/scroll.md",
    relPath: "scroll.md",
    slug: "scroll",
    title: "Scroll",
    metadata: { frontmatter: {}, updated: "2026-01-01", tags: [] },
    content,
    toc,
  };
}

const HEADINGS =
  '<h1 id="intro">Intro</h1><h2 id="alpha">Alpha</h2><h2 id="beta">Beta</h2><h2 id="final">Final</h2><p>tail</p>';
const STANDARD_TOC: TocEntry[] = [
  { depth: 1, text: "Intro", id: "intro" },
  { depth: 2, text: "Alpha", id: "alpha" },
  { depth: 2, text: "Beta", id: "beta" },
  { depth: 2, text: "Final", id: "final" },
];

function setHeadingsTop(
  win: DOMWindow,
  tops: Record<string, number>,
): void {
  const doc = win.document;
  Object.entries(tops).forEach(([id, top]) => {
    const heading = doc.getElementById(id);
    if (!heading) return;
    (heading as Element & { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
      () => ({ top } as DOMRect);
  });
}

function scroll(win: DOMWindow): void {
  win.dispatchEvent(new win.Event("scroll"));
}

function passed(doc: Document): string[] {
  return Array.from(doc.querySelectorAll(".toc-list a.is-passed")).map((a) =>
    a.getAttribute("href") ?? "",
  );
}

function current(doc: Document): string[] {
  return Array.from(doc.querySelectorAll('.toc-list a[aria-current="location"]')).map((a) =>
    a.getAttribute("href") ?? "",
  );
}

function atBottom(win: DOMWindow): void {
  Object.defineProperty(win.document.documentElement, "scrollHeight", {
    configurable: true,
    get: () => 2000,
  });
  Object.defineProperty(win, "scrollY", { configurable: true, get: () => 1900 });
  Object.defineProperty(win, "innerHeight", { configurable: true, get: () => 768 });
}

describe("TOC scroll-spy (browser)", () => {
  it("is inert on pages without a TOC", () => {
    const dom = loadRenderedPage(makeTocPage([], "<p>plain</p>"));
    const doc = dom.window.document;

    expect(doc.querySelector(".toc-list")).toBeNull();
    expect(doc.querySelector(".has-spy")).toBeNull();
    expect(doc.querySelector(".is-passed")).toBeNull();
  });

  it("marks JS as enabled with has-spy and leaves everything full color at the top", () => {
    const dom = loadRenderedPage(makeTocPage(STANDARD_TOC, HEADINGS), {
      beforeParse: installSyncRequestAnimationFrame,
    });
    const doc = dom.window.document;

    // Top of the page: every heading is below the 30% line → nothing dimmed.
    setHeadingsTop(dom.window, { intro: 600, alpha: 700, beta: 800, final: 900 });
    scroll(dom.window);

    const list = doc.querySelector(".toc-list")!;
    expect(list.classList.contains("has-spy")).toBe(true);
    expect(passed(doc)).toEqual([]);
    expect(current(doc)).toEqual([]);
  });

  it("drives the single link passed on a one-heading page", () => {
    const dom = loadRenderedPage(
      makeTocPage(
        [{ depth: 1, text: "Intro", id: "intro" }],
        '<h1 id="intro">Intro</h1>',
      ),
      { beforeParse: installSyncRequestAnimationFrame },
    );
    const doc = dom.window.document;
    expect(doc.querySelectorAll(".toc-list a").length).toBe(1);

    setHeadingsTop(dom.window, { intro: 100 });
    scroll(dom.window);
    expect(passed(doc)).toEqual(["#intro"]);
    expect(current(doc)).toEqual(["#intro"]);

    setHeadingsTop(dom.window, { intro: 400 });
    scroll(dom.window);
    expect(passed(doc)).toEqual([]);
    expect(current(doc)).toEqual([]);
  });

  it("passes headings above the 30% line and tracks the last passed as current", () => {
    const dom = loadRenderedPage(makeTocPage(STANDARD_TOC, HEADINGS), {
      beforeParse: installSyncRequestAnimationFrame,
    });
    const doc = dom.window.document;

    // Only intro is above the line (768 * 0.3 ≈ 230).
    setHeadingsTop(dom.window, { intro: 100, alpha: 400, beta: 500, final: 600 });
    scroll(dom.window);
    expect(passed(doc)).toEqual(["#intro"]);
    expect(current(doc)).toEqual(["#intro"]);

    // Scrolling further passes alpha as well → the newest one is current.
    setHeadingsTop(dom.window, { intro: 0, alpha: 100, beta: 500, final: 600 });
    scroll(dom.window);
    expect(passed(doc)).toEqual(["#intro", "#alpha"]);
    expect(current(doc)).toEqual(["#alpha"]);
  });

  it("passes every entry at the page bottom and keeps the final one current", () => {
    const dom = loadRenderedPage(makeTocPage(STANDARD_TOC, HEADINGS), {
      beforeParse: installSyncRequestAnimationFrame,
    });
    const doc = dom.window.document;

    atBottom(dom.window);
    scroll(dom.window);
    expect(passed(doc)).toEqual(["#intro", "#alpha", "#beta", "#final"]);
    expect(current(doc)).toEqual(["#final"]);
  });

  it("resolves duplicate TOC ids to the first link only", () => {
    const toc: TocEntry[] = [
      { depth: 2, text: "Alpha", id: "alpha" },
      { depth: 2, text: "Alpha again", id: "alpha" },
    ];
    const dom = loadRenderedPage(
      makeTocPage(toc, '<h2 id="alpha">Alpha</h2><p>tail</p>'),
      { beforeParse: installSyncRequestAnimationFrame },
    );
    const doc = dom.window.document;

    const links = doc.querySelectorAll('.toc-list a[href="#alpha"]');
    expect(links.length).toBe(2);

    setHeadingsTop(dom.window, { alpha: 100 });
    scroll(dom.window);

    expect(links[0]!.classList.contains("is-passed")).toBe(true);
    expect(links[1]!.classList.contains("is-passed")).toBe(false);
    expect(current(doc)).toEqual(["#alpha"]);
  });

  it("skips links whose heading does not exist", () => {
    const toc: TocEntry[] = [
      { depth: 1, text: "Real", id: "real" },
      { depth: 2, text: "Missing", id: "missing" },
    ];
    const dom = loadRenderedPage(
      makeTocPage(toc, '<h1 id="real">Real</h1><p>tail</p>'),
      { beforeParse: installSyncRequestAnimationFrame },
    );
    const doc = dom.window.document;

    // The missing link still renders from the TOC, but the script only tracks
    // the existing "real" heading — so the bottom-fallback stays on #real.
    expect(doc.querySelectorAll(".toc-list a").length).toBe(2);
    atBottom(dom.window);
    scroll(dom.window);
    expect(passed(doc)).toEqual(["#real"]);
    expect(current(doc)).toEqual(["#real"]);
    expect(
      (doc.querySelector('.toc-list a[href="#missing"]') as Element).classList.contains("is-passed"),
    ).toBe(false);
  });

  it("runs without console errors or navigation", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const before = "https://muffin.test/";
    const dom = loadRenderedPage(makeTocPage(STANDARD_TOC, HEADINGS), {
      url: before,
      beforeParse: installSyncRequestAnimationFrame,
    });

    expect(error).not.toHaveBeenCalled();
    expect(dom.window.location.href).toBe(before);
    error.mockRestore();
  });
});
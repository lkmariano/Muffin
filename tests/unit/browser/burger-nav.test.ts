// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { loadRenderedPage, installMatchMedia } from "./helpers.js";

const TREE_HTML =
  '<ul class="explorer-notes"><li class="explorer-file"><a href="/note.html">Note</a></li></ul>';

function makePage() {
  return {
    path: "/vault/note.md",
    relPath: "note.md",
    slug: "note",
    title: "Note",
    metadata: { frontmatter: {}, updated: "2026-01-01", tags: [] },
    content: "<p>body</p>",
    toc: [],
  };
}

describe("Burger drawer (browser)", () => {
  it("marks JS availability on <html> before the page scripts run", () => {
    const dom = loadRenderedPage(makePage(), {
      beforeParse: (w) => installMatchMedia(w, { initial: true }),
    });
    expect(dom.window.document.documentElement.classList.contains("js")).toBe(true);
  });

  it("opens and closes the drawer from the burger", () => {
    const dom = loadRenderedPage(makePage(), {
      explorerHtml: TREE_HTML,
      beforeParse: (w) => {
        installMatchMedia(w, { initial: true });
      },
    });
    const win = dom.window;
    const doc = win.document;

    const btn = doc.getElementById("nav-toggle") as HTMLButtonElement;
    const nav = doc.getElementById("site-nav") as HTMLElement;
    const backdrop = doc.getElementById("nav-backdrop") as HTMLElement;

    expect(nav.classList.contains("is-open")).toBe(false);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(doc.body.classList.contains("nav-locked")).toBe(false);

    btn.click();
    expect(nav.classList.contains("is-open")).toBe(true);
    expect(backdrop.classList.contains("is-open")).toBe(true);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(doc.body.classList.contains("nav-locked")).toBe(true);

    backdrop.click();
    expect(nav.classList.contains("is-open")).toBe(false);
    expect(doc.body.classList.contains("nav-locked")).toBe(false);
  });

  it("closes on Escape and returns focus to the burger", () => {
    const dom = loadRenderedPage(makePage(), {
      explorerHtml: TREE_HTML,
      beforeParse: (w) => installMatchMedia(w, { initial: true }),
    });
    const win = dom.window;
    const doc = win.document;

    const btn = doc.getElementById("nav-toggle") as HTMLButtonElement;
    const nav = doc.getElementById("site-nav") as HTMLElement;
    btn.click();
    expect(nav.classList.contains("is-open")).toBe(true);

    doc.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape" }));
    expect(nav.classList.contains("is-open")).toBe(false);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the drawer when navigating to a note", () => {
    const dom = loadRenderedPage(makePage(), {
      explorerHtml: TREE_HTML,
      beforeParse: (w) => installMatchMedia(w, { initial: true }),
    });
    const win = dom.window;
    const doc = win.document;

    const btn = doc.getElementById("nav-toggle") as HTMLButtonElement;
    const nav = doc.getElementById("site-nav") as HTMLElement;
    const link = doc.querySelector("#site-nav a[href]") as HTMLElement;

    btn.click();
    expect(nav.classList.contains("is-open")).toBe(true);

    link.click();
    expect(nav.classList.contains("is-open")).toBe(false);
    expect(doc.body.classList.contains("nav-locked")).toBe(false);
  });

  it("unlocks the page when resizing up to desktop", () => {
    let setMobile: (matches: boolean) => void = () => undefined;
    const dom = loadRenderedPage(makePage(), {
      explorerHtml: TREE_HTML,
      beforeParse: (w) => {
        setMobile = installMatchMedia(w, { initial: true });
      },
    });
    const win = dom.window;
    const doc = win.document;

    const btn = doc.getElementById("nav-toggle") as HTMLButtonElement;
    const nav = doc.getElementById("site-nav") as HTMLElement;
    btn.click();
    expect(nav.classList.contains("is-open")).toBe(true);
    expect(doc.body.classList.contains("nav-locked")).toBe(true);

    setMobile(false);
    expect(nav.classList.contains("is-open")).toBe(false);
    expect(doc.body.classList.contains("nav-locked")).toBe(false);
  });

  it("is inert when matchMedia is unavailable (no-JS style environments)", () => {
    const dom = loadRenderedPage(makePage(), {
      explorerHtml: TREE_HTML,
    });
    const win = dom.window;
    const doc = win.document;

    // jsdom without a matchMedia stub leaves the drawer script uninitialised;
    // the page still renders and the explorer script still runs.
    expect(doc.getElementById("nav-toggle")).not.toBeNull();
    expect(win.matchMedia).toBeUndefined();
  });
});
import { JSDOM } from "jsdom";
import type { DOMWindow } from "jsdom";
import { loadPageTemplate } from "../../../src/output/templates.js";
import { renderPage } from "../../../src/rendering/page.js";
import { createPresentationContext } from "../../../src/rendering/context.js";
import type { Page } from "../../../src/domain/page.js";
import type { SiteIdentity } from "../../../src/site.js";

export const EXPLORER_KEY = "muffin:explorer:v1:/";

/**
 * Builds a page using the real production template and renderer, then loads it
 * into a jsdom window that executes the page's inline scripts. This exercises
 * the actual generated markup and production browser scripts without needing a
 * filesystem build.
 */
export function loadRenderedPage(
  page: Page,
  options: {
    explorerHtml?: string;
    basePath?: string;
    url?: string;
    beforeParse?: (win: DOMWindow) => void;
  } = {},
): JSDOM {
  const site: SiteIdentity = { title: "Muffin", lang: "en" };
  const previousBasePath = process.env.MUFFIN_BASE_PATH;
  if (options.basePath !== undefined) process.env.MUFFIN_BASE_PATH = options.basePath;

  try {
    const html = renderPage(
      createPresentationContext(
        page,
        site,
        options.explorerHtml ?? "<ul></ul>",
        { hasMath: false },
      ),
      loadPageTemplate(),
    );

    const jsdomOptions: {
      url: string;
      runScripts: "dangerously";
      beforeParse?: (win: DOMWindow) => void;
    } = {
      url: options.url ?? "https://muffin.test/",
      runScripts: "dangerously",
    };
    if (options.beforeParse !== undefined) jsdomOptions.beforeParse = options.beforeParse;

    return new JSDOM(html, jsdomOptions);
  } finally {
    if (previousBasePath === undefined) {
      delete process.env.MUFFIN_BASE_PATH;
    } else {
      process.env.MUFFIN_BASE_PATH = previousBasePath;
    }
  }
}

export type StorageWindow = Pick<DOMWindow, "localStorage">;

/** matchMedia stub whose mobile result can change at runtime. */
export function installMatchMedia(
  win: DOMWindow,
  kwargs: { initial?: boolean } = {},
): (matches: boolean) => void {
  let matches = kwargs.initial ?? false;
  const listeners: Array<() => void> = [];

  (
    win as unknown as {
      matchMedia: (query: string) => MediaQueryList & { addListener: (cb: () => void) => void };
    }
  ).matchMedia = (query: string) => {
    const media = {
      get matches() {
        return matches;
      },
      media: query,
      addEventListener: (_type: string, cb: () => void) => {
        listeners.push(cb);
      },
      addListener: (cb: () => void) => {
        listeners.push(cb);
      },
      removeEventListener: () => undefined,
      removeListener: () => undefined,
      onchange: null,
      dispatchEvent: () => true,
    } as unknown as MediaQueryList & { addListener: (cb: () => void) => void };
    return media;
  };

  return (next) => {
    matches = next;
    listeners.forEach((cb) => cb());
  };
}

/** Runs the scroll-spy's rAF callbacks synchronously on every scroll/resize. */
export function installSyncRequestAnimationFrame(win: DOMWindow): void {
  (win as unknown as { requestAnimationFrame: (cb: () => void) => number }).requestAnimationFrame =
    (cb: () => void) => {
      cb();
      return 0;
    };
}
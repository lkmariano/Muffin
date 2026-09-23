import type { Page } from "../domain/page.js";
import type { SiteIdentity } from "../site.js";

/**
 * The presentation boundary between build/domain data and the HTML shell.
 *
 * Build.ts assembles one context per page; templates only ever receive the
 * value of a context field, never raw domain data. The context is intentionally
 * generic — it carries Muffin page data, site identity, and rendering flags, and
 * contains no site-specific layout or branding. Deployment plumbing like the
 * base path lives in withBasePath(), not here.
 */
export type PresentationContext = {
  site: SiteIdentity;
  page: Page;
  explorerHtml: string;
  hasMath: boolean;
  /** Absolute feed URL (origin + base-pathed /feed.xml); "" disables it. */
  rssHref: string;
};

export type PresentationOptions = {
  hasMath?: boolean;
  rssHref?: string;
};

/**
 * The per-page presentation extension point.
 *
 * Muffin's composition root (`build.ts`) calls one of these per page with the
 * assembled presentation context and the loaded page template. `renderPage` is
 * the default implementation; a consuming site may inject its own renderer to
 * choose presentation for a page — e.g. from
 * `context.page.metadata.frontmatter.type` — without Muffin interpreting those
 * values. Renderers must not import `fs` or perform filesystem operations.
 */
export type PageRenderer = (
  context: PresentationContext,
  template: string,
) => string;

export function createPresentationContext(
  page: Page,
  site: SiteIdentity,
  explorerHtml = "",
  options: PresentationOptions = {},
): PresentationContext {
  return {
    site,
    page,
    explorerHtml,
    hasMath: options.hasMath === true,
    rssHref: options.rssHref ?? "",
  };
}
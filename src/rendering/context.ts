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
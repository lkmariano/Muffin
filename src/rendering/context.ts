import type { Page } from "../domain/page.js";
import type { SiteIdentity } from "../config/loader.js";

/**
 * The presentation boundary between build/domain data and the HTML shell.
 *
 * Build.ts assembles one context per page; templates only ever receive the
 * value of a context field, never raw domain data. The context is intentionally
 * generic — it carries Muffin page data, site identity, and rendering flags, and
 * contains no site-specific layout or branding.
 */
export type PresentationContext = {
  site: SiteIdentity;
  basePath: string;
  page: Page;
  explorerHtml: string;
  hasMath: boolean;
};

export type PresentationOptions = {
  /** URL prefix for generated hrefs. Defaults to `site.basePath`. */
  basePath?: string;
  hasMath?: boolean;
};

export function createPresentationContext(
  page: Page,
  site: SiteIdentity,
  explorerHtml = "",
  options: PresentationOptions = {},
): PresentationContext {
  return {
    site,
    basePath: options.basePath ?? site.basePath,
    page,
    explorerHtml,
    hasMath: options.hasMath === true,
  };
}

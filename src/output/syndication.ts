import type { Page } from "../domain/page.js";
import { SITE } from "../site.js";
import { withBasePath } from "../../basePath.js";
import { formatRfc822, toHtmlPath } from "../../util.js";

/**
 * Pure, filesystem-free generation of RSS 2.0 (feed.xml) and the XML sitemap
 * from the already-built Page[] model + resolved site origin. No content
 * rediscovery.
 *
 * Eligibility contract: these generators operate only on the supplied Page[].
 * They must not filter, rediscover, or otherwise reinterpret page eligibility.
 * Every passed page is considered publicly addressable, and the existing
 * Page.relPath / Page.metadata are authoritative for link + date composition.
 * The caller owns deciding which pages are public.
 *
 * Metadata opacity contract: only the generic fields the output requires are
 * consumed — title, relPath, metadata.updated, content. Arbitrary frontmatter
 * (e.g. type, layout, site-specific keys) is opaque to Muffin core: never
 * branched on, filtered by, assigned meaning, or collected into a page-type
 * taxonomy. Interpretation of site-defined metadata belongs to the site layer,
 * not this module.
 */

export function renderRssFeed(pages: Page[], origin: string): string {
  if (origin === "") return "";
  const description = SITE.description !== undefined ? SITE.description : SITE.title;
  const items = sortPages(pages)
    .map((page) => {
      const link = composeLink(page, origin);
      return [
        "    <item>",
        `      <title>${escapeXml(page.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${escapeXml(formatRfc822(page.metadata.updated))}</pubDate>`,
        `      <description>${renderDescription(page.content)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${escapeXml(SITE.title)}</title>`,
    `    <link>${escapeXml(origin + withBasePath("/"))}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    `    <language>${escapeXml(SITE.lang)}</language>`,
    items,
    "  </channel>",
    "</rss>",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function renderSitemap(pages: Page[], origin: string): string {
  if (origin === "") return "";
  const urls = sortPages(pages)
    .map((page) => {
      return [
        "  <url>",
        `    <loc>${escapeXml(composeLink(page, origin))}</loc>`,
        `    <lastmod>${escapeXml(page.metadata.updated)}</lastmod>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
  ].join("\n");
}

/** Items sorted by updated descending, relPath ascending as a tiebreak. The
 *  "YYYY-MM-DD" dates compare lexicographically and correctly. */
function sortPages(pages: Page[]): Page[] {
  return [...pages].sort(
    (a, b) =>
      b.metadata.updated.localeCompare(a.metadata.updated) ||
      a.relPath.localeCompare(b.relPath),
  );
}

function composeLink(page: Page, origin: string): string {
  return origin + withBasePath("/" + toHtmlPath(page.relPath));
}

function renderDescription(content: string): string {
  return `<![CDATA[${content.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
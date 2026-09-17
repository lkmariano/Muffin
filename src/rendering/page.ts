import type { Backlink, PageMetadata } from "../domain/page.js";
import type { SiteIdentity } from "../config/loader.js";
import { withBasePath } from "../../basePath.js";

export interface RenderablePage {
  slug: string;
  title: string;
  content: string;
  metadata: PageMetadata;
  backlinks?: Backlink[];
}

export function renderPage(
  page: RenderablePage,
  template: string,
  explorerHtml: string,
  site: SiteIdentity,
  basePath = "",
): string {
  const listItems = (page.backlinks ?? [])
    .map((link) => `<li><a href="${link.href}">${link.title}</a></li>`)
    .join("");
  const backlinksHtml = listItems
  ? `<div class="aside-title">Backlinks</div><ul>${listItems}</ul>`
  : "";
  const cssHref = withBasePath(basePath, "/styles.css");
  const themeCssHref = withBasePath(basePath, "/theme.css");
  const katexCssHref = withBasePath(basePath, "/katex/katex.min.css");

  const metaParts: string[] = [];
  if (page.metadata.status) {
    metaParts.push(`<span class="page-status">${page.metadata.status}</span>`);
  }
  metaParts.push(`<span class="page-updated">Updated ${page.metadata.updated}</span>`);
  const pageMetaHtml = `<div class="page-meta">${metaParts.join("")}</div>`;

  const descriptionMeta =
    site.description === undefined
      ? ""
      : `<meta name="description" content="${escapeAttr(site.description)}" />`;

  const bodyAttrs = `data-slug="${escapeAttr(page.slug)}"`;

  return template
    .replaceAll("{{TITLE}}", page.title)
    .replaceAll("{{LANG}}", escapeAttr(site.lang))
    .replaceAll("{{SITE_TITLE}}", escapeAttr(site.title))
    .replaceAll("{{SITE_DESCRIPTION}}", descriptionMeta)
    .replaceAll("{{BACKLINKS}}", backlinksHtml)
    .replaceAll("{{NAV}}", explorerHtml)
    .replaceAll("{{THEME_CSS}}", themeCssHref)
    .replaceAll("{{CSS}}", cssHref)
    .replaceAll("{{KATEX_CSS}}", katexCssHref)
    .replaceAll("{{PAGE_META}}", pageMetaHtml)
    .replaceAll("{{BODY_ATTRS}}", bodyAttrs)
    .replaceAll("{{CONTENT}}", page.content);
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
import type { Backlink, PageMetadata } from "../domain/page.js";
import { withBasePath } from "../../basePath.js";

export interface RenderablePage {
  // ADDED: slug — paired with metadata.pageType to build the body attributes.
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

  const metaParts: string[] = [];
  if (page.metadata.status) {
    metaParts.push(`<span class="page-status">${page.metadata.status}</span>`);
  }
  metaParts.push(`<span class="page-updated">Updated ${page.metadata.updated}</span>`);
  const pageMetaHtml = `<div class="page-meta">${metaParts.join("")}</div>`;

  // ADDED: body attributes keyed off the page type + slug. These are the hooks
  // the global stylesheet scopes layout rules on (e.g. body[data-page-type="home"]).
  const bodyAttrs = `data-page-type="${escapeAttr(page.metadata.pageType)}" data-slug="${escapeAttr(page.slug)}"`;

  return template
    .replaceAll("{{TITLE}}", page.title)
    .replaceAll("{{BACKLINKS}}", backlinksHtml)
    .replaceAll("{{NAV}}", explorerHtml)
    .replaceAll("{{THEME_CSS}}", themeCssHref)
    .replaceAll("{{CSS}}", cssHref)
    .replaceAll("{{PAGE_META}}", pageMetaHtml)
    .replaceAll("{{BODY_ATTRS}}", bodyAttrs)
    .replaceAll("{{CONTENT}}", page.content);
}

// ADDED: escape attribute values so generated HTML can't be broken by quotes/angles.
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

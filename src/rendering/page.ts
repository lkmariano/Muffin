import type { Backlink, PageMetadata } from "../domain/page.js";
import { withBasePath } from "../../basePath.js";

export interface RenderablePage {
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

  return template
    .replaceAll("{{TITLE}}", page.title)
    .replaceAll("{{BACKLINKS}}", backlinksHtml)
    .replaceAll("{{NAV}}", explorerHtml)
    .replaceAll("{{THEME_CSS}}", themeCssHref)
    .replaceAll("{{CSS}}", cssHref)
    .replaceAll("{{PAGE_META}}", pageMetaHtml)
    .replaceAll("{{CONTENT}}", page.content);
}

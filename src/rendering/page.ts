import { withBasePath } from "../../basePath.js";

export interface RenderablePage {
  title: string;
  content: string;
  status?: string;
  updated: string;
  backlinks?: Array<{ title: string; href: string }>;
}

export function renderPage(
  page: RenderablePage,
  template: string,
  explorerHtml: string,
): string {
  const listItems = (page.backlinks ?? [])
    .map((link) => `<li><a href="${link.href}">${link.title}</a></li>`)
    .join("");
  const backlinksHtml = listItems
  ? `<div class="aside-title">Backlinks</div><ul>${listItems}</ul>`
  : "";
  const cssHref = withBasePath("/styles.css");
  const themeCssHref = withBasePath("/theme.css");

  const metaParts: string[] = [];
  if (page.status) {
    metaParts.push(`<span class="page-status">${page.status}</span>`);
  }
  metaParts.push(`<span class="page-updated">Updated ${page.updated}</span>`);
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

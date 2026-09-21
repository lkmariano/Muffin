import type { PageMetadata, TocEntry } from "../domain/page.js";
import type { PresentationContext } from "./context.js";
import { withBasePath } from "../../basePath.js";

/**
 * Renders a full page shell from a presentation context. The template is
 * filled through a single centralized token map — templates never reach back
 * into raw build data.
 */
export function renderPage(
  context: PresentationContext,
  template: string,
): string {
  const {
    site,
    basePath,
    explorerHtml,
    hasMath,
    page: { relPath, slug, title, metadata, content, backlinks, toc },
  } = context;

  const backlinksSection = renderBacklinks(backlinks ?? []);
  const tocSection = renderToc(toc);

  const cssHref = withBasePath(basePath, "/styles.css");
  const themeCssHref = withBasePath(basePath, "/theme.css");
  const katexCss =
    hasMath
      ? `<link rel="stylesheet" href="${withBasePath(basePath, "/katex/katex.min.css")}">`
      : "";

  const descriptionMeta =
    site.description === undefined
      ? ""
      : `<meta name="description" content="${escapeAttr(site.description)}" />`;

  const bodyAttrs = `data-slug="${escapeAttr(slug)}" data-relpath="${escapeAttr(relPath)}" data-base-path="${escapeAttr(basePath)}"`;

  return template
    .replaceAll("{{TITLE}}", escapeHtml(title))
    .replaceAll("{{LANG}}", escapeAttr(site.lang))
    .replaceAll("{{SITE_TITLE}}", escapeAttr(site.title))
    .replaceAll("{{SITE_DESCRIPTION}}", descriptionMeta)
    .replaceAll("{{TOC}}", tocSection)
    .replaceAll("{{BACKLINKS}}", backlinksSection)
    .replaceAll("{{NAV}}", explorerHtml)
    .replaceAll("{{THEME_CSS}}", themeCssHref)
    .replaceAll("{{CSS}}", cssHref)
    .replaceAll("{{KATEX_CSS}}", katexCss)
    .replaceAll("{{PAGE_META}}", renderPageMeta(metadata))
    .replaceAll("{{BODY_ATTRS}}", bodyAttrs)
    .replaceAll("{{CONTENT}}", content);
}

function renderPageMeta(metadata: PageMetadata): string {
  const metaParts: string[] = [];
  if (metadata.status) {
    metaParts.push(`<span class="page-status">${escapeHtml(metadata.status)}</span>`);
  }
  metaParts.push(`<span class="page-updated">${escapeHtml(formatDisplayDate(metadata.updated))}</span>`);
  if (metadata.tags.length > 0) {
    metaParts.push(
      `<span class="page-tags">${metadata.tags.map((tag) => escapeHtml(tag)).join(", ")}</span>`,
    );
  }
  return `<div class="page-meta">${metaParts.join("")}</div>`;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Renders the ISO `YYYY-MM-DD` `updated` value as a human-readable date
 *  (e.g. "Sep 21, 2026") without timezone shifting. Falls back to the raw
 *  value when the date cannot be parsed. */
function formatDisplayDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const year = match[1];
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return iso;
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

function renderToc(toc: TocEntry[]): string {
  const listItems = toc
    .map((entry) => {
      const classNames = `toc-item toc-depth-${entry.depth}`;
      if (entry.id === "") {
        return `<li class="${classNames}"><span>${escapeHtml(entry.text)}</span></li>`;
      }
      return `<li class="${classNames}"><a href="#${escapeAttr(entry.id)}">${escapeHtml(entry.text)}</a></li>`;
    })
    .join("");

  return listItems
    ? `<div class="toc"><details open><summary><span class="aside-title">Table of Contents</span><span class="aside-chevron"><svg class="chevron" viewBox="0 0 12.5 6.25" aria-hidden="true"><path d="M0.5 0.5 L6.25 5.75 L12 0.5"/></svg></span></summary><ul class="toc-list">${listItems}</ul></details></div>`
    : "";
}

function renderBacklinks(backlinks: { title: string; href: string }[]): string {
  const listItems = backlinks
    .map(
      (link) =>
        `<li><a href="${escapeAttr(link.href)}">${escapeHtml(link.title)}</a></li>`,
    )
    .join("");

  return listItems
    ? `<div class="backlinks"><h2 class="aside-title">Backlinks</h2><ul class="backlinks-list">${listItems}</ul></div>`
    : "";
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

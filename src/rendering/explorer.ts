import type { ExplorerNode } from "../domain/explorer.js";
import { withBasePath } from "../../basePath.js";

/**
 * Renders the Explorer tree. `currentRelPath` is the canonical root-relative
 * identity of the page being shown; matching is always exact relPath — never
 * basename — so duplicate filenames stay independent across folders.
 */
export function renderExplorer(
  nodes: ExplorerNode[],
  basePath = "",
  currentRelPath?: string,
): string {
  const folders = nodes.filter((node) => node.type === "folder");
  const notes = nodes.filter((node) => node.type === "file");
  const parts: string[] = [];

  if (folders.length > 0) {
    parts.push(
      `<ul class="explorer-folders">${folders.map((node) => renderExplorerNode(node, basePath, currentRelPath)).join("")}</ul>`,
    );
  }
  if (notes.length > 0) {
    parts.push(
      `<ul class="explorer-notes">${notes.map((node) => renderExplorerNode(node, basePath, currentRelPath)).join("")}</ul>`,
    );
  }

  return parts.join("");
}

function renderExplorerNode(
  node: ExplorerNode,
  basePath: string,
  currentRelPath?: string,
): string {
  if (node.type === "file") {
    const href = withBasePath(basePath, `/${node.href}`);
    const isCurrent = currentRelPath !== undefined && node.path === currentRelPath;
    const className = isCurrent ? "explorer-file explorer-current" : "explorer-file";
    const ariaCurrent = isCurrent ? ' aria-current="page"' : "";
    return `<li class="${className}" data-explorer-path="${escapeAttr(node.path)}"><a href="${href}"${ariaCurrent}>${escapeHtml(node.name)}</a></li>`;
  }

  const children = node.children ?? [];
  const isActiveFolder =
    currentRelPath !== undefined && currentRelPath.startsWith(`${node.path}/`);
  const className = isActiveFolder
    ? "explorer-folder explorer-active-folder"
    : "explorer-folder";
  return `<li class="${className}">
  <details data-folder-path="${escapeAttr(node.path)}">
    <summary>
      <span class="explorer-chevron">
        <svg class="chevron" viewBox="0 0 7.5 3.75" aria-hidden="true"><path d="M0.4 0.4 L3.75 3.35 L7.1 0.4"/></svg>
      </span>
      <span class="explorer-folder-name">${escapeHtml(node.name)}</span>
    </summary>
    <ul>
${children.map((child) => renderExplorerNode(child, basePath, currentRelPath)).join("\n")}
    </ul>
  </details>
</li>`;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
import type { ExplorerNode } from "../domain/explorer.js";
import { withBasePath } from "../../basePath.js";

export function renderExplorer(nodes: ExplorerNode[], basePath = ""): string {
  return `<ul>${nodes.map((node) => renderExplorerNode(node, basePath)).join("")}</ul>`;
}

function renderExplorerNode(node: ExplorerNode, basePath: string): string {
  if (node.type === "file") {
    const href = withBasePath(basePath, `/${node.href}`);
    return `<li class="explorer-file"><a href="${href}">${escapeHtml(node.name)}</a></li>`;
  }

  const children = node.children ?? [];
  return `<li class="explorer-folder">
  <details>
    <summary>
      <span class="explorer-chevron">▶</span>
      <span class="explorer-folder-name">${escapeHtml(node.name)}</span>
    </summary>
    <ul>
${children.map((child) => renderExplorerNode(child, basePath)).join("\n")}
    </ul>
  </details>
</li>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
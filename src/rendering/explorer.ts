import type { ExplorerNode } from "../domain/explorer.js";

export function renderExplorer(nodes: ExplorerNode[], basePath = ""): string {
  return `<ul>${nodes.map((node) => renderExplorerNode(node, basePath)).join("")}</ul>`;
}

function renderExplorerNode(node: ExplorerNode, basePath: string): string {
  const basePrefix = basePath.replace(/\/$/, "");

  if (node.type === "file") {
    return `<li class="explorer-file"><a href="${basePrefix}/${node.href}">${escapeHtml(node.name)}</a></li>`;
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
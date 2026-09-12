import fs from "node:fs";
import path from "node:path";
import { getSlug, getTitle } from "../../util.js";
import type { ExplorerNode } from "../domain/explorer.js";

export function buildExplorerTree(rootDir: string, relativePath = ""): ExplorerNode[] {
  const fullPath = path.join(rootDir, relativePath);
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  const nodes: ExplorerNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const entryRelPath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      const children = buildExplorerTree(rootDir, entryRelPath);
      if (children.length === 0) continue;

      nodes.push({
        name: entry.name,
        path: entryRelPath,
        type: "folder",
        children,
      });
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const href = entryRelPath.replace(/\.md$/, ".html").replace(/\\/g, "/");
      nodes.push({
        name: getTitle(entry.name),
        slug: getSlug(entry.name),
        href,
        path: entryRelPath,
        type: "file",
      });
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}
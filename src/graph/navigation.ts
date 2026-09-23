import { compareByteOrder, getSlug, getTitle, toHtmlPath } from "../../util.js";
import type { LoadedContent } from "../content/loader.js";
import type { ExplorerNode } from "../domain/explorer.js";

export function buildExplorerTree(contents: LoadedContent[]): ExplorerNode[] {
  return buildDirectory(
    contents
      .map((content) => content.relPath)
      .filter((relPath) => !hasDotSegment(relPath))
      .sort(compareByteOrder),
    "",
  );
}

function hasDotSegment(relPath: string): boolean {
  return relPath.split(/[\\/]/).some((segment) => segment.startsWith("."));
}

function buildDirectory(relPaths: string[], folderPath: string): ExplorerNode[] {
  const groups: Record<string, string[]> = {};

  for (const relPath of relPaths) {
    const segments = relPath.split(/[\\/]/);
    const first = segments[0] ?? relPath;
    const rest = segments.slice(1);
    if (!groups[first]) {
      groups[first] = [];
    }
    if (rest.length > 0) {
      groups[first]!.push(rest.join("/"));
    }
  }

  const entries = Object.entries(groups).sort(([na], [nb]) => {
    const aFolder = groups[na]!.length > 0;
    const bFolder = groups[nb]!.length > 0;
    if (aFolder !== bFolder) return aFolder ? -1 : 1;
    return compareByteOrder(na, nb);
  });

  return entries.flatMap(([name, restPaths]) => {
    const fullPath = folderPath ? `${folderPath}/${name}` : name;

    if (restPaths.length === 0) {
      return {
        name: getTitle(name),
        slug: getSlug(name),
        href: toHtmlPath(fullPath),
        path: fullPath,
        type: "file",
      } as ExplorerNode;
    }

    const childNodes = buildDirectory(restPaths, fullPath);
    if (childNodes.length === 0) {
      return [];
    }

    return {
      name,
      path: fullPath,
      type: "folder",
      children: childNodes,
    } as ExplorerNode;
  });
}
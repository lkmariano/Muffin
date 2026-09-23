import { visit } from "unist-util-visit";
import { getTitle } from "../../util.js";
import { wikilinkToUrl } from "../../plugins/wikilinks.js";

import type { ParsedMarkdown } from "../content/markdown.js";
import type { Backlink } from "../domain/page.js";
import type { SiteGraph } from "../domain/siteGraph.js";

// Source and forward-link graph keys are root-relative relPaths (canonical page
// identity), so duplicate basenames in different directories stay distinct.
export async function buildSiteGraph(
  parsed: ParsedMarkdown[],
): Promise<SiteGraph> {
  const forwardLinks: Record<string, string[]> = {};

  for (const { relPath, tree } of parsed) {
    const targets: string[] = [];
    visit(tree, "link", (node: any) => {
      if (!node.data || !node.data.isWikilink) {
        return;
      }
      targets.push(node.url);
    });
    forwardLinks[relPath] = targets;
  }

  const backlinks: Record<string, string[]> = {};
  for (const [source, targets] of Object.entries(forwardLinks)) {
    for (const target of targets) {
      if (!backlinks[target]) {
        backlinks[target] = [];
      }
      if (!backlinks[target].includes(source)) {
        backlinks[target].push(source);
      }
    }
  }

  return {
    forwardLinks,
    backlinks,
  };
}

// Resolves a page's backlink sources by relPath directly. The graph stores
// source relPaths (not slugs), so a backlink always points at the actual
// source page, never the first page sharing its basename.
export function resolveBacklinks(
  graph: SiteGraph,
  relPath: string,
): Backlink[] {
  return (graph.backlinks[relPath] ?? []).map((sourceRelPath) => ({
    title: getTitle(sourceRelPath),
    href: wikilinkToUrl(sourceRelPath),
  }));
}
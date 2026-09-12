import { visit } from "unist-util-visit";
import { getSlug, getTitle } from "../../util.js";
import { wikilinkToUrl } from "../../plugins/wikilinks.js";

import type { ParsedMarkdown } from "../content/markdown.js";
import type { Backlink } from "../domain/page.js";
import type { SiteGraph } from "../domain/siteGraph.js";

export async function buildSiteGraph(
  parsed: ParsedMarkdown[],
): Promise<SiteGraph> {
  const forwardLinks: Record<string, string[]> = {};

  for (const { path, tree } of parsed) {
    const targets: string[] = [];
    visit(tree, "link", (node: any) => {
      if (!node.data || !node.data.isWikilink) {
        return;
      }
      targets.push(getSlug(node.url));
    });
    forwardLinks[getSlug(path)] = targets;
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

export function resolveBacklinks(
  graph: SiteGraph,
  slug: string,
  slugMap: Record<string, string[]>,
): Backlink[] {
  return (graph.backlinks[slug] ?? [])
    .map((sourceSlug) => slugMap[sourceSlug]?.[0])
    .filter((filePath): filePath is string => typeof filePath === "string")
    .map((filePath) => ({
      title: getTitle(filePath),
      href: wikilinkToUrl(filePath),
    }));
}
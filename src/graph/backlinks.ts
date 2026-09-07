import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { getSlug, getTitle } from "../../util.js";
import { withBasePath } from "../../basePath.js";
import { wikilinkPlugin } from "../../plugins/wikilinks.js";

export interface ResolvedBacklink {
  title: string;
  href: string;
}

export interface SiteLinkGraph {
  forwardLinks: Record<string, string[]>;
  backlinks: Record<string, string[]>;
  getBacklinks(slug: string): ResolvedBacklink[];
}

async function extractWikilinkTargets(
  filePath: string,
  slugMap: Record<string, string[]>,
): Promise<string[]> {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const matterData = matter(fileContent);

  const linkExtractor = unified()
    .use(remarkParse)
    .use(wikilinkPlugin, slugMap, filePath);

  const linkTree = linkExtractor.parse(matterData.content);
  const transformedLinkTree = await linkExtractor.run(linkTree);

  const targets: string[] = [];
  visit(transformedLinkTree, "link", (node: any) => {
    if (!node.data || !node.data.isWikilink) {
      return;
    }
    const targetSlug = getSlug(node.url.replace(/\.html$/, ".md"));
    targets.push(targetSlug);
  });

  return targets;
}

export async function buildSiteGraph(
  markdownFiles: string[],
  slugMap: Record<string, string[]>,
): Promise<SiteLinkGraph> {
  const forwardLinks: Record<string, string[]> = {};

  for (const file of markdownFiles) {
    const sourceSlug = getSlug(file);
    forwardLinks[sourceSlug] = await extractWikilinkTargets(file, slugMap);
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

  function getBacklinks(slug: string): ResolvedBacklink[] {
    return (backlinks[slug] ?? [])
      .map((sourceSlug) => slugMap[sourceSlug]?.[0])
      .filter((filePath): filePath is string => typeof filePath === "string")
      .map((filePath) => ({
        title: getTitle(filePath),
        href: withBasePath(`/${path.relative("./content", filePath).replace(/\.md$/, ".html").replace(/\\/g, "/")}`),
      }));
  }

  return {
    forwardLinks,
    backlinks,
    getBacklinks,
  };
}

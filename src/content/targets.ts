import { visit } from "unist-util-visit";
import { getSlug } from "../../util.js";
import { headingSlug, nodeText } from "./anchors.js";

import type { ReferenceFragment } from "./anchors.js";
import type { ParsedMarkdown } from "./markdown.js";

// Per-page reference targets. Separate from SiteGraph (page-to-page
// relationships): this answers where a reference points within a page.
export type PageTargetIndex = {
  // slugged heading text → that heading's emitted anchor id
  headings: Record<string, string>;
  // logical block id (no leading `^`) → emitted anchor id (`^<id>`)
  blocks: Record<string, string>;
};

export type TargetIndex = Record<string, PageTargetIndex>;

export function buildTargetIndex(parsed: ParsedMarkdown[]): TargetIndex {
  const index: TargetIndex = {};

  for (const { path, tree } of parsed) {
    const headings: Record<string, string> = {};
    visit(tree, "heading", (node: any) => {
      const anchor = node.data?.headingId;
      if (typeof anchor !== "string" || anchor === "") {
        return;
      }
      const key = headingSlug(nodeText(node));
      if (!(key in headings)) {
        headings[key] = anchor;
      }
    });

    const blocks: Record<string, string> = {};
    visit(tree, (node: any) => {
      const logicalId = node.data?.blockId;
      if (typeof logicalId !== "string" || logicalId === "") {
        return;
      }
      if (!(logicalId in blocks)) {
        blocks[logicalId] = `^${logicalId}`;
      }
    });

    index[getSlug(path)] = { headings, blocks };
  }

  return index;
}

// Resolves a reference fragment against one page's targets. Unresolved
// fragments are preserved: they fall back to the normalized fragment (the same
// slug/anchor that an existing target would produce).
export function resolveFragmentAnchor(
  page: PageTargetIndex | undefined,
  fragment: ReferenceFragment,
): string {
  if (fragment.type === "block") {
    return page?.blocks[fragment.text] ?? `^${fragment.text}`;
  }
  const key = headingSlug(fragment.text);
  return page?.headings[key] ?? key;
}

// Attaches the final URL fragment (`data.finalFragment`, including the `#`) to
// every wikilink that carries a raw fragment target. Runs over the shared
// parsed trees after the target index is built and before rendering, so the
// renderer only consumes pre-resolved information.
export function resolveReferenceFragments(parsed: ParsedMarkdown[], index: TargetIndex): void {
  for (const { tree } of parsed) {
    visit(tree, "link", (node: any) => {
      const fragment = node.data?.fragmentTarget;
      if (!node.data?.isWikilink || fragment === undefined) {
        return;
      }
      const targetSlug = getSlug(node.url);
      const anchor = resolveFragmentAnchor(index[targetSlug], fragment);
      node.data.finalFragment = `#${anchor}`;
    });
  }
}
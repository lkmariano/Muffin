import { toString } from "mdast-util-to-string";

import type { TocEntry } from "../domain/page.js";
import type { Root } from "mdast";

const MAX_TOC_DEPTH = 3;

// Build-time TOC data extraction. Walks only the root's direct children and
// pulls the heading IDs assigned by the heading-ID pipeline — it never
// generates, normalizes, or deduplicates IDs, never produces hrefs, and never
// touches the HTML. Runs before rendering mutates the shared AST.
export function extractToc(tree: Root): TocEntry[] {
  const entries: TocEntry[] = [];

  for (const child of tree.children) {
    if (child.type !== "heading") {
      continue;
    }
    if (child.depth > MAX_TOC_DEPTH) {
      continue;
    }
    const data = child.data as Record<string, unknown> | undefined;
    entries.push({
      depth: child.depth,
      text: toString(child),
      id: typeof data?.headingId === "string" ? data.headingId : "",
    });
  }

  return entries;
}
import { visit } from "unist-util-visit";

import type { Root } from "mdast";

export type ReferenceFragment = {
  type: "heading" | "block";
  text: string;
};

const BLOCK_ID_PATTERN = /\s+\^([A-Za-z0-9_-]+)\s*$/;

// Heading anchors use Obsidian/GitHub-style slugging:
// 1. Lowercase (Unicode-aware).
// 2. Remove every character that is not a Unicode letter, digit, or whitespace.
// 3. Collapse whitespace runs to a single hyphen.
// 4. Trim leading/trailing hyphens.
// 5. When nothing remains, fall back to the raw heading text.
// Duplicate headings are disambiguated in document order with -1, -2, ... by
// the callers (see assignHeadingIds / buildTargetIndex).
export function headingSlug(text: string): string {
  let out = "";
  for (const char of text.toLowerCase()) {
    if (/[\p{L}\p{N}]/u.test(char)) {
      out += char;
    } else if (/\s/u.test(char)) {
      out += " ";
    }
  }
  const slug = out.trim().replace(/\s+/g, "-");
  return slug === "" ? text : slug;
}

// The leading `^` on block references lives only in the emitted HTML
// anchor/reference fragment; internally block ids are kept without it.
export function normalizeReferenceFragment(fragment: ReferenceFragment): string {
  if (fragment.type === "block") {
    return `^${fragment.text}`;
  }
  return headingSlug(fragment.text);
}

export function nodeText(node: Node | undefined): string {
  if (!node || typeof node !== "object") {
    return "";
  }
  const mdastNode = node as any;
  if (mdastNode.type === "text") {
    return typeof mdastNode.value === "string" ? mdastNode.value : "";
  }
  const children: Node[] = Array.isArray(mdastNode.children) ? mdastNode.children : [];
  return children.map((child) => nodeText(child)).join("");
}

// Assigns a deterministic id to every heading in document order. Duplicate
// slugs get -1, -2, ... suffixes. The id is stored on the node so the renderer
// emits it directly (via `data.hProperties`).
export function assignHeadingIds(tree: Root): void {
  const counts = new Map<string, number>();
  visit(tree, "heading", (node: any) => {
    const base = headingSlug(nodeText(node));
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count}`;
    node.data = {
      ...(node.data ?? {}),
      headingId: id,
      hProperties: { ...(node.data?.hProperties ?? {}), id },
    };
  });
}

export function headingIdPlugin(): (tree: Root) => void {
  return (tree: Root): void => {
    assignHeadingIds(tree);
  };
}

// Recognizes Obsidian-style trailing block ids (`This is a paragraph. ^my-block`).
// The marker is stripped from the text; the logical id (no leading `^`) is kept
// on the node and the HTML anchor is emitted as `^id`. On list items the anchor
// is placed on the <li> (tight lists unwrap the inner paragraph). The first
// occurrence of a block id in a document wins; later duplicates are stripped
// from the text but become no resolvable target.
export function assignBlockIds(tree: Root): void {
  const claimed = new Set<string>();
  visit(tree, "paragraph", (node: any, _index: number | undefined, parent: any) => {
    const children: any[] = node.children ?? [];
    const last = children[children.length - 1];
    if (!last || last.type !== "text") {
      return;
    }
    const value: string = typeof last.value === "string" ? last.value : "";
    const match = BLOCK_ID_PATTERN.exec(value);
    if (!match) {
      return;
    }
    const logicalId = match[1];
    if (logicalId === undefined) {
      return;
    }
    const remainder = value.slice(0, match.index);
    if (remainder === "") {
      children.splice(children.indexOf(last), 1);
    } else {
      last.value = remainder;
    }
    if (claimed.has(logicalId)) {
      return;
    }
    claimed.add(logicalId);
    const carrier = parent && parent.type === "listItem" ? parent : node;
    if (carrier.data?.blockId !== undefined) {
      return;
    }
    carrier.data = {
      ...(carrier.data ?? {}),
      blockId: logicalId,
      hProperties: { ...(carrier.data?.hProperties ?? {}), id: `^${logicalId}` },
    };
  });
}

export function blockIdPlugin(): (tree: Root) => void {
  return (tree: Root): void => {
    assignBlockIds(tree);
  };
}
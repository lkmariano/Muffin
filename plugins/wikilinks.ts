import { findAndReplace } from 'mdast-util-find-and-replace'
import path from 'node:path';
import { visit } from 'unist-util-visit';
import { getSlug, getTitle, toHtmlPath } from '../util.js';
import { withBasePath } from '../basePath.js';
import { normalizeReferenceFragment } from '../src/content/anchors.js';
import type { ReferenceFragment } from '../src/content/anchors.js';

export type WikilinkTarget = {
  page: string;
  fragment?: ReferenceFragment;
};

// Splits `[[target]]` into a page part and an optional fragment. `#` separates
// page from fragment (first occurrence); a `^` prefix marks a block reference:
// `[[note]]`, `[[note#Heading]]`, `[[note#^block-id]]`.
export function parseWikilinkTarget(rawTarget: string): WikilinkTarget {
  const hashIndex = rawTarget.indexOf('#');
  if (hashIndex === -1) {
    return { page: rawTarget };
  }
  const page = rawTarget.slice(0, hashIndex);
  const rawFragment = rawTarget.slice(hashIndex + 1);
  if (rawFragment === '') {
    return { page };
  }
  if (rawFragment.startsWith('^') && rawFragment.length > 1) {
    return { page, fragment: { type: 'block', text: rawFragment.slice(1) } };
  }
  return { page, fragment: { type: 'heading', text: rawFragment } };
}

export function wikilinkPlugin(
  slugsMap: Record<string, string[]>,
  currentFile: string,
  aliasMap: Record<string, string[]> = {},
): (tree: any) => void {
  return (tree: any): void => {
    findAndReplace(tree, [
      /\[{2}(.+?)\]{2}/g,
      (value: string, capturedText: string) => {
        const [rawTargetPart, rawDisplay] = capturedText.split('|');
        const rawTarget: string = rawTargetPart ?? capturedText;
        const parsedTarget = parseWikilinkTarget(rawTarget);
        const slug = getSlug(parsedTarget.page);
        const resolved = resolveWikilink(currentFile, slug, slugsMap, aliasMap);

        if (resolved) {
          const displayForFragment = (fragment: ReferenceFragment): string =>
            fragment.type === 'block' ? `^${fragment.text}` : fragment.text;
          const displayText: string =
            rawDisplay ??
            (parsedTarget.fragment ? displayForFragment(parsedTarget.fragment) : getTitle(resolved));

          const data: any = { isWikilink: true };
          if (parsedTarget.fragment) {
            data.fragmentTarget = parsedTarget.fragment;
          }

          return {
            type: 'link',
            url: resolved,
            children: [{ type: 'text', value: displayText }],
            data,
          } as any;
        } else {
          return {
            type: 'text',
            value: rawDisplay ?? rawTarget,
          } as any;
        }
      },
    ]);
  };
}

export function wikilinkToUrl(relPath: string): string {
  return withBasePath(`/${toHtmlPath(relPath)}`);
}

export function wikilinkToUrlPlugin(): (tree: any) => void {
  return (tree: any): void => {
    visit(tree, "link", (node: any) => {
      if (!node.data || !node.data.isWikilink) {
        return;
      }
      const baseUrl = wikilinkToUrl(node.url);
      // Rendering consumes pre-resolved fragments from the target index. The
      // fallback normalizes a raw fragment only when no resolution pass ran
      // (e.g. the test-only renderMarkdown path); it never discovers targets.
      const fragment =
        node.data.finalFragment ??
        (node.data.fragmentTarget ? `#${normalizeReferenceFragment(node.data.fragmentTarget)}` : "");
      node.url = fragment === "" ? baseUrl : `${baseUrl}${fragment}`;
    });
  };
}

export function resolveWikilink(
  currentFile: string,
  slug: string,
  slugMap: Record<string, string[]>,
  aliasMap: Record<string, string[]> = {},
): string | undefined {
  // A real filename always wins over an alias: `[[Name]]` resolves through the
  // slug map when it has any candidate, and aliases are consulted only as a
  // fallback — an alias can never hijack a real page's name.
  const candidates = slugMap[slug] ?? aliasMap[slug];
  if (!candidates || candidates.length === 0) {
    return undefined;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  let folder = path.dirname(currentFile);
  while (true) {
    const candidateInFolder = candidates.find(candidate =>
      !path.relative(folder, candidate)
      .startsWith('..'));
    if (candidateInFolder) {
      return candidateInFolder;
    }
    const parentFolder = path.dirname(folder);
    if (parentFolder === folder) {
      break;
    }
    folder = parentFolder;
  }

  return candidates[0];
}
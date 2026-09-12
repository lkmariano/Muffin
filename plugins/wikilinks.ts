import { findAndReplace } from 'mdast-util-find-and-replace'
import path from 'node:path';
import { visit } from 'unist-util-visit';
import { getTitle } from '../util.js';
import { withBasePath } from '../basePath.js';

export function wikilinkPlugin(slugsMap: Record<string, string[]>, currentFile: string): (tree: any) => void {
  return (tree: any): void => {
    findAndReplace(tree, [
      /\[{2}(.+?)\]{2}/g,
      (value: string, capturedText: string) => {
        const [rawTargetPart, rawDisplay] = capturedText.split('|');
        const rawTarget: string = rawTargetPart ?? capturedText;
        const slug = rawTarget.toLowerCase().replace(/[\s_]+/g, '-');
        const resolved = resolveWikilink(currentFile, slug, slugsMap);
        const displayText: string = rawDisplay ?? (resolved ? getTitle(resolved) : rawTarget);

        if (resolved) {
          return {
            type: 'link',
            url: resolved,
            children: [{ type: 'text', value: displayText }],
            data: { isWikilink: true } as any,
          } as any;
        } else {
          return {
            type: 'text',
            value: displayText,
          } as any;
        }
      },
    ]);
  };
}

export function wikilinkToUrl(filePath: string): string {
  const relativePath = path.relative("./content", filePath).replace(/\.md$/, ".html").replace(/\\/g, "/");
  return withBasePath(`/${relativePath}`);
}

export function wikilinkToUrlPlugin(): (tree: any) => void {
  return (tree: any): void => {
    visit(tree, "link", (node: any) => {
      if (!node.data || !node.data.isWikilink) {
        return;
      }
      node.url = wikilinkToUrl(node.url);
    });
  };
}

export function resolveWikilink(currentFile: string, slug: string, slugMap: Record<string, string[]>): string | undefined {
  const candidates = slugMap[slug];
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
import { findAndReplace } from 'mdast-util-find-and-replace'
import path from 'path';
import { getTitle } from '../util.js';

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
          const relativePath = path.relative("./content", resolved).replace(/\.md$/, ".html").replace(/\\/g, "/");
          return {
            type: 'link',
            url: `/${relativePath}`,
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
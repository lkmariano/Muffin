import {findAndReplace} from 'mdast-util-find-and-replace'
import path from 'path';

export function wikilinkPlugin(slugsMap: Record<string, string[]>, currentFile: string): (tree: any) => void {
  return (tree: any): void => {
    findAndReplace(tree, [
      /\[{2}(.+?)\]{2}/g,
      (value: string, capturedText: string) => {
        const slug = capturedText.toLowerCase().replace(/\s+/g, '-');
        const resolved = resolveWikilink(currentFile, slug, slugsMap);
        if (resolved) {
          const relativePath = path.relative("./content", resolved).replace(/\.md$/, ".html").replace(/\\/g, "/");
          return {
            type: 'link',
            url: `/${relativePath}`,
            children: [{ type: 'text', value: capturedText }],
          };
        } else {
          return {
            type: 'text',
            value: capturedText,
          };
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
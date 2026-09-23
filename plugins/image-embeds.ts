import path from "node:path";
import { findAndReplace } from "mdast-util-find-and-replace";
import { visit } from "unist-util-visit";
import { withBasePath } from "../basePath.js";

const IMAGE_EMBED_PATTERN = /!\[{2}(.+?)\]{2}/g;

const SUPPORTED_IMAGE_FORMAT = /\.(png|jpe?g|gif|webp|svg)$/i;
const SUPPORTED_PDF_FORMAT = /\.pdf$/i;

export function isSupportedImageFormat(relPath: string): boolean {
  return SUPPORTED_IMAGE_FORMAT.test(relPath);
}

export function isSupportedPdfFormat(relPath: string): boolean {
  return SUPPORTED_PDF_FORMAT.test(relPath);
}

export function assetUrl(relPath: string): string {
  return withBasePath(`/${relPath.replace(/\\/g, "/")}`);
}

export function resolveImageEmbed(
  currentFile: string,
  target: string,
  assetPaths: string[],
): string | undefined {
  const normalizedTarget = target.replace(/\\/g, "/");

  const exact = assetPaths.find(
    (assetPath) => assetPath.replace(/\\/g, "/") === normalizedTarget,
  );
  if (exact) {
    return exact;
  }

  const targetBase = (normalizedTarget.split("/").pop() ?? target).toLowerCase();
  const candidates = assetPaths.filter(
    (assetPath) => path.basename(assetPath).toLowerCase() === targetBase,
  );
  if (candidates.length === 0) {
    return undefined;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }

  let folder = path.dirname(currentFile);
  while (true) {
    const candidateInFolder = candidates.find((candidate) =>
      !path.relative(folder, path.dirname(candidate)).startsWith(".."),
    );
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

export function imageEmbedAlt(resolved: string): string {
  return path.basename(resolved).replace(/\.[^.]+$/, "");
}

export function imageEmbedPlugin(
  assetPaths: string[],
  currentFile: string,
): (tree: any) => void {
  return (tree: any): void => {
    findAndReplace(tree, [
      [
        IMAGE_EMBED_PATTERN,
        (value: string, capturedText: string) => {
          const [targetPart, sizePart] = capturedText.split("|");
          const target = targetPart ?? capturedText;
          const resolved = resolveImageEmbed(currentFile, target, assetPaths);

          if (!resolved || (!isSupportedImageFormat(resolved) && !isSupportedPdfFormat(resolved))) {
            return {
              type: "image",
              url: target,
              alt: target,
              data: {
                isImageEmbed: true,
                isUnresolvedEmbed: true,
                embedText: value,
              } as any,
            } as any;
          }

          if (isSupportedPdfFormat(resolved)) {
            return {
              type: "pdf",
              url: resolved,
              data: { isPdfEmbed: true } as any,
            } as any;
          }

          const imageNode: any = {
            type: "image",
            url: resolved,
            alt: imageEmbedAlt(resolved),
            data: { isImageEmbed: true } as any,
          };

          if (sizePart !== undefined && /^\d+$/.test(sizePart)) {
            imageNode.data.hProperties = { width: Number(sizePart) };
          }

          return imageNode;
        },
      ],
    ]);
  };
}

export function imageEmbedUrlPlugin(): (tree: any) => void {
  return (tree: any): void => {
    visit(tree, "image", (node: any, index: number | undefined, parent: any) => {
      if (!node.data || !node.data.isImageEmbed) {
        return;
      }
      if (node.data.isUnresolvedEmbed) {
        if (parent && typeof index === "number") {
          parent.children.splice(index, 1, { type: "text", value: node.data.embedText });
        }
        return;
      }
      node.url = assetUrl(node.url);
    });
    visit(tree, "pdf", (node: any) => {
      if (!node.data || !node.data.isPdfEmbed) {
        return;
      }
      node.url = assetUrl(node.url);
    });
  };
}
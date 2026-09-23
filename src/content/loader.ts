import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import mm from "micromatch";
import { getSlug } from "../../util.js";

const ASSET_EXTENSION_PATTERN = /\.(png|jpe?g|gif|webp|svg|pdf)$/i;

export type LoadedContent = {
  path: string;
  relPath: string;
  frontmatter: Record<string, unknown>;
  body: string;
  mtime: Date;
};

export type LoadedAsset = {
  path: string;
  relPath: string;
};

export type LoadedContentResult = {
  contents: LoadedContent[];
  assets: LoadedAsset[];
  slugMap: Record<string, string[]>;
};

export type FilePredicate = (name: string) => boolean;

export function isMarkdownFile(name: string): boolean {
  return name.endsWith(".md");
}

export function isAssetFile(name: string): boolean {
  return ASSET_EXTENSION_PATTERN.test(name);
}

export async function getFiles(
  directory: string,
  predicate: FilePredicate,
): Promise<string[]> {
  const files: string[] = [];
  const contentDirectory = fs.readdirSync(directory, { withFileTypes: true });

  for (const dirent of contentDirectory) {
    const fullPath = path.join(directory, dirent.name);
    if (dirent.isDirectory()) {
      const nestedFiles = await getFiles(fullPath, predicate);
      files.push(...nestedFiles);
    } else if (dirent.isFile() && predicate(dirent.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function getMarkdownFiles(directory: string): Promise<string[]> {
  return getFiles(directory, isMarkdownFile);
}

function requireRelPath(directory: string, file: string): string {
  const relPath = path.relative(directory, file);
  const firstSegment = relPath.split(path.sep)[0];
  if (
    !relPath ||
    relPath === "." ||
    path.isAbsolute(relPath) ||
    firstSegment === ".."
  ) {
    throw new Error(
      `Cannot derive a valid relative path for "${file}" from content root "${directory}".`,
    );
  }
  return relPath;
}

function isExcluded(exclude: string[], relPath: string): boolean {
  if (exclude.length === 0) {
    return false;
  }
  const normalized = relPath.replace(/\\/g, "/");
  return mm.isMatch(normalized, exclude, { dot: true });
}

// Locale-independent byte order so output is reproducible on any filesystem.
function comparePaths(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortByRelPath(directory: string, files: string[]): string[] {
  return files
    .map((file) => ({ file, relPath: requireRelPath(directory, file) }))
    .sort((a, b) => comparePaths(a.relPath, b.relPath))
    .map((entry) => entry.file);
}

export async function loadContent(
  directory: string,
  exclude: string[] = [],
): Promise<LoadedContentResult> {
  const markdownFiles = sortByRelPath(
    directory,
    (await getMarkdownFiles(directory)).filter(
      (file) => !isExcluded(exclude, requireRelPath(directory, file)),
    ),
  );
  const assetFiles = sortByRelPath(
    directory,
    (await getFiles(directory, isAssetFile)).filter(
      (file) => !isExcluded(exclude, requireRelPath(directory, file)),
    ),
  );

  const slugMap: Record<string, string[]> = {};

  const contents: LoadedContent[] = markdownFiles.map((file) => {
    const slug = getSlug(file);
    const relPath = requireRelPath(directory, file);

    if (!slugMap[slug]) {
      slugMap[slug] = [];
    }

    slugMap[slug].push(relPath);

    const raw = fs.readFileSync(file, "utf-8");
    const { data, content } = matter(raw);
    const mtime = fs.statSync(file).mtime;

    return {
      path: file,
      relPath,
      frontmatter: data as Record<string, unknown>,
      body: content,
      mtime,
    };
  });

  const assets: LoadedAsset[] = assetFiles.map((file) => ({
    path: file,
    relPath: requireRelPath(directory, file),
  }));

  return { contents, assets, slugMap };
}
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import mm from "micromatch";
import { normalizeAliases } from "./frontmatter.js";
import { compareByteOrder, getSlug } from "../../util.js";

const ASSET_EXTENSION_PATTERN = /\.(png|jpe?g|gif|webp|svg|pdf)$/i;

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---(\r?\n|$)/;
const HASH_TAG_BLOCK_ITEM_RE = /^(\s*-\s+)#(\S.*)$/gm;
const HASH_TAG_FLOW_ITEM_RE = /(\[\s*|,\s*)#([^\s,\]]+)/g;
const HASH_TAG_SCALAR_RE = /^(\s*[\w.-]+:\s+)#(\S.*)$/gm;

// Obsidian frontmatter writes tags with a leading hash (`- #tag`,
// `[#a, #b]`, `tags: #tag`). Strict YAML reads `#` as a comment — dropping
// items or throwing inside flow collections — so hash-prefixed scalars are
// quoted before parsing. Files without a leading standard frontmatter block
// pass through.
function quoteObsidianTags(yaml: string): string {
  return yaml
    .replace(HASH_TAG_FLOW_ITEM_RE, '$1"#$2"')
    .replace(HASH_TAG_BLOCK_ITEM_RE, '$1"#$2"')
    .replace(HASH_TAG_SCALAR_RE, '$1"#$2"');
}

function withQuotedHashTagItems(raw: string): string {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) return raw;
  const frontmatter = quoteObsidianTags(match[1] ?? "");
  return `---\n${frontmatter}\n---${match[2] ?? ""}${raw.slice(match[0]?.length ?? 0)}`;
}

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
  aliasMap: Record<string, string[]>;
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
  return compareByteOrder(a, b);
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
  const aliasMap: Record<string, string[]> = {};

  const contents: LoadedContent[] = markdownFiles.map((file) => {
    const slug = getSlug(file);
    const relPath = requireRelPath(directory, file);

    if (!slugMap[slug]) {
      slugMap[slug] = [];
    }

    slugMap[slug].push(relPath);

    const raw = fs.readFileSync(file, "utf-8");
    const { data, content } = matter(withQuotedHashTagItems(raw));
    const mtime = fs.statSync(file).mtime;

    for (const alias of normalizeAliases(data as Record<string, unknown>)) {
      const aliasSlug = getSlug(alias);
      if (!aliasMap[aliasSlug]) {
        aliasMap[aliasSlug] = [];
      }
      aliasMap[aliasSlug]!.push(relPath);
    }

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

  return { contents, assets, slugMap, aliasMap };
}
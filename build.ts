import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatDate, getSlug } from "./util.js";
import { resolveSiteUrl, withBasePath } from "./basePath.js";
import { buildExplorerTree } from "./src/graph/navigation.js";
import { renderExplorer } from "./src/rendering/explorer.js";
import type { LoadedAsset, LoadedContent } from "./src/content/loader.js";
import { loadContent } from "./src/content/loader.js";
import { normalizeTags, resolvePageTitle } from "./src/content/frontmatter.js";
import { containsMath, parseMarkdown, renderMarkdownTree } from "./src/content/markdown.js";
import { extractToc } from "./src/content/toc.js";
import { buildTargetIndex, resolveReferenceFragments } from "./src/content/targets.js";
import { buildSiteGraph, resolveBacklinks } from "./src/graph/backlinks.js";
import { writePages } from "./src/output/writer.js";
import {
  copyAssets,
  copyPublicAssets,
  writeStaticAssets,
  writeSyndication,
} from "./src/output/assets.js";
import { renderRssFeed, renderSitemap } from "./src/output/syndication.js";
import { loadPageTemplate } from "./src/output/templates.js";
import { renderSitePage } from "./src/presentation/renderSitePage.js";
import { createPresentationContext } from "./src/rendering/context.js";
import type { PageRenderer } from "./src/rendering/context.js";
import {
  CONTENT_DIRECTORY,
  EXCLUDE_GLOBS,
  HOMEPAGE,
  OUTPUT_DIRECTORY,
  SITE,
} from "./src/site.js";
import type { Page } from "./src/domain/page.js";
import type { Root } from "mdast";

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(PROJECT_ROOT, CONTENT_DIRECTORY);
const OUTPUT_DIR = path.resolve(PROJECT_ROOT, OUTPUT_DIRECTORY);

/**
 * The reusable Content → Page boundary.
 *
 * Performs discovery, parsing, graph construction, TOC extraction, backlink
 * resolution, and markdown rendering, returning fully assembled `Page` objects
 * (metadata, content HTML, TOC, backlinks, paths, title) plus the loaded
 * contents/assets and the site-wide math flag for downstream writing. It never
 * writes to disk. Consumers get the assembled model, not AST/pipeline state;
 * path selection comes from the compile-time constants in `src/site.ts`.
 */
export interface AssembleResult {
  pages: Page[];
  contents: LoadedContent[];
  assets: LoadedAsset[];
  hasMath: boolean;
}

export async function assemblePages(): Promise<AssembleResult> {
  const { contents, assets, slugMap } = await loadContent(CONTENT_DIR, EXCLUDE_GLOBS);
  const pages: Page[] = [];

  const assetPaths = assets.map((asset) => asset.relPath);

  const trees: Record<string, Root> = {};
  let hasMath = false;
  for (const content of contents) {
    trees[content.path] = await parseMarkdown(
      content.body,
      slugMap,
      content.relPath,
      assetPaths,
    );
    if (containsMath(trees[content.path]!)) {
      hasMath = true;
    }
  }

  const parsed = contents.map((content) => ({
    path: content.path,
    relPath: content.relPath,
    tree: trees[content.path]!,
  }));
  const targetIndex = buildTargetIndex(parsed);
  resolveReferenceFragments(parsed, targetIndex);

  const graph = await buildSiteGraph(parsed);

  for (const content of contents) {
    const slug = getSlug(content.path);
    const statusValue = content.frontmatter.status;
    const tree = trees[content.path]!;

    pages.push({
      path: content.path,
      relPath: content.relPath,
      slug,
      title: resolvePageTitle(content.frontmatter, content.path),
      metadata: {
        frontmatter: content.frontmatter,
        ...(typeof statusValue === "string" ? { status: statusValue } : {}),
        updated: formatDate(content.mtime),
        tags: normalizeTags(content.frontmatter.tags),
      },
      // TOC extraction must run before rendering mutates the shared AST.
      toc: extractToc(tree),
      content: await renderMarkdownTree(tree),
      backlinks: resolveBacklinks(graph, content.relPath),
    });
  }

  return { pages, contents, assets, hasMath };
}

export interface BuildOptions {
  /** Per-page renderer; defaults to Muffin's shipped `renderSitePage`. */
  renderer?: PageRenderer;
}

/**
 * Muffin's high-level build command: assembles pages, then renders each page
 * through the supplied renderer (default `renderSitePage`) and writes pages,
 * static assets, syndication, vault assets, and the public/ passthrough.
 */
export async function build(options: BuildOptions = {}): Promise<void> {
  console.log("Parsing markdown files...");
  const origin = resolveSiteUrl(SITE.url ?? "");
  try {
    const { pages, contents, assets, hasMath } = await assemblePages();

    if (pages.length === 0) {
      console.log("No pages found to render.");
    } else {
      const explorerTree = buildExplorerTree(contents);
      const template = loadPageTemplate();
      const rssHref = origin === "" ? "" : origin + withBasePath("/feed.xml");
      const renderer = options.renderer ?? renderSitePage;
      const outputPages = pages.map((page) => {
        const explorerHtml = renderExplorer(explorerTree, page.relPath);
        return {
          path: page.path,
          renderedHtml: renderer(
            createPresentationContext(page, SITE, explorerHtml, { hasMath, rssHref }),
            template,
          ),
        };
      });
      writePages(outputPages, {
        homepage: HOMEPAGE,
        contentRoot: CONTENT_DIR,
        outputRoot: OUTPUT_DIR,
      });
      writeStaticAssets({ outputRoot: OUTPUT_DIR, hasMath });
      writeSyndication({
        outputRoot: OUTPUT_DIR,
        feedXml: renderRssFeed(pages, origin),
        sitemapXml: renderSitemap(pages, origin),
      });
    }
    copyAssets(assets, { outputRoot: OUTPUT_DIR });
    copyPublicAssets(path.join(PROJECT_ROOT, "public"), { outputRoot: OUTPUT_DIR });
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await build();
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMainModule) {
  main();
}
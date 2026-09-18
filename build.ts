import { formatDate, getSlug, getTitle } from "./util.js";
import { buildExplorerTree } from "./src/graph/navigation.js";
import { renderExplorer } from "./src/rendering/explorer.js";
import { loadContent } from "./src/content/loader.js";
import { containsMath, parseMarkdown, renderMarkdownTree } from "./src/content/markdown.js";
import { buildSiteGraph, resolveBacklinks } from "./src/graph/backlinks.js";
import { writePages } from "./src/output/writer.js";
import { copyAssets, writeStaticAssets } from "./src/output/assets.js";
import { loadPageTemplate } from "./src/output/templates.js";
import { renderPage } from "./src/rendering/page.js";
import { loadConfig } from "./src/config/loader.js";
import type { Page } from "./src/domain/page.js";
import type { Root } from "mdast";

async function parseFiles(
  contentDir: string,
  exclude: string[],
  basePath: string,
) {
  const { contents, assets, slugMap } = await loadContent(contentDir, exclude);
  const parsedData: Page[] = [];

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

  const graph = await buildSiteGraph(
    contents.map((content) => ({ path: content.path, tree: trees[content.path]! })),
  );

  for (const content of contents) {
    const slug = getSlug(content.path);
    const statusValue = content.frontmatter.status;

    parsedData.push({
      path: content.path,
      slug,
      title: getTitle(content.path),
      metadata: {
        frontmatter: content.frontmatter,
        ...(typeof statusValue === "string" ? { status: statusValue } : {}),
        updated: formatDate(content.mtime),
      },
      content: await renderMarkdownTree(trees[content.path]!, basePath),
      backlinks: resolveBacklinks(graph, slug, slugMap, basePath),
    });
  }

  return { parsedData, contents, assets, hasMath };
}

async function main(): Promise<void> {
  const config = await loadConfig();
  const outputRoot = config.output.directory;

  console.log("Parsing markdown files...");
  try {
    const { parsedData, contents, assets, hasMath } = await parseFiles(
      config.content.directory,
      config.content.exclude,
      config.site.basePath,
    );

    if (parsedData.length === 0) {
      console.log("No pages found to render.");
    } else {
      const explorerTree = buildExplorerTree(contents);
      const explorerHtml = renderExplorer(explorerTree, config.site.basePath);
      const template = loadPageTemplate();
      const outputPages = parsedData.map((page) => ({
        path: page.path,
        renderedHtml: renderPage(page, template, explorerHtml, config.site, config.site.basePath, { hasMath }),
      }));
      writePages(outputPages, {
        ...(config.homepage === undefined ? {} : { homepage: config.homepage }),
        contentRoot: config.content.directory,
        outputRoot,
      });
      writeStaticAssets(config.theme, { outputRoot, hasMath });
    }
    copyAssets(assets, { outputRoot });
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

main();
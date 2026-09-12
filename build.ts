import { formatDate, getSlug, getTitle } from "./util.js";
import { buildExplorerTree } from "./src/graph/navigation.js";
import { renderExplorer } from "./src/rendering/explorer.js";
import { loadContent } from "./src/content/loader.js";
import { parseMarkdown, renderMarkdownTree } from "./src/content/markdown.js";
import { buildSiteGraph, resolveBacklinks } from "./src/graph/backlinks.js";
import { writePages } from "./src/output/writer.js";
import { writeStaticAssets } from "./src/output/assets.js";
import { loadPageTemplate } from "./src/output/templates.js";
import { renderPage } from "./src/rendering/page.js";
import { loadConfig } from "./src/config/loader.js";
import { BASE_PATH } from "./basePath.js";
import type { Page } from "./src/domain/page.js";
import type { Root } from "mdast";

async function parseFiles() {
  const { contents, slugMap } = await loadContent("./content");
  const parsedData: Page[] = [];

  const trees: Record<string, Root> = {};
  for (const content of contents) {
    trees[content.path] = await parseMarkdown(content.body, slugMap, content.path);
  }

  const graph = await buildSiteGraph(
    contents.map((content) => ({ path: content.path, tree: trees[content.path]! })),
  );

  for (const content of contents) {
    const slug = getSlug(content.path);
    const statusValue = content.frontmatter.status;

    parsedData.push({
      path: content.path,
      title: getTitle(content.path),
      metadata: {
        frontmatter: content.frontmatter,
        ...(typeof statusValue === "string" ? { status: statusValue } : {}),
        updated: formatDate(content.mtime),
      },
      content: await renderMarkdownTree(trees[content.path]!),
      backlinks: resolveBacklinks(graph, slug, slugMap),
    });
  }

  return { parsedData, contents };
}

console.log("Parsing markdown files...");
parseFiles()
  .then(({ parsedData, contents }) => {
    if (parsedData.length === 0) {
      console.log("No pages found to render.");
      return;
    }
    const explorerTree = buildExplorerTree(contents);
    const explorerHtml = renderExplorer(explorerTree, BASE_PATH);
    const template = loadPageTemplate();
    const outputPages = parsedData.map((page) => ({
      path: page.path,
      renderedHtml: renderPage(page, template, explorerHtml, BASE_PATH),
    }));
    const config = loadConfig("./muffin.config.json");
    writePages(outputPages, config.homepage === undefined ? {} : { homepage: config.homepage });
    writeStaticAssets(config);
  })
  .catch((error) => {
    console.error("Build failed:", error);
    process.exit(1);
  });
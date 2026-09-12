import { formatDate, getSlug, getTitle } from "./util.js";
import { buildExplorerTree } from "./src/graph/navigation.js";
import { renderExplorer } from "./src/rendering/explorer.js";
import { getFileMeta, getMarkdownFiles } from "./src/content/loader.js";
import { renderMarkdown } from "./src/content/markdown.js";
import { buildSiteGraph, resolveBacklinks } from "./src/graph/backlinks.js";
import { writePages } from "./src/output/writer.js";
import { writeStaticAssets } from "./src/output/assets.js";
import { loadPageTemplate } from "./src/output/templates.js";
import { renderPage } from "./src/rendering/page.js";
import { loadConfig } from "./src/config/loader.js";
import { BASE_PATH } from "./basePath.js";
import fs from "node:fs";
import type { Page } from "./src/domain/page.js";

async function parseFiles() {
  const markdownFiles = await getMarkdownFiles("./content");
  const parsedData: Page[] = [];

  const slugMap: Record<string, string[]> = {};

  for (const file of markdownFiles) {
    const slug = getSlug(file);

    if (!slugMap[slug]) {
      slugMap[slug] = [];
    }

    slugMap[slug].push(file);
  }

  const contentMap = new Map<string, string>();
  for (const file of markdownFiles) {
    contentMap.set(file, fs.readFileSync(file, "utf-8"));
  }

  const graph = await buildSiteGraph(contentMap, slugMap);

  for (const file of markdownFiles) {
    const rawContent = contentMap.get(file)!;
    const { html, frontmatter } = await renderMarkdown(rawContent, slugMap, file);
    const { mtime } = await getFileMeta(file);

    const slug = getSlug(file);
    const statusValue = frontmatter.status;

    parsedData.push({
      path: file,
      title: getTitle(file),
      metadata: {
        frontmatter,
        ...(typeof statusValue === "string" ? { status: statusValue } : {}),
        updated: formatDate(mtime),
      },
      content: html,
      backlinks: resolveBacklinks(graph, slug, slugMap),
    });
  }

  return parsedData;
}

console.log("Parsing markdown files...");
parseFiles()
  .then((parsedData) => {
    if (parsedData.length === 0) {
      console.log("No pages found to render.");
      return;
    }
    const explorerTree = buildExplorerTree("./content");
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
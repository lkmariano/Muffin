import fs from "node:fs";
import { getSlug, getTitle } from "./util.js";
import { buildExplorerTree, renderExplorer } from "./plugins/explorer.js";
import { getMarkdownFiles } from "./src/content/loader.js";
import { renderMarkdownFile } from "./src/content/markdown.js";
import { buildSiteGraph } from "./src/graph/backlinks.js";
import { writePages } from "./src/output/writer.js";
import { writeStaticAssets } from "./src/output/assets.js";
import { loadPageTemplate } from "./src/output/templates.js";
import { renderPage } from "./src/rendering/page.js";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type Page = {
  path: string;
  title: string;
  frontmatter: Record<string, unknown>;
  content: string;
  status?: string;
  updated: string;
  backlinks?: Array<{ title: string; href: string }>;
};

async function parseFiles() {
  const markdownFiles = await getMarkdownFiles("./content");
  const parsedData: Page[] = [];

  // NOTE (Phase 3 known inefficiency): every file is parsed twice — once
  // here purely to extract wikilink targets for the forward/backlink
  // index, and again below to produce the final HTML. Worth fixing when
  // the Markdown pipeline is extracted into its own module.

  const slugMap: Record<string, string[]> = {};

  for (const file of markdownFiles) {
    const slug = getSlug(file);

    if (!slugMap[slug]) {
      slugMap[slug] = [];
    }

    slugMap[slug].push(file);
  }

  const graph = await buildSiteGraph(markdownFiles, slugMap);

  for (const file of markdownFiles) {
    const { html, frontmatter } = await renderMarkdownFile(file, slugMap);

    const slug = getSlug(file);
    const mtime = fs.statSync(file).mtime;
    const statusValue = frontmatter.status;

    parsedData.push({
      path: file,
      title: getTitle(file),
      frontmatter,
      content: html,
      ...(typeof statusValue === "string" ? { status: statusValue } : {}),
      updated: formatDate(mtime),
      backlinks: graph.getBacklinks(slug),
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
    const explorerHtml = renderExplorer(explorerTree);
    const template = loadPageTemplate();
    const outputPages = parsedData.map((page) => ({
      path: page.path,
      renderedHtml: renderPage(page, template, explorerHtml),
    }));
    writePages(outputPages);
    writeStaticAssets();
  })
  .catch((error) => {
    console.error("Build failed:", error);
    process.exit(1);
  });
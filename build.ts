import fs from "fs";
import path from "path";
import matter from "gray-matter";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from 'rehype-stringify'
import { getTitle, getSlug } from "./util.js";
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { wikilinkPlugin } from './plugins/wikilinks.js'
import { withBasePath } from './basePath.js'
import { buildExplorerTree, renderExplorer } from './plugins/explorer.js'
import { loadThemeVars } from './plugins/theme.js'

async function getMarkdownFiles (directory: string): Promise<string[]> {
    let markdownFiles: string[] = [];
    const contentDirectory = fs.readdirSync(directory, { withFileTypes: true });

    for (const dirent of contentDirectory) {
      const fullPath = path.join(directory, dirent.name);
      if (dirent.isDirectory()) {
        const nestedMarkdownFiles = await getMarkdownFiles(fullPath);
        markdownFiles = markdownFiles.concat(nestedMarkdownFiles);
      } else if (dirent.isFile() && dirent.name.endsWith(".md")) {
        markdownFiles.push(fullPath);
      }
    }

  return markdownFiles;
}

type Page = {
    path: string;
    title: string;
    frontmatter: Record<string, unknown>;
    content: string;
    backlinks?: Array<{ title: string; href: string }>;
};

async function parseFiles() {
  const markdownFiles = await getMarkdownFiles("./content");
  const parsedData: Page[] = [];

  console.log("markdownFiles:", markdownFiles);
  const forwardLinks: Record<string, string[]> = {};

  const slugMap: Record<string, string[]> = {};
  for (const file of markdownFiles) {
    const slug = getSlug(file);
    if (!slugMap[slug]) {
      slugMap[slug] = [];
    }
    slugMap[slug].push(file);
  }

  for (const file of markdownFiles) {
    const fileContent = fs.readFileSync(file, "utf-8");
    const matterData = matter(fileContent);
    const linkExtractor = unified()
        .use(remarkParse)
        .use(wikilinkPlugin, slugMap, file);

    const linkTree = linkExtractor.parse(matterData.content);
    const transformedLinkTree = await linkExtractor.run(linkTree);
    const sourceSlug = getSlug(file);
    visit(transformedLinkTree, 'link', (node: any) => {
      if (!node.data || !node.data.isWikilink) {
        return;
      }
      const targetSlug = getSlug(node.url.replace(/\.html$/, ".md"));
      if (!forwardLinks[sourceSlug]) {
        forwardLinks[sourceSlug] = [];
      }
      forwardLinks[sourceSlug].push(targetSlug);
    });
  }

  const backlinks: Record<string, string[]> = {};
  for (const [source, targets] of Object.entries(forwardLinks)) {
    for (const target of targets) {
      if (!backlinks[target]) {
        backlinks[target] = [];
      }
      if (!backlinks[target].includes(source)) {
        backlinks[target].push(source);
      }
    }
  }

  console.log("backlinks", backlinks);

  for (const file of markdownFiles) {
    const fileContent = fs.readFileSync(file, "utf-8");
    const matterData = matter(fileContent);

    const processor = unified()
      .use(remarkParse)
      .use(wikilinkPlugin, slugMap, file)
      .use(remarkRehype)
      .use(rehypeStringify);

    const processedContent = await processor.process(matterData.content);
    const slug = getSlug(file);
    parsedData.push({
      path: file,
      title: getTitle(file),
      frontmatter: matterData.data,
      content: String(processedContent),
      backlinks: (backlinks[slug] ?? [])
        .map((sourceSlug) => slugMap[sourceSlug]?.[0])
        .filter((filePath): filePath is string => typeof filePath === "string")
        .map((filePath) => ({
          title: getTitle(filePath),
          href: withBasePath(`/${path.relative("./content", filePath).replace(/\.md$/, ".html").replace(/\\/g, "/")}`),
        })),
    });
  }

  return parsedData;
}

function writeOutput(parsedData: Page[], template: string, explorerHtml: string) {
  for (const page of parsedData) {
    const renderedContent = render(page, template, explorerHtml);
    const relativePath = path.relative("./content", page.path);
    const outputPath = path.join("./muffin", relativePath.replace(/\.md$/, ".html"));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, renderedContent, "utf-8");
  }
}

function render(page: Page, template: string, explorerHtml: string): string {
  const listItems = (page.backlinks ?? [])
    .map((link) => `<li><a href="${link.href}">${link.title}</a></li>`)
    .join("");
  const backlinksHtml = listItems
  ? `<div class="aside-title">Backlinks</div><ul>${listItems}</ul>`
  : "";
  const cssHref = withBasePath("/styles.css");
  const themeCssHref = withBasePath("/theme.css");

  return template
    .replaceAll("{{TITLE}}", page.title)
    .replaceAll("{{BACKLINKS}}", backlinksHtml)
    .replaceAll("{{NAV}}", explorerHtml)
    .replaceAll("{{THEME_CSS}}", themeCssHref)
    .replaceAll("{{CSS}}", cssHref)
    .replaceAll("{{CONTENT}}", page.content);   
}

console.log("Parsing markdown files...");
parseFiles()
    .then((parsedData) => {
        console.log("Parsed data:", parsedData);
        if (parsedData.length === 0) {
          console.log("No pages found to render.");
          return;
        }
        const template = fs.readFileSync("./templates/page.html", "utf-8");
        const explorerTree = buildExplorerTree("./content");
        const explorerHtml = renderExplorer(explorerTree);
        writeOutput(parsedData, template, explorerHtml);
        fs.copyFileSync("./templates/styles.css", "./muffin/styles.css");
        fs.writeFileSync("./muffin/theme.css", loadThemeVars("./muffin.config.json"), "utf-8");
        fs.copyFileSync("./muffin/projects.html", "./muffin/index.html");
    })
    .catch((error) => {
        console.error("Build failed:", error);
        process.exit(1);
    });
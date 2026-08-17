import fs from "fs";
import path, { join } from "path";
import  matter from "gray-matter";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from 'rehype-stringify'
import { getTitle, getSlug } from "./util.js";
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { wikilinkPlugin } from './plugins/wikilinks.js'
import { withBasePath } from './basePath.js'

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

function render(page: Page, template: string, nav: Record<string, { title: string; href: string }[]>): string {
  const listItems = (page.backlinks ?? [])
    .map((link) => `<li><a href="${link.href}">${link.title}</a></li>`)
    .join("");
  const backlinksHtml = listItems ? `<ul>Backlinks${listItems}</ul>` : "";
  const navHtml = renderNav(nav);
  const cssHref = withBasePath("/styles.css");

  return template
    .replaceAll("{{TITLE}}", page.title)
    .replaceAll("{{BACKLINKS}}", backlinksHtml)
    .replaceAll("{{NAV}}", navHtml)
    .replaceAll("{{CSS}}", cssHref)
    .replaceAll("{{CONTENT}}", page.content);   
}

function buildNav(pages: Page[]): Record<string, { title: string; href: string }[]> {
  const grouped: Record<string, { title: string; href: string }[]> = {};
  for (const page of pages) {
    const relativePath = path.relative("./content", page.path);
    const href = withBasePath(`/${relativePath.replace(/\.md$/, ".html")}`);
    const title = page.title;
    const dir = path.dirname(relativePath);
    if (!grouped[dir]) {
      grouped[dir] = [];
    }
    grouped[dir].push({ title, href });
  }

  for (const folder in grouped) {
    const folderPages = grouped[folder];
    if (!folderPages) continue;
    folderPages.sort((a, b) => a.title.localeCompare(b.title));
  }

  return grouped;
}

function writeOutput(parsedData: Page[], template: string, nav: Record<string, { title: string; href: string }[]>) {
  for (const page of parsedData) {
    const renderedContent = render(page, template, nav);
    const relativePath = path.relative("./content", page.path);
    const outputPath = path.join("./muffin", relativePath.replace(/\.md$/, ".html"));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, renderedContent, "utf-8");
  }
}

function renderNav(nav: Record<string, { title: string; href: string }[]>): string {
  let navHtml = '<ul>';
  for (const folder in nav) {
    const folderPages = nav[folder];
    if (!folderPages) continue;

    const items = folderPages
      .map((page) => `<li><a href="${page.href}">${page.title}</a></li>`)
      .join('');

    if (folder === '.') {
      navHtml += items;
    } else {
      navHtml += `<li><details><summary>${folder}</summary><ul>${items}</ul></details></li>`;
    }
  }
  navHtml += '</ul>';
  return navHtml;
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
        const nav = buildNav(parsedData);
        writeOutput(parsedData, template, nav);
        fs.copyFileSync("./templates/styles.css", "./muffin/styles.css");
    })
    .catch((error) => {
        console.error("Build failed:", error);
        process.exit(1);
    });
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
import { generateThemeCss, type ThemeConfig } from './plugins/theme.js'

// function getMarkdown Files
// 
// Current Role: Reads every markdown file in the content directory and its subdirectories, returning an array of file paths.
// 
// Architectural Role: Content
// 
// Future Location: src/content/loader.ts

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

  // returns all the markdown files inside the folder (/content)

  return markdownFiles;
}




// function formatDate 
// Current Role: formats a Date object into a string in the format YYYY-MM-DD. This is used to display the last updated date of a page in the generated HTML.
//
// Future Location: src/utils/date.ts

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}



// Pages Object
// Current Role: Makes a Page Objects to show what should be inside a page
//
// Architectural Role: Pages
//
// Different pages type:
// type PageType = "Default" | "Portfolio" | "Photo" | "Note";
//
// Future Location: src/pages/registry.ts

type Page = {
    path: string;
    title: string;
    frontmatter: Record<string, unknown>;
    content: string;
    status?: string;
    updated: string;
    backlinks?: Array<{ title: string; href: string }>;
};


// function loadThemeConfig
//
// Current Function: loads the theme config from the json file at the given path and returns it as a ThemeConfig (colors, fonts, etc.) object and also generates the theme.css file 
// in the muffin output directory.
//
// Architectural Role: Theme
//
// Future Location: src/theme/loader.ts

function loadThemeConfig(configPath: string): ThemeConfig {
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as ThemeConfig;
}



// Responsibility:
// Currently acts as the main content-processing function.
// It discovers files, creates page identifiers, extracts wikilinks,
// builds the site graph, processes Markdown into HTML, and creates
// the final Page objects.
//
// Current architectural responsibilities:
// 1. Content discovery
// 2. Page identity / slug mapping
// 3. Wikilink transformation
// 4. Link extraction
// 5. Site graph construction
// 6. Markdown-to-HTML rendering
// 7. Page object creation
//
// Target architecture:
// These responsibilities should eventually be separated into
// Content, Transformers, Site Graph, Rendering, and Domain/Page modules.
//
// Future role of parseFiles():
// This function should eventually become a coordinator for content
// processing rather than implementing every step itself.


async function parseFiles() {

  // Function: Gets alll markdown files
  // Architectural Role: Content

  const markdownFiles = await getMarkdownFiles("./content");
  const parsedData: Page[] = [];

  console.log("markdownFiles:", markdownFiles);
  const forwardLinks: Record<string, string[]> = {};

  // Function: Creates a slugMap to record each wikilik/slug will be stored
  // 
  // Architectural Role: Page/Content domain
  //
  // Slug Resolution should be separate from backlinks and wikilinks rendering
  // 
  // 
  
  const slugMap: Record<string, string[]> = {};

  // for all files in markdown files 
  // gets the slug for each .md file

  for (const file of markdownFiles) {
    const slug = getSlug(file);

    // if the current slug is not in the group of currently mapped slugs
    // create an empty array for that slug in slugMap

    if (!slugMap[slug]) {
      slugMap[slug] = [];
    }

    // if it is push the file into the array that is inside that slug

    slugMap[slug].push(file);
  }

  // NOTE (Phase 3 known inefficiency): every file is parsed twice — once
  // here purely to extract wikilink targets for the forward/backlink
  // index, and again below to produce the final HTML. Worth fixing when
  // the Markdown pipeline is extracted into its own module.

  // BACKLINKS / LINK DISCOVERY

  for (const file of markdownFiles) {
    const fileContent = fs.readFileSync(file, "utf-8");

    // Gets frontmatter / content
    const matterData = matter(fileContent);

    // Content Tranformation
    const linkExtractor = unified()
        .use(remarkParse)
        .use(wikilinkPlugin, slugMap, file);


    // Content Parsing
    const linkTree = linkExtractor.parse(matterData.content);

    // Wikilink Transformation

    const transformedLinkTree = await linkExtractor.run(linkTree);

    // Page Identifier

    const sourceSlug = getSlug(file);

    // Site Graph / Link Discovery

    visit(transformedLinkTree, 'link', (node: any) => {
      if (!node.data || !node.data.isWikilink) {
        return;
      }

      // Determine Link page 

      const targetSlug = getSlug(node.url.replace(/\.html$/, ".md"));
      if (!forwardLinks[sourceSlug]) {
        forwardLinks[sourceSlug] = [];
      }

      // Stores link information 

      forwardLinks[sourceSlug].push(targetSlug);
    });
  }

  // Looks for backlinks

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


  // Reads content parses and transforms markdown, Extracts information 

  for (const file of markdownFiles) {

    // Content loader

    const fileContent = fs.readFileSync(file, "utf-8");
    const matterData = matter(fileContent);

    // Markdown to html (Markdown Processor)

    const processor = unified()
      .use(remarkParse)
      .use(wikilinkPlugin, slugMap, file)
      .use(remarkRehype)
      .use(rehypeStringify);

    const processedContent = await processor.process(matterData.content);
    const slug = getSlug(file);
    const mtime = fs.statSync(file).mtime;
    const statusValue = matterData.data.status;

    // Page/domain layer

    parsedData.push({
      path: file,
      title: getTitle(file),
      frontmatter: matterData.data,
      content: String(processedContent),
      ...(typeof statusValue === "string" ? { status: statusValue } : {}),
      updated: formatDate(mtime),

      // Backlinks inside the page 

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

  const metaParts: string[] = [];
  if (page.status) {
    metaParts.push(`<span class="page-status">${page.status}</span>`);
  }
  metaParts.push(`<span class="page-updated">Updated ${page.updated}</span>`);
  const pageMetaHtml = `<div class="page-meta">${metaParts.join("")}</div>`;

  return template
    .replaceAll("{{TITLE}}", page.title)
    .replaceAll("{{BACKLINKS}}", backlinksHtml)
    .replaceAll("{{NAV}}", explorerHtml)
    .replaceAll("{{THEME_CSS}}", themeCssHref)
    .replaceAll("{{CSS}}", cssHref)
    .replaceAll("{{PAGE_META}}", pageMetaHtml)
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
        const themeConfig = loadThemeConfig("./muffin.config.json");
        fs.writeFileSync("./muffin/theme.css", generateThemeCss(themeConfig), "utf-8");
        fs.copyFileSync("./muffin/projects.html", "./muffin/index.html");
    })
    .catch((error) => {
        console.error("Build failed:", error);
        process.exit(1);
    });

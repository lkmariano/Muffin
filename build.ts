import fs from "fs";
import path from "path";
import  matter from "gray-matter";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified';
import {findAndReplace} from 'mdast-util-find-and-replace'
import { visit } from 'unist-util-visit';
import { getSlug } from './util.js'

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
    frontmatter: Record<string, unknown>;
    content: string;
    backlinks?: string[];
};

async function parseFiles() {
  const markdownFiles = await getMarkdownFiles("./content");
  const slugs = markdownFiles.map(file => {
      return getSlug(file);
  });
  const processor = unified()
      .use(remarkParse)
      .use(wikilinkPlugin, slugs)
      .use(remarkRehype)
      .use(rehypeStringify);
    const linkExtractor = unified()
        .use(remarkParse)
        .use(wikilinkPlugin, slugs);
    const parsedData: Page[] = [];


  console.log("markdownFiles:", markdownFiles);
  const forwardLinks: Record<string, string[]> = {};

  for (const file of markdownFiles) {
    const fileContent = fs.readFileSync(file, "utf-8");
    const matterData = matter(fileContent);
    const linkTree = linkExtractor.parse(matterData.content);
    const transformedLinkTree = await linkExtractor.run(linkTree);
    visit(transformedLinkTree, 'link', (node: any) => {
      console.log("found link node", node);
      const sourceSlug = getSlug(file);
        const targetSlug = node.url.replace(/^\//, "").replace(/\.html$/, "");
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
      backlinks[target].push(source);
    }
  }
    
  console.log("backlinks", backlinks);
    
  for (const file of markdownFiles) {
    const fileContent = fs.readFileSync(file, "utf-8");
    const matterData = matter(fileContent);
    const processedContent = await processor.process(matterData.content);
    const slug = getSlug(file);
      parsedData.push({
      path: file,
      frontmatter: matterData.data,
      content: String(processedContent),
      backlinks: backlinks[slug] || [],
    });
  }

  return parsedData;
}

function wikilinkPlugin(slugs: string[]) {
  return (tree: any): void => {
    findAndReplace(tree, [
      /\[{2}(.+?)\]{2}/g,
      (value: string, capturedText: string) => {
        const slug = capturedText.toLowerCase().replace(/\s+/g, '-');
        const slugsExists = slugs.includes(slug);
        if (slugsExists) {
          return {
            type: 'link',
            url: `/${slug}.html`,
            children: [{ type: 'text', value: capturedText }],
          };
        } else {
          return {
            type: 'text',
            value: capturedText,
          };
        }
      },
    ]);
  };
}


const template = fs.readFileSync("./templates/page.html", "utf-8");

function render(page: Page, template: string): string {  
  return template
  .replaceAll("{{TITLE}}", page.frontmatter.title as string || "Untitled")
  .replaceAll("{{CONTENT}}", page.content)
  .replaceAll("{{BACKLINKS}}", (page.backlinks ?? []).map((link) => `<a href="/${link}.html">${link}</a>`).join(""))
}

function writeOutput(parsedData: Page[], template: string) {
  for (const page of parsedData) {
    const renderedContent = render(page, template);
    const relativePath = path.relative("./content", page.path);
    const outputPath = path.join("./muffin", relativePath.replace(/\.md$/, ".html"));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, renderedContent, "utf-8");
  }
}

console.log("Parsing markdown files...");
parseFiles()
    .then((parsedData) => {
        console.log("Parsed data:", parsedData);
        const template = fs.readFileSync("./templates/page.html", "utf-8");
        writeOutput(parsedData, template);
    if (parsedData.length === 0) {
      console.log("No pages found to render.");
      return;
    }
    const firstPage = parsedData[0];
    if (!firstPage) {
      console.log("No pages found to render.");
      return;
    }
    const rendered = render(firstPage, template);
    console.log(rendered);
    })
    .catch((error) => {
        console.error("Error parsing files:", error);
    });
import fs from "fs";
import path from "path";
import  matter from "gray-matter";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import {findAndReplace} from 'mdast-util-find-and-replace'

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
};

async function parseFiles() {
    const markdownFiles = await getMarkdownFiles("./content");
    const processor = unified()
        .use(remarkParse)
        .use(wikilinkPlugin)
        .use(remarkRehype)
        .use(rehypeStringify);
    const parsedData: Page[] = [];

    for (const file of markdownFiles) {
        const fileContent = fs.readFileSync(file, "utf-8");
        const matterData = matter(fileContent);
        const processed = await processor.process(matterData.content);
        parsedData.push({ path: file, frontmatter: matterData.data, content: String(processed) });
    }

    return parsedData;

}

function wikilinkPlugin() {
  return (tree: any) => {
    findAndReplace(tree, [
      /\[{2}(.+?)\]{2}/g,
      (value: string, capturedText: string) => {
        const slug = capturedText.toLowerCase().replace(/\s+/g, '-');
        return {
          type: 'link',
          url: `/${slug}`,
          children: [{ type: 'text', value: capturedText }],
        };
      },
    ]);
  };
}

parseFiles().then(parsedData => {
    console.log(parsedData);
}).catch(error => {
    console.error("Error parsing files:", error);
});
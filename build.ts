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
    const slugs = markdownFiles.map(file => {
        const relativePath = path.relative("./content", file);
        const slug = relativePath.replace(/\.md$/, "").replace(/\\/g, "/");
        return slug;
    });
    const processor = unified()
        .use(remarkParse)
        .use(wikilinkPlugin, slugs)
        .use(remarkRehype)
        .use(rehypeStringify);
    const parsedData: Page[] = [];


    console.log("markdownFiles:", markdownFiles);

    for (const file of markdownFiles) {
        const fileContent = fs.readFileSync(file, "utf-8");
        const matterData = matter(fileContent);
        const processed = await processor.process(matterData.content);
        parsedData.push({ path: file, frontmatter: matterData.data, content: String(processed) });
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
            url: `/${slug}`,
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

console.log("Parsing markdown files...");
parseFiles()
    .then((parsedData) => {
        console.log("Parsed data:", parsedData);
    })
    .catch((error) => {
        console.error("Error parsing files:", error);
    }); 
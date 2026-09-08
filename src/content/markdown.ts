import fs from "node:fs";
import matter from "gray-matter";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { wikilinkPlugin } from "../../plugins/wikilinks.js";

export interface RenderMarkdownResult {
  html: string;
  frontmatter: Record<string, unknown>;
  mtime: Date;
}

export async function renderMarkdownFile(
  filePath: string,
  slugMap: Record<string, string[]>,
): Promise<RenderMarkdownResult> {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const mtime = fs.statSync(filePath).mtime;
  const matterData = matter(fileContent);

  const processor = unified()
    .use(remarkParse)
    .use(wikilinkPlugin, slugMap, filePath)
    .use(remarkRehype)
    .use(rehypeStringify);

  const processedContent = await processor.process(matterData.content);

  return {
    html: String(processedContent),
    frontmatter: matterData.data as Record<string, unknown>,
    mtime,
  };
}
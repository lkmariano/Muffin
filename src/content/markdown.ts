import matter from "gray-matter";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { wikilinkPlugin } from "../../plugins/wikilinks.js";

export interface RenderMarkdownResult {
  html: string;
  frontmatter: Record<string, unknown>;
}

export async function renderMarkdown(
  content: string,
  slugMap: Record<string, string[]>,
  currentFile: string,
): Promise<RenderMarkdownResult> {
  const matterData = matter(content);

  const processor = unified()
    .use(remarkParse)
    .use(wikilinkPlugin, slugMap, currentFile)
    .use(remarkRehype)
    .use(rehypeStringify);

  const processedContent = await processor.process(matterData.content);

  return {
    html: String(processedContent),
    frontmatter: matterData.data as Record<string, unknown>,
  };
}
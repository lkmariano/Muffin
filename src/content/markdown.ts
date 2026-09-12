import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { wikilinkPlugin, wikilinkToUrlPlugin } from "../../plugins/wikilinks.js";

import type { Root } from "mdast";

export type ParsedMarkdown = {
  path: string;
  tree: Root;
};

export async function parseMarkdown(
  body: string,
  slugMap: Record<string, string[]>,
  currentFile: string,
): Promise<Root> {
  const parser = unified().use(remarkParse).use(wikilinkPlugin, slugMap, currentFile);

  const tree = parser.parse(body) as Root;
  return parser.run(tree) as Promise<Root>;
}

export async function renderMarkdownTree(tree: Root, basePath = ""): Promise<string> {
  const renderer = unified().use(wikilinkToUrlPlugin, basePath).use(remarkRehype).use(rehypeStringify);

  const hast = await renderer.run(tree);
  return String(renderer.stringify(hast));
}

export async function renderMarkdown(
  body: string,
  slugMap: Record<string, string[]>,
  currentFile: string,
  basePath = "",
): Promise<string> {
  return renderMarkdownTree(await parseMarkdown(body, slugMap, currentFile), basePath);
}
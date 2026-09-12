import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getSlug } from "../../util.js";

export type LoadedContent = {
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
  mtime: Date;
};

export type LoadedContentResult = {
  contents: LoadedContent[];
  slugMap: Record<string, string[]>;
};

export async function getMarkdownFiles(directory: string): Promise<string[]> {
  const markdownFiles: string[] = [];
  const contentDirectory = fs.readdirSync(directory, { withFileTypes: true });

  for (const dirent of contentDirectory) {
    const fullPath = path.join(directory, dirent.name);
    if (dirent.isDirectory()) {
      const nestedMarkdownFiles = await getMarkdownFiles(fullPath);
      markdownFiles.push(...nestedMarkdownFiles);
    } else if (dirent.isFile() && dirent.name.endsWith(".md")) {
      markdownFiles.push(fullPath);
    }
  }

  return markdownFiles;
}

export async function loadContent(directory: string): Promise<LoadedContentResult> {
  const markdownFiles = await getMarkdownFiles(directory);

  const slugMap: Record<string, string[]> = {};

  const contents: LoadedContent[] = markdownFiles.map((file) => {
    const slug = getSlug(file);

    if (!slugMap[slug]) {
      slugMap[slug] = [];
    }

    slugMap[slug].push(file);

    const raw = fs.readFileSync(file, "utf-8");
    const { data, content } = matter(raw);
    const mtime = fs.statSync(file).mtime;

    return {
      path: file,
      frontmatter: data as Record<string, unknown>,
      body: content,
      mtime,
    };
  });

  return { contents, slugMap };
}
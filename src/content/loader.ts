import fs from "node:fs";
import path from "node:path";

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
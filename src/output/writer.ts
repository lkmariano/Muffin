import fs from "node:fs";
import path from "node:path";

export interface OutputPage {
  path: string;
  renderedHtml: string;
}

export function writePages(pages: OutputPage[]) {
  for (const page of pages) {
    const relativePath = path.relative("./content", page.path);
    const outputPath = path.join("./muffin", relativePath.replace(/\.md$/, ".html"));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, page.renderedHtml, "utf-8");
  }
}

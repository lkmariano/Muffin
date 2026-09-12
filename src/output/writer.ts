import fs from "node:fs";
import path from "node:path";
import { toHtmlPath } from "../../util.js";

export interface OutputPage {
  path: string;
  renderedHtml: string;
}

export interface WritePagesOptions {
  homepage?: string;
  contentRoot?: string;
  outputRoot?: string;
}

export function writePages(pages: OutputPage[], options: WritePagesOptions = {}): void {
  const contentRoot = options.contentRoot ?? "./content";
  const outputRoot = options.outputRoot ?? "./muffin";

  for (const page of pages) {
    const relativePath = path.relative(contentRoot, page.path);
    const outputPath = path.join(outputRoot, toHtmlPath(relativePath));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, page.renderedHtml, "utf-8");
  }

  if (options.homepage !== undefined) {
    const homepage = pages.find(
      (page) => path.basename(page.path, ".md") === options.homepage,
    );
    if (homepage) {
      fs.writeFileSync(path.join(outputRoot, "index.html"), homepage.renderedHtml, "utf-8");
    }
  }
}

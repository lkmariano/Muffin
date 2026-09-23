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

const HOMEPAGE_FALLBACKS = ["home", "index"];

export function writePages(pages: OutputPage[], options: WritePagesOptions = {}): void {
  const contentRoot = path.resolve(options.contentRoot ?? "./content");
  const outputRoot = path.resolve(options.outputRoot ?? "./muffin");

  const expected = new Set<string>();

  for (const page of pages) {
    const relativePath = path.relative(contentRoot, page.path);
    const outputPath = path.resolve(outputRoot, toHtmlPath(relativePath));
    expected.add(outputPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, page.renderedHtml, "utf-8");
  }

  const homepage = resolveHomepage(pages, options.homepage);
  if (homepage) {
    const indexPath = path.resolve(outputRoot, "index.html");
    expected.add(indexPath);
    fs.writeFileSync(indexPath, homepage.renderedHtml, "utf-8");
  }

  cleanupStaleHtml(outputRoot, expected);
}

function resolveHomepage(pages: OutputPage[], homepage?: string): OutputPage | undefined {
  if (homepage !== undefined) {
    return pages.find((page) => path.basename(page.path, ".md") === homepage);
  }

  for (const candidate of HOMEPAGE_FALLBACKS) {
    const match = pages.find(
      (page) => path.basename(page.path, ".md").toLowerCase() === candidate,
    );
    if (match) {
      return match;
    }
  }

  return undefined;
}

// COMMENT: prunes generated output so it mirrors the current content set.
// Removes any .html not expected this build, then strips now-empty directories.
// Only touches .html; styles.css and other files are left alone.
function cleanupStaleHtml(outputRoot: string, expected: Set<string>): void {
  if (!fs.existsSync(outputRoot)) {
    return;
  }
  removeStaleHtml(outputRoot, expected);
}

// Returns true when the directory holds nothing left to keep after cleanup.
function removeStaleHtml(directory: string, expected: Set<string>): boolean {
  let isEmpty = true;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (removeStaleHtml(fullPath, expected)) {
        fs.rmdirSync(fullPath);
      } else {
        isEmpty = false;
      }
    } else if (entry.name.endsWith(".html")) {
      if (expected.has(fullPath)) {
        isEmpty = false;
      } else {
        fs.rmSync(fullPath);
      }
    } else {
      isEmpty = false;
    }
  }

  return isEmpty;
}

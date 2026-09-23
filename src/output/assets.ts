import fs from "node:fs";
import path from "node:path";
import type { LoadedAsset } from "../content/loader.js";

export interface WriteStaticAssetsOptions {
  outputRoot?: string;
  hasMath?: boolean;
}

export function writeStaticAssets(options: WriteStaticAssetsOptions = {}): void {
  const outputRoot = path.resolve(options.outputRoot ?? "./muffin");
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.copyFileSync("./templates/styles.css", path.join(outputRoot, "styles.css"));
  if (options.hasMath === true) {
    copyKatexAssets(outputRoot);
  } else {
    fs.rmSync(path.join(outputRoot, "katex"), { recursive: true, force: true });
  }
}

export interface WriteSyndicationOptions {
  outputRoot: string;
  feedXml: string;
  sitemapXml: string;
}

/** Writes feed.xml and sitemap.xml when their XML is non-empty; removes each
 *  file when its XML is empty (stale-output pruning, mirroring the KaTeX
 *  gate). */
export function writeSyndication(options: WriteSyndicationOptions): void {
  const outputRoot = path.resolve(options.outputRoot);
  if (options.feedXml) {
    fs.mkdirSync(outputRoot, { recursive: true });
    fs.writeFileSync(path.join(outputRoot, "feed.xml"), options.feedXml, "utf-8");
  } else {
    fs.rmSync(path.join(outputRoot, "feed.xml"), { force: true });
  }
  if (options.sitemapXml) {
    fs.mkdirSync(outputRoot, { recursive: true });
    fs.writeFileSync(path.join(outputRoot, "sitemap.xml"), options.sitemapXml, "utf-8");
  } else {
    fs.rmSync(path.join(outputRoot, "sitemap.xml"), { force: true });
  }
}

export function copyKatexAssets(outputRoot: string): void {
  const katexDir = path.join(outputRoot, "katex");
  fs.mkdirSync(katexDir, { recursive: true });
  fs.copyFileSync(
    "./node_modules/katex/dist/katex.min.css",
    path.join(katexDir, "katex.min.css"),
  );
  copyDir("./node_modules/katex/dist/fonts", path.join(katexDir, "fonts"));
}

function copyDir(srcDir: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

export interface CopyAssetsOptions {
  outputRoot?: string;
}

export function copyAssets(assets: LoadedAsset[], options: CopyAssetsOptions = {}): void {
  const outputRoot = path.resolve(options.outputRoot ?? "./muffin");

  for (const asset of assets) {
    const outputPath = path.resolve(outputRoot, asset.relPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.copyFileSync(asset.path, outputPath);
  }
}

export interface CopyPublicAssetsOptions {
  outputRoot?: string;
}

/**
 * Passthrough for the project-level `public/` directory. Its contents are
 * copied into the output root verbatim — never parsed or transformed as
 * Markdown. A missing or empty directory is a no-op. Vault disclosure
 * (exclude globs) applies to the content directory; `public/` is a
 * project-level convention and is copied wholesale.
 */
export function copyPublicAssets(
  publicDirectory: string,
  options: CopyPublicAssetsOptions = {},
): void {
  if (!fs.existsSync(publicDirectory) || !fs.statSync(publicDirectory).isDirectory()) {
    return;
  }
  const outputRoot = path.resolve(options.outputRoot ?? "./muffin");
  copyDir(publicDirectory, outputRoot);
}

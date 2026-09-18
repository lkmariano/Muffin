import fs from "node:fs";
import path from "node:path";
import { generateThemeCss } from "../theme/css.js";
import type { ThemeTokens } from "../theme/css.js";
import type { LoadedAsset } from "../content/loader.js";

export interface WriteStaticAssetsOptions {
  outputRoot?: string;
  hasMath?: boolean;
}

export function writeStaticAssets(
  theme: ThemeTokens,
  options: WriteStaticAssetsOptions = {},
): void {
  const outputRoot = path.resolve(options.outputRoot ?? "./muffin");
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.copyFileSync("./templates/styles.css", path.join(outputRoot, "styles.css"));
  fs.writeFileSync(path.join(outputRoot, "theme.css"), generateThemeCss(theme), "utf-8");
  if (options.hasMath === true) {
    copyKatexAssets(outputRoot);
  } else {
    fs.rmSync(path.join(outputRoot, "katex"), { recursive: true, force: true });
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
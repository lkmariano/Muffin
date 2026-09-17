import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { copyAssets, copyKatexAssets } from "../../src/output/assets.js";
import type { LoadedAsset } from "../../src/content/loader.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;
let contentRoot: string;
let outputRoot: string;

beforeEach(() => {
  dir = makeTempDir();
  contentRoot = path.join(dir, "content");
  outputRoot = path.join(dir, "muffin");
});

afterEach(() => {
  cleanupTempDir(dir);
});

describe("copyAssets", () => {
  it("copies assets to reflected output paths", () => {
    const source = writeFile(contentRoot, "images/test.png", "PNGDATA");

    copyAssets([{ path: source, relPath: "images/test.png" }], { outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "images", "test.png"), "utf-8")).toBe("PNGDATA");
  });

  it("copies nested assets creating their output folders", () => {
    const source = writeFile(contentRoot, "notes/assets/pic.jpg", "JPGDATA");

    copyAssets([{ path: source, relPath: "notes/assets/pic.jpg" }], { outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "notes", "assets", "pic.jpg"), "utf-8")).toBe(
      "JPGDATA",
    );
  });

  it("copies files byte-for-byte", () => {
    const binary = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0xff]);
    const source = path.join(contentRoot, "img.png");
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, binary);

    copyAssets([{ path: source, relPath: "img.png" }], { outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "img.png"))).toEqual(binary);
  });

  it("is a no-op for an empty asset list", () => {
    const assets: LoadedAsset[] = [];

    copyAssets(assets, { outputRoot });

    expect(fs.existsSync(outputRoot)).toBe(false);
  });
});

describe("copyKatexAssets", () => {
  it("copies the katex stylesheet and fonts into the output root", () => {
    copyKatexAssets(outputRoot);

    const katexCss = fs.readFileSync(path.join(outputRoot, "katex", "katex.min.css"), "utf-8");
    expect(katexCss).not.toHaveLength(0);

    const fontsDir = path.join(outputRoot, "katex", "fonts");
    expect(fs.existsSync(fontsDir)).toBe(true);
    expect(fs.readdirSync(fontsDir).some((file) => file.endsWith(".woff2"))).toBe(true);
  });

  it("copies katex fonts byte-for-byte", () => {
    copyKatexAssets(outputRoot);

    const source = "/Users/liammariano/Muffin/node_modules/katex/dist/fonts/KaTeX_Main-Regular.woff2";
    const copied = path.join(outputRoot, "katex", "fonts", "KaTeX_Main-Regular.woff2");
    expect(fs.readFileSync(copied)).toEqual(fs.readFileSync(source));
  });
});
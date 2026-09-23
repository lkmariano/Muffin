import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  copyAssets,
  copyPublicAssets,
  writeStaticAssets,
  writeSyndication,
} from "../../src/output/assets.js";
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
  it("copies assets to reflected output paths, creating nested folders", () => {
    const root = writeFile(contentRoot, "images/test.png", "PNGDATA");
    const nested = writeFile(contentRoot, "notes/assets/pic.jpg", "JPGDATA");

    copyAssets(
      [
        { path: root, relPath: "images/test.png" },
        { path: nested, relPath: "notes/assets/pic.jpg" },
      ],
      { outputRoot },
    );

    expect(fs.readFileSync(path.join(outputRoot, "images", "test.png"), "utf-8")).toBe("PNGDATA");
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

describe("writeStaticAssets", () => {
  it("writes the self-contained styles.css with the default Muffin tokens and no theme.css", () => {
    writeStaticAssets({ outputRoot, hasMath: false });

    const styles = fs.readFileSync(path.join(outputRoot, "styles.css"), "utf-8");
    expect(styles).toContain("var(--color-text)");
    expect(styles).toContain("--color-text: #E8EAED;");
    expect(styles).toContain("--layout-content-width: 630px;");
    expect(styles).toContain("@import url(");
    expect(fs.existsSync(path.join(outputRoot, "theme.css"))).toBe(false);
    expect(fs.existsSync(path.join(outputRoot, "katex"))).toBe(false);
  });

  it("styles.css carries the interactive state rules", () => {
    writeStaticAssets({ outputRoot, hasMath: false });

    const styles = fs.readFileSync(path.join(outputRoot, "styles.css"), "utf-8");
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("outline: 2px solid var(--color-accent)");
    expect(styles).toContain(".js nav.is-open");
    expect(styles).toContain("nav a[aria-current=\"page\"]");
    expect(styles).toContain("explorer-active-folder");
    expect(styles).toContain(".toc-list.has-spy a");
  });

  it("removes a stale katex directory when building without math", () => {
    writeStaticAssets({ outputRoot, hasMath: true });
    expect(fs.existsSync(path.join(outputRoot, "katex", "katex.min.css"))).toBe(true);

    writeStaticAssets({ outputRoot, hasMath: false });

    expect(fs.existsSync(path.join(outputRoot, "katex"))).toBe(false);
  });
});

describe("writeSyndication", () => {
  it("writes feed.xml and sitemap.xml when the XML is non-empty", () => {
    writeSyndication({
      outputRoot,
      feedXml: '<rss version="2.0"></rss>',
      sitemapXml: '<urlset></urlset>',
    });

    expect(fs.readFileSync(path.join(outputRoot, "feed.xml"), "utf-8")).toBe(
      '<rss version="2.0"></rss>',
    );
    expect(fs.readFileSync(path.join(outputRoot, "sitemap.xml"), "utf-8")).toBe(
      "<urlset></urlset>",
    );
  });

  it("removes stale feed.xml and sitemap.xml when the XML is empty", () => {
    writeSyndication({ outputRoot, feedXml: "<rss></rss>", sitemapXml: "<urlset></urlset>" });
    expect(fs.existsSync(path.join(outputRoot, "feed.xml"))).toBe(true);
    expect(fs.existsSync(path.join(outputRoot, "sitemap.xml"))).toBe(true);

    writeSyndication({ outputRoot, feedXml: "", sitemapXml: "" });

    expect(fs.existsSync(path.join(outputRoot, "feed.xml"))).toBe(false);
    expect(fs.existsSync(path.join(outputRoot, "sitemap.xml"))).toBe(false);
    expect(fs.readdirSync(outputRoot)).toEqual([]);
  });

  it("prunes each file independently", () => {
    writeSyndication({ outputRoot, feedXml: "", sitemapXml: "<urlset></urlset>" });
    expect(fs.existsSync(path.join(outputRoot, "feed.xml"))).toBe(false);
    expect(fs.readFileSync(path.join(outputRoot, "sitemap.xml"), "utf-8")).toBe("<urlset></urlset>");

    writeSyndication({ outputRoot, feedXml: "<rss></rss>", sitemapXml: "" });
    expect(fs.readFileSync(path.join(outputRoot, "feed.xml"), "utf-8")).toBe("<rss></rss>");
    expect(fs.existsSync(path.join(outputRoot, "sitemap.xml"))).toBe(false);
  });
});

describe("copyPublicAssets", () => {
  it("copies the project public directory into the output root, untransformed", () => {
    const publicDir = path.join(dir, "public");
    writeFile(publicDir, "favicon.ico", "ICONDATA");
    writeFile(publicDir, "robots.txt", "User-agent: *");
    writeFile(publicDir, "assets/site.css", "body{}");
    writeFile(publicDir, "notes.md", "# Not transformed");

    copyPublicAssets(publicDir, { outputRoot });

    expect(fs.readFileSync(path.join(outputRoot, "favicon.ico"), "utf-8")).toBe("ICONDATA");
    expect(fs.readFileSync(path.join(outputRoot, "robots.txt"), "utf-8")).toBe("User-agent: *");
    expect(fs.readFileSync(path.join(outputRoot, "assets", "site.css"), "utf-8")).toBe("body{}");
    expect(fs.readFileSync(path.join(outputRoot, "notes.md"), "utf-8")).toBe("# Not transformed");
  });

  it("is a no-op when the public directory is missing or is a file", () => {
    copyPublicAssets(path.join(dir, "missing-public"), { outputRoot });
    expect(fs.existsSync(outputRoot)).toBe(false);

    const notADir = writeFile(dir, "public.txt", "x");
    copyPublicAssets(notADir, { outputRoot });
    expect(fs.existsSync(outputRoot)).toBe(false);
  });
});
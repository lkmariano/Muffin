import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUTPUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "muffin",
);

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        entries.push(path.relative(dir, full));
      }
    }
  };
  walk(dir);
  return entries.sort();
}

describe("build entrypoint", () => {
  it("imports build.ts without executing the build pipeline or writing files", async () => {
    const logged = vi.spyOn(console, "log").mockImplementation(() => {});
    const before = listFiles(OUTPUT_DIR);

    const mod = await import("../../build.js");

    expect(logged).not.toHaveBeenCalled();
    expect(typeof mod.build).toBe("function");
    expect(typeof mod.assemblePages).toBe("function");
    expect(listFiles(OUTPUT_DIR)).toEqual(before);

    logged.mockRestore();
  });

  it("exposes the reusable Content → Page assembly boundary over the sample vault", async () => {
    const logged = vi.spyOn(console, "log").mockImplementation(() => {});
    const { assemblePages } = await import("../../build.js");

    const result = await assemblePages();

    expect(Object.keys(result).sort()).toEqual(["assets", "contents", "hasMath", "pages"]);
    expect(Array.isArray(result.pages)).toBe(true);
    expect(Array.isArray(result.contents)).toBe(true);
    expect(Array.isArray(result.assets)).toBe(true);
    expect(typeof result.hasMath).toBe("boolean");

    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.pages.length).toBe(result.contents.length);
    expect(new Set(result.pages.map((page) => page.relPath)).size).toBe(result.pages.length);

    for (const page of result.pages) {
      expect(typeof page.path).toBe("string");
      expect(typeof page.relPath).toBe("string");
      expect(typeof page.slug).toBe("string");
      expect(typeof page.title).toBe("string");
      expect(page.title.length).toBeGreaterThan(0);
      expect(page.content.length).toBeGreaterThan(0);
      expect(Array.isArray(page.toc)).toBe(true);
      expect(typeof page.metadata.updated).toBe("string");
      expect(Array.isArray(page.metadata.tags)).toBe(true);
      expect(page.metadata.frontmatter).toBeTypeOf("object");
      if (page.backlinks !== undefined) {
        expect(Array.isArray(page.backlinks)).toBe(true);
      }
    }

    expect(result.pages[0]?.slug).toBeTruthy();
    expect(result.pages[0]?.content).toContain("<h1");
    expect(logged).not.toHaveBeenCalled();

    logged.mockRestore();
  });

  it("assembles deterministically — two runs produce byte-identical pages", async () => {
    const logged = vi.spyOn(console, "log").mockImplementation(() => {});
    const { assemblePages } = await import("../../build.js");

    const first = await assemblePages();
    const second = await assemblePages();

    expect(second.pages).toEqual(first.pages);
    expect(second.contents).toEqual(first.contents);
    expect(second.assets).toEqual(first.assets);

    logged.mockRestore();
  });
});
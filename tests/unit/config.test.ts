import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import { loadConfig, resolveConfig } from "../../src/config/loader.js";
import { DEFAULT_THEME_TOKENS } from "../../src/theme/defaults.js";
import { cleanupTempDir, makeTempDir, writeFile } from "../helpers.js";

let dir: string;

beforeEach(() => {
  dir = makeTempDir();
});

afterEach(() => {
  cleanupTempDir(dir);
});

const envBasePath = process.env.MUFFIN_BASE_PATH ?? "";

describe("loadConfig zero-config defaults", () => {
  it("returns defaults when no config path is given", async () => {
    const config = await loadConfig();
    expect(config.site.title).toBe("Muffin");
    expect(config.site.lang).toBe("en");
    expect(config.site.basePath).toBe(envBasePath);
    expect(config.site.description).toBeUndefined();
    expect(config.content).toEqual({ directory: "./content", exclude: [] });
    expect(config.output).toEqual({ directory: "./muffin" });
    expect(config.homepage).toBeUndefined();
    expect(config.theme).toEqual(DEFAULT_THEME_TOKENS);
  });

  it("returns defaults when the config file is missing", async () => {
    const config = await loadConfig(path.join(dir, "missing.config.ts"));
    expect(config.site.title).toBe("Muffin");
    expect(config.theme).toEqual(DEFAULT_THEME_TOKENS);
  });

  it("returns defaults when the config module cannot be evaluated", async () => {
    writeFile(dir, "broken.config.ts", "this is not valid typescript; >:((");
    const config = await loadConfig(path.join(dir, "broken.config.ts"));
    expect(config.site.title).toBe("Muffin");
    expect(config.theme).toEqual(DEFAULT_THEME_TOKENS);
  });
});

describe("loadConfig with a muffin.config.ts module", () => {
  it("loads the default export and normalizes it", async () => {
    const file = writeFile(
      dir,
      "muffin.config.ts",
      [
        "export default {",
        '  site: { title: "TS Site", lang: "tl", description: "Loaded from TS" },',
        '  content: { directory: "./vault", exclude: ["drafts/**"] },',
        '  homepage: { page: "Projects" },',
        '  output: { directory: "./site-out" },',
        "};",
      ].join("\n"),
    );
    const config = await loadConfig(file);
    expect(config.site).toEqual({
      title: "TS Site",
      lang: "tl",
      description: "Loaded from TS",
      basePath: envBasePath,
    });
    expect(config.content).toEqual({ directory: "./vault", exclude: ["drafts/**"] });
    expect(config.output).toEqual({ directory: "./site-out" });
    expect(config.homepage).toBe("Projects");
  });
});

describe("resolveConfig site identity", () => {
  it("reads site title, lang, description, and basePath", () => {
    const config = resolveConfig({
      site: { title: "My Site", lang: "tl", description: "A description", basePath: "/blog" },
    });
    expect(config.site).toEqual({
      title: "My Site",
      lang: "tl",
      description: "A description",
      basePath: "/blog",
    });
  });

  it("defaults missing site fields and ignores unknown ones", () => {
    const config = resolveConfig({ site: { author: "x" } as never });
    expect(config.site.title).toBe("Muffin");
    expect(config.site.lang).toBe("en");
    expect(config.site.basePath).toBe("");
    expect(config.site.description).toBeUndefined();
  });

  it("falls back to the injected base path when site.basePath is absent", () => {
    const config = resolveConfig({}, { basePath: "/deploy" });
    expect(config.site.basePath).toBe("/deploy");
  });

  it("prefers site.basePath over the injected fallback", () => {
    const config = resolveConfig({ site: { basePath: "/config" } }, { basePath: "/deploy" });
    expect(config.site.basePath).toBe("/config");
  });
});

describe("resolveConfig content and output", () => {
  it("uses defaults when sections are absent", () => {
    const config = resolveConfig({});
    expect(config.content).toEqual({ directory: "./content", exclude: [] });
    expect(config.output).toEqual({ directory: "./muffin" });
  });

  it("reads content directory, exclusions, and output directory", () => {
    const config = resolveConfig({
      content: { directory: "./notes", exclude: ["templates/**", "scratch.md"] },
      output: { directory: "./public" },
    });
    expect(config.content).toEqual({
      directory: "./notes",
      exclude: ["templates/**", "scratch.md"],
    });
    expect(config.output).toEqual({ directory: "./public" });
  });

  it("ignores non-string exclude entries", () => {
    const config = resolveConfig({ content: { exclude: ["drafts/**", 42] } as never });
    expect(config.content.exclude).toEqual(["drafts/**"]);
  });

  it("ignores wrong-typed directory values", () => {
    const config = resolveConfig({ content: { directory: 42 } as never });
    expect(config.content.directory).toBe("./content");
  });
});

describe("resolveConfig homepage", () => {
  it("normalizes the object form to a basename", () => {
    expect(resolveConfig({ homepage: { page: "projects" } }).homepage).toBe("projects");
  });

  it("leaves homepage undefined when absent", () => {
    expect(resolveConfig({}).homepage).toBeUndefined();
  });

  it("ignores malformed homepage values", () => {
    expect(resolveConfig({ homepage: { page: 42 } as never }).homepage).toBeUndefined();
    expect(resolveConfig({ homepage: "projects" as never }).homepage).toBeUndefined();
  });
});

describe("resolveConfig theme token merging", () => {
  it("deep-merges token groups per key, preserving defaults", () => {
    const config = resolveConfig({
      theme: { tokens: { colors: { link: "#ff0000" }, layout: { contentWidth: "720px" } } },
    });
    expect(config.theme.colors.link).toBe("#ff0000");
    expect(config.theme.colors.text).toBe(DEFAULT_THEME_TOKENS.colors.text);
    expect(config.theme.typography).toEqual(DEFAULT_THEME_TOKENS.typography);
    expect(config.theme.radius).toEqual(DEFAULT_THEME_TOKENS.radius);
    expect(config.theme.layout).toEqual({
      ...DEFAULT_THEME_TOKENS.layout,
      contentWidth: "720px",
    });
  });

  it("merges the typography sizes scale independently", () => {
    const config = resolveConfig({
      theme: { tokens: { typography: { sizes: { lg: "18px" }, body: "'Lora', serif" } } },
    });
    expect(config.theme.typography.body).toBe("'Lora', serif");
    expect(config.theme.typography.sizes.lg).toBe("18px");
    expect(config.theme.typography.sizes.md).toBe(DEFAULT_THEME_TOKENS.typography.sizes.md);
  });

  it("ignores unknown token keys and non-string values", () => {
    const config = resolveConfig({
      theme: {
        tokens: {
          colors: { link: "#00ff00", hero: "#000000" } as never,
          layout: { navWidth: 42 } as never,
        },
      },
    });
    expect(config.theme.colors.link).toBe("#00ff00");
    expect("hero" in config.theme.colors).toBe(false);
    expect(config.theme.layout).toEqual(DEFAULT_THEME_TOKENS.layout);
  });

  it("ignores structure that is not an object", () => {
    const config = resolveConfig({ theme: "dark" as never });
    expect(config.theme).toEqual(DEFAULT_THEME_TOKENS);
  });
});
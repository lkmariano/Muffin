import { afterEach, describe, expect, it } from "vitest";
import { resolveSiteUrl, withBasePath } from "../../basePath.js";

const ORIGINAL_BASE_PATH = process.env.MUFFIN_BASE_PATH;
const ORIGINAL_SITE_URL = process.env.MUFFIN_SITE_URL;

afterEach(() => {
  if (ORIGINAL_BASE_PATH === undefined) {
    delete process.env.MUFFIN_BASE_PATH;
  } else {
    process.env.MUFFIN_BASE_PATH = ORIGINAL_BASE_PATH;
  }
  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.MUFFIN_SITE_URL;
  } else {
    process.env.MUFFIN_SITE_URL = ORIGINAL_SITE_URL;
  }
});

describe("withBasePath", () => {
  it("returns the path unchanged when no base path is set", () => {
    delete process.env.MUFFIN_BASE_PATH;
    expect(withBasePath("/styles.css")).toBe("/styles.css");
  });

  it("prefixes MUFFIN_BASE_PATH and strips a trailing slash", () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    expect(withBasePath("/styles.css")).toBe("/Muffin/styles.css");

    process.env.MUFFIN_BASE_PATH = "/Muffin/";
    expect(withBasePath("/a.md")).toBe("/Muffin/a.md");
  });

  it("lets an explicit basePath override the environment", () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    expect(withBasePath("/a.md", "/blog")).toBe("/blog/a.md");
  });
});

describe("resolveSiteUrl", () => {
  it("falls back to the passed fallback when MUFFIN_SITE_URL is unset", () => {
    delete process.env.MUFFIN_SITE_URL;
    expect(resolveSiteUrl("https://example.com")).toBe("https://example.com");
  });

  it("prefers MUFFIN_SITE_URL read at call time", () => {
    process.env.MUFFIN_SITE_URL = "https://author.example.com";
    expect(resolveSiteUrl("https://example.com")).toBe("https://author.example.com");
  });

  it("strips trailing slashes so origin composes cleanly", () => {
    process.env.MUFFIN_SITE_URL = "https://author.example.com/";
    expect(resolveSiteUrl("https://example.com")).toBe("https://author.example.com");
  });

  it("treats an empty MUFFIN_SITE_URL as unset", () => {
    process.env.MUFFIN_SITE_URL = "";
    expect(resolveSiteUrl("https://example.com")).toBe("https://example.com");
  });
});
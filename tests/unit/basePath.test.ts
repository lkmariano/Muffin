import { afterEach, describe, expect, it } from "vitest";
import { withBasePath } from "../../basePath.js";

const ORIGINAL_BASE_PATH = process.env.MUFFIN_BASE_PATH;

afterEach(() => {
  if (ORIGINAL_BASE_PATH === undefined) {
    delete process.env.MUFFIN_BASE_PATH;
  } else {
    process.env.MUFFIN_BASE_PATH = ORIGINAL_BASE_PATH;
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
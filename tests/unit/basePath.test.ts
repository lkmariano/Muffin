import { beforeEach, describe, expect, it, vi } from "vitest";

describe("withBasePath", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns the path unchanged when no base path is set", async () => {
    delete process.env.MUFFIN_BASE_PATH;
    const { withBasePath } = await import("../../basePath.js");
    expect(withBasePath("/styles.css")).toBe("/styles.css");
  });

  it("prefixes the base path when set", async () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const { withBasePath } = await import("../../basePath.js");
    expect(withBasePath("/styles.css")).toBe("/Muffin/styles.css");
  });

  it("strips a trailing slash from the base path", async () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin/";
    const { withBasePath } = await import("../../basePath.js");
    expect(withBasePath("/a.md")).toBe("/Muffin/a.md");
  });
});
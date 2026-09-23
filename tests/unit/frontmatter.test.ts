import { describe, expect, it } from "vitest";
import {
  normalizeAliases,
  normalizeTags,
  resolvePageTitle,
} from "../../src/content/frontmatter.js";

describe("normalizeTags", () => {
  it("wraps a non-empty string in an array and returns [] for an empty string", () => {
    expect(normalizeTags("programming")).toEqual(["programming"]);
    expect(normalizeTags("")).toEqual([]);
  });

  it("filters an array to trimmed valid strings, preserving order and casing", () => {
    expect(normalizeTags(["TypeScript", "", "muffin", 123, null, undefined, "Programming"])).toEqual(
      ["TypeScript", "muffin", "Programming"],
    );
    expect(normalizeTags([])).toEqual([]);
  });

  it("strips a leading # from Obsidian-style tags", () => {
    expect(normalizeTags(["#technical", "#writings"])).toEqual(["technical", "writings"]);
    expect(normalizeTags("#guide")).toEqual(["guide"]);
    expect(normalizeTags([" #a ", "#b"])).toEqual(["a", "b"]);
  });

  it("deduplicates tags after normalization, keeping the first occurrence", () => {
    expect(normalizeTags(["technical", "#technical"])).toEqual(["technical"]);
    expect(normalizeTags(["#a", "a", "#a"])).toEqual(["a"]);
  });

  it("returns an empty array for non-string, non-array input", () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags(42)).toEqual([]);
    expect(normalizeTags(true)).toEqual([]);
    expect(normalizeTags({ t: "a" })).toEqual([]);
  });
});

describe("normalizeAliases", () => {
  it("accepts a YAML list with trimming and deduplication", () => {
    expect(
      normalizeAliases({ aliases: ["Alias One", " Alias Two ", "Alias One"] }),
    ).toEqual(["Alias One", "Alias Two"]);
  });

  it("accepts a single string alias", () => {
    expect(normalizeAliases({ aliases: "Just One" })).toEqual(["Just One"]);
  });

  it("does not strip a leading # (aliases are names, not tags)", () => {
    expect(normalizeAliases({ aliases: ["#tag-like"] })).toEqual(["#tag-like"]);
  });

  it("returns [] when aliases is absent, empty, or null", () => {
    expect(normalizeAliases({})).toEqual([]);
    expect(normalizeAliases({ aliases: [] })).toEqual([]);
    expect(normalizeAliases({ aliases: null })).toEqual([]);
  });

  it("drops non-string entries", () => {
    expect(normalizeAliases({ aliases: ["a", 42, null, undefined, "b"] })).toEqual(["a", "b"]);
  });
});

describe("resolvePageTitle", () => {
  it("prefers an explicit non-empty frontmatter title", () => {
    expect(resolvePageTitle({ title: "Custom Title" }, "/vault/Page.md")).toBe("Custom Title");
  });

  it("falls back to the filename-derived title", () => {
    expect(resolvePageTitle({}, "/vault/Page.md")).toBe("Page");
    expect(resolvePageTitle({ title: undefined }, "/vault/Page.md")).toBe("Page");
  });

  it("falls back on an empty frontmatter title", () => {
    expect(resolvePageTitle({ title: "" }, "/vault/Page.md")).toBe("Page");
  });

  it("falls back on a non-string frontmatter title", () => {
    expect(resolvePageTitle({ title: 42 }, "/vault/Page.md")).toBe("Page");
    expect(resolvePageTitle({ title: ["x"] }, "/vault/Page.md")).toBe("Page");
    expect(resolvePageTitle({ title: { text: "x" } }, "/vault/Page.md")).toBe("Page");
  });
});
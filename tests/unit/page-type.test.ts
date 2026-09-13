import { describe, expect, it } from "vitest";
import { resolvePageType } from "../../src/domain/page.js";

describe("resolvePageType", () => {
  it("defaults to note when the type is missing", () => {
    expect(resolvePageType({})).toBe("note");
  });

  it("maps the three valid types case-insensitively", () => {
    expect(resolvePageType({ type: "portfolio" })).toBe("portfolio");
    expect(resolvePageType({ type: "home" })).toBe("home");
    expect(resolvePageType({ type: "note" })).toBe("note");
  });

  it("defaults to note for unknown or non-string values", () => {
    expect(resolvePageType({ type: "podcast" })).toBe("note");
    expect(resolvePageType({ type: 42 })).toBe("note");
    expect(resolvePageType({ type: null })).toBe("note");
  });
});
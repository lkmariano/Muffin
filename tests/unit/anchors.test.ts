import { describe, expect, it } from "vitest";
import {
  assignBlockIds,
  assignHeadingIds,
  headingSlug,
  normalizeReferenceFragment,
} from "../../src/content/anchors.js";

describe("headingSlug", () => {
  it("lowercases and combines digits, letters, and whitespace into a hyphenated slug", () => {
    expect(headingSlug("Some Heading 2")).toBe("some-heading-2");
    expect(headingSlug("Hello   World")).toBe("hello-world");
  });

  it("strips punctuation and honors Unicode letters", () => {
    expect(headingSlug("Héllo, World!")).toBe("héllo-world");
  });

  it("falls back to the raw text when nothing remains", () => {
    expect(headingSlug("***")).toBe("***");
  });
});

describe("normalizeReferenceFragment", () => {
  it("prefixes block fragments with a caret and slugifies headings", () => {
    expect(normalizeReferenceFragment({ type: "block", text: "note-1" })).toBe("^note-1");
    expect(normalizeReferenceFragment({ type: "heading", text: "Some Heading" })).toBe(
      "some-heading",
    );
  });
});

describe("assignHeadingIds", () => {
  it("assigns heading ids in document order, suffixing duplicates", () => {
    const root = rootWith(
      heading("Same"),
      heading("Other"),
      heading("Same"),
      heading("Same"),
    );

    assignHeadingIds(root);

    const ids = root.children.map((node: any) => node.data.hProperties.id);
    expect(ids).toEqual(["same", "other", "same-1", "same-2"]);
  });
});

describe("assignBlockIds", () => {
  it("strips the marker and anchors the paragraph carrying it", () => {
    const root = rootWith(paragraph("Body text ^my-block"));

    assignBlockIds(root);

    const para = root.children[0];
    expect(para.children).toEqual([{ type: "text", value: "Body text" }]);
    expect(para.data.blockId).toBe("my-block");
    expect(para.data.hProperties.id).toBe("^my-block");
  });

  it("anchors the parent list item for tightly wrapped paragraphs", () => {
    const root: any = {
      type: "root",
      children: [
        {
          type: "list",
          children: [
            { type: "listItem", children: [paragraph("Item text ^item-block")] },
          ],
        },
      ],
    };

    assignBlockIds(root);

    const item = root.children[0].children[0];
    expect(item.data.blockId).toBe("item-block");
    expect(item.data.hProperties.id).toBe("^item-block");
  });

  it("lets the first occurrence win and never anchors headings", () => {
    const root = rootWith(
      paragraph("First ^dup"),
      paragraph("Second ^dup"),
      heading("A heading ^never-block"),
    );

    assignBlockIds(root);

    const [first, second, headingNode] = root.children as any[];
    expect(first.children).toEqual([{ type: "text", value: "First" }]);
    expect(first.data.blockId).toBe("dup");
    expect(second.children).toEqual([{ type: "text", value: "Second" }]);
    expect(second.data).toBeUndefined();
    expect(headingNode.data).toBeUndefined();
  });
});

function heading(text: string): any {
  return { type: "heading", depth: 2, children: [{ type: "text", value: text }] };
}

function paragraph(text: string): any {
  return { type: "paragraph", children: [{ type: "text", value: text }] };
}

function rootWith(...children: any[]): any {
  return { type: "root", children };
}
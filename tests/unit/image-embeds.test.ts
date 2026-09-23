import { afterEach, describe, expect, it } from "vitest";
import {
  assetUrl,
  imageEmbedPlugin,
  isSupportedImageFormat,
  resolveImageEmbed,
} from "../../plugins/image-embeds.js";

const ORIGINAL_BASE_PATH = process.env.MUFFIN_BASE_PATH;

afterEach(() => {
  if (ORIGINAL_BASE_PATH === undefined) {
    delete process.env.MUFFIN_BASE_PATH;
  } else {
    process.env.MUFFIN_BASE_PATH = ORIGINAL_BASE_PATH;
  }
});

describe("resolveImageEmbed", () => {
  it("resolves an exact relPath match", () => {
    const assets = ["images/test.png", "notes/pic.jpg"];
    expect(resolveImageEmbed("notes/example.md", "images/test.png", assets)).toBe(
      "images/test.png",
    );
  });

  it("resolves by basename and prefers a duplicate in the source folder", () => {
    const assets = ["a/pic.png", "b/pic.png"];
    expect(resolveImageEmbed("a/note.md", "pic.png", assets)).toBe("a/pic.png");
    expect(resolveImageEmbed("b/deep/note.md", "pic.png", assets)).toBe("b/pic.png");
  });

  it("returns undefined when no asset matches", () => {
    expect(resolveImageEmbed("notes/example.md", "missing.png", ["images/test.png"])).toBeUndefined();
  });
});

describe("assetUrl", () => {
  it("returns a root-relative asset URL applying the base path and normalizing separators", () => {
    expect(assetUrl("images/test.png")).toBe("/images/test.png");
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    expect(assetUrl("folder/my pic.jpg")).toBe("/Muffin/folder/my pic.jpg");
    delete process.env.MUFFIN_BASE_PATH;
    expect(assetUrl("images\\test.png")).toBe("/images/test.png");
  });
});

describe("isSupportedImageFormat", () => {
  it("accepts supported image formats and rejects non-images", () => {
    for (const name of ["image.png", "photo.jpg", "photo.JPEG", "anim.gif", "icon.webp", "img.svg"]) {
      expect(isSupportedImageFormat(name)).toBe(true);
    }
    for (const name of ["clip.mp4", "web.webm", "doc.pdf", "audio.mp3", "data.txt"]) {
      expect(isSupportedImageFormat(name)).toBe(false);
    }
  });
});

describe("imageEmbedPlugin", () => {
  it("converts a resolved embed into an image node with alt and width", () => {
    const tree = textTree("See ![[test.png|300]].");
    imageEmbedPlugin(["images/test.png"], "notes/example.md")(tree);

    const image = expectImage(tree);
    expect(image.url).toBe("images/test.png");
    expect(image.alt).toBe("test");
    expect(image.data.hProperties).toEqual({ width: 300 });
  });

  it("ignores non-integer size aliases", () => {
    const tree = textTree("![[test.png|wide]]");
    imageEmbedPlugin(["images/test.png"], "x.md")(tree);

    expect(expectImage(tree).data.hProperties).toBeUndefined();
  });

  it("leaves standard markdown images untouched", () => {
    const tree: any = {
      type: "root",
      children: [{ type: "paragraph", children: [{ type: "image", url: "plain.png", alt: "alt" }] }],
    };
    imageEmbedPlugin(["plain.png"], "x.md")(tree);

    expect(tree.children[0].children[0].data).toBeUndefined();
  });

  it("converts embeds inside list items", () => {
    const tree: any = {
      type: "root",
      children: [
        {
          type: "list",
          children: [
            {
              type: "listItem",
              children: [{ type: "paragraph", children: [{ type: "text", value: "![[a.png]]" }] }],
            },
          ],
        },
      ],
    };
    imageEmbedPlugin(["a.png"], "x.md")(tree);

    const item = tree.children[0].children[0].children[0];
    expect(item.children[0].type).toBe("image");
  });
});

function textTree(value: string): any {
  return {
    type: "root",
    children: [{ type: "paragraph", children: [{ type: "text", value }] }],
  };
}

function expectImage(tree: any): any {
  const image = tree.children[0].children.find((child: any) => child.type === "image");
  expect(image).toBeDefined();
  return image;
}
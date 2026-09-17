import { describe, expect, it } from "vitest";
import {
  assetUrl,
  imageEmbedPlugin,
  imageEmbedUrlPlugin,
  isSupportedImageFormat,
  resolveImageEmbed,
} from "../../plugins/image-embeds.js";

describe("resolveImageEmbed", () => {
  it("resolves an exact relPath match", () => {
    const assets = ["images/test.png", "notes/pic.jpg"];
    expect(resolveImageEmbed("notes/example.md", "images/test.png", assets)).toBe(
      "images/test.png",
    );
  });

  it("resolves by basename when the relPath differs", () => {
    const assets = ["images/test.png"];
    expect(resolveImageEmbed("notes/example.md", "test.png", assets)).toBe(
      "images/test.png",
    );
  });

  it("returns undefined when no asset matches", () => {
    expect(resolveImageEmbed("notes/example.md", "missing.png", ["images/test.png"])).toBeUndefined();
  });

  it("prefers the duplicate in the same folder over others", () => {
    const assets = ["a/pic.png", "b/pic.png"];
    expect(resolveImageEmbed("a/note.md", "pic.png", assets)).toBe("a/pic.png");
  });

  it("walks up the folder tree to find a duplicate", () => {
    const assets = ["a/pic.png", "b/pic.png"];
    expect(resolveImageEmbed("b/deep/note.md", "pic.png", assets)).toBe("b/pic.png");
  });
});

describe("assetUrl", () => {
  it("returns a root-relative asset URL", () => {
    expect(assetUrl("images/test.png", "")).toBe("/images/test.png");
  });

  it("preserves spaces in the relPath", () => {
    expect(assetUrl("folder/my pic.jpg", "")).toBe("/folder/my pic.jpg");
  });

  it("applies an explicit base path", () => {
    expect(assetUrl("images/test.png", "/Muffin")).toBe("/Muffin/images/test.png");
  });

  it("normalizes backslashes to forward slashes", () => {
    expect(assetUrl("images\\test.png", "")).toBe("/images/test.png");
  });
});

describe("isSupportedImageFormat", () => {
  it("accepts every supported image format including mixed case", () => {
    for (const name of [
      "image.png",
      "photo.jpg",
      "photo.JPEG",
      "anim.gif",
      "icon.webp",
      "img.svg",
      "animation.GIF",
    ]) {
      expect(isSupportedImageFormat(name)).toBe(true);
    }
  });

  it("rejects non-image asset formats", () => {
    for (const name of ["clip.mp4", "web.webm", "clip.mov", "doc.pdf", "audio.mp3", "audio.wav", "data.txt"]) {
      expect(isSupportedImageFormat(name)).toBe(false);
    }
  });
});

describe("imageEmbedPlugin", () => {
  it("does not transform a resolved embed whose format is not a supported image", () => {
    const tree = textTree("![[clip.mp4]]");
    imageEmbedPlugin(["clip.mp4"], "x.md")(tree);

    const image = expectImage(tree);
    expect(image.data.isImageEmbed).toBe(true);
    expect(image.data.isUnresolvedEmbed).toBe(true);
    expect(image.data.embedText).toBe("![[clip.mp4]]");
  });
  it("converts a resolved embed into an image node", () => {
    const tree = textTree("See ![[test.png]].");
    imageEmbedPlugin(["images/test.png"], "notes/example.md")(tree);

    const image = expectImage(tree);
    expect(image.url).toBe("images/test.png");
    expect(image.alt).toBe("test");
    expect(image.data.isImageEmbed).toBe(true);
  });

  it("resolves a folder-qualified embed target", () => {
    const tree = textTree("See ![[images/test.png]].");
    imageEmbedPlugin(["images/test.png"], "notes/example.md")(tree);

    expect(expectImage(tree).url).toBe("images/test.png");
  });

  it("sets alt to the basename without its extension", () => {
    const tree = textTree("![[folder/photo.png]]");
    imageEmbedPlugin(["folder/photo.png"], "x.md")(tree);

    expect(expectImage(tree).alt).toBe("photo");
  });

  it("parses |300 into a width property", () => {
    const tree = textTree("![[test.png|300]]");
    imageEmbedPlugin(["images/test.png"], "x.md")(tree);

    expect(expectImage(tree).data.hProperties).toEqual({ width: 300 });
  });

  it("ignores a non-integer size alias", () => {
    const tree = textTree("![[test.png|wide]]");
    imageEmbedPlugin(["images/test.png"], "x.md")(tree);

    expect(expectImage(tree).data.hProperties).toBeUndefined();
  });

  it("keeps unresolved embeds as image nodes marked unresolved", () => {
    const tree = textTree("![[missing.png]]");
    imageEmbedPlugin(["images/test.png"], "x.md")(tree);

    const image = expectImage(tree);
    expect(image.data.isImageEmbed).toBe(true);
    expect(image.data.isUnresolvedEmbed).toBe(true);
    expect(image.data.embedText).toBe("![[missing.png]]");
  });

  it("converts multiple embeds in one paragraph", () => {
    const tree = textTree("![[a.png]] and ![[b.png]]");
    imageEmbedPlugin(["a.png", "b.png"], "x.md")(tree);

    const images = tree.children[0].children.filter(
      (child: any) => child.type === "image",
    );
    expect(images).toHaveLength(2);
    expect(images[0].url).toBe("a.png");
    expect(images[1].url).toBe("b.png");
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

  it("leaves standard markdown images untouched", () => {
    const tree: any = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "image", url: "plain.png", alt: "alt" }],
        },
      ],
    };
    imageEmbedPlugin(["plain.png"], "x.md")(tree);

    expect(tree.children[0].children[0].data).toBeUndefined();
  });
});

describe("imageEmbedUrlPlugin", () => {
  it("rewrites only embed image urls to root-relative asset urls", () => {
    const tree: any = {
      type: "root",
      children: [
        { type: "image", url: "images/test.png", data: { isImageEmbed: true }, alt: "test" },
        { type: "image", url: "plain.png", alt: "alt" },
      ],
    };

    imageEmbedUrlPlugin("")(tree);

    expect(tree.children[0].url).toBe("/images/test.png");
    expect(tree.children[1].url).toBe("plain.png");
  });

  it("applies an explicit base path to embed urls", () => {
    const tree: any = {
      type: "root",
      children: [{ type: "image", url: "images/test.png", data: { isImageEmbed: true }, alt: "test" }],
    };

    imageEmbedUrlPlugin("/Muffin")(tree);

    expect(tree.children[0].url).toBe("/Muffin/images/test.png");
  });

  it("replaces unresolved embeds with the literal source text", () => {
    const tree: any = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "image",
              url: "missing.png",
              alt: "missing.png",
              data: { isImageEmbed: true, isUnresolvedEmbed: true, embedText: "![[missing.png]]" },
            },
          ],
        },
      ],
    };

    imageEmbedUrlPlugin("")(tree);

    expect(tree.children[0].children[0]).toEqual({ type: "text", value: "![[missing.png]]" });
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
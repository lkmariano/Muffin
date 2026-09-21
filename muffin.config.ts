import { defineConfig } from "muffin";

// Muffin works with no config file at all — everything below is optional and
// falls back to neutral Muffin defaults. This file demonstrates the surface.
export default defineConfig({
  site: {
    title: "Muffin",
    // description: "A short site description",
    lang: "en",
    // If unset, Muffin falls back to MUFFIN_BASE_PATH (used by the GitHub
    // Pages deploy workflow), then to "".
  },

  content: {
    directory: "./content",
    // Glob patterns, relative to the content directory, to leave out of the
    // build (markdown and assets alike).
    exclude: [],
  },

  // Optional: basename of the source page aliased to index.html. When
  // omitted, Muffin prefers home.md, then index.md.
  homepage: { page: "Home" },

  theme: {
    // Semantic design tokens. Every group and key is optional; unknown keys
    // are ignored and non-string values fall back to the default. Each token
    // becomes a CSS custom property in theme.css, e.g.
    //   colors.text        -> --color-text
    //   typography.baseSize -> --typography-base-size
    //   layout.contentWidth -> --layout-content-width
    tokens: {
      colors: {
        // text, muted, background, link, border, accent,
        // code, codeBackground, codeBorder
      },
      typography: {
        // body, heading, mono (font-family stacks);
        // baseSize, lineHeight, weight, headingWeight;
        // sizes: { xs, sm, md, lg, xl, "2xl" }
      },
      spacing: {
        // final scale "1".."7" -> --spacing-1 .. --spacing-7 (2px..50px)
      },
      layout: {
        // contentWidth, mainWidth, navWidth, asideWidth, sidebarInset
      },
      radius: {
        // sm, md (v1 default radius is 0)
      },
    },
  },

  output: {
    directory: "./muffin",
  },
});
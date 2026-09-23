---
tags:
  - #guide
  - #build
---

# Usage

Muffin turns the Markdown files in `content/` into a static website inside
`muffin/`.

Run these commands from the project root:

- **Build:** `npx tsx build.ts`
- **Test:** `npm test`

The site's identity and paths live in `src/site.ts` (site title, content
directory, homepage, output directory). Two environment knobs adjust the build
at run time: `MUFFIN_BASE_PATH` (a URL prefix for sub-path deployments) and
`MUFFIN_SITE_URL` (the site origin that enables `feed.xml`/`sitemap.xml`).

## Where things live

- `content/` — your vault. Every `.md` file becomes a page.
- `muffin/` — the generated site, rebuilt on every build.
- `templates/` — `page.html` (the HTML shell with `{{TOKEN}}` placeholders) and
  `styles.css` (the theme).
- `src/` — Muffin's engine: content parsing, the link graph, rendering, output.
- `src/presentation/renderSitePage.ts` — **the renderer you edit.**

## Step 1 — build something

Add a Markdown file, for example `content/About.md`:

```markdown
# About

Welcome. Back to [[Home]].
```

Then build:

```bash
npx tsx build.ts
```

`muffin/About.html` now exists, reachable from the Explorer and from [[Home]].

## Step 2 — meet your renderer

`build.ts` renders every page through a `PageRenderer` — a function taking
`(context, template) => string`. By default it uses the shipped `renderSitePage`
in `src/presentation/renderSitePage.ts`, which is a transparent pass-through to
Muffin's stock shell (`renderPage`). That single file is yours to edit — it is
the one place that controls how pages look.

## Step 3 — give a page a type

Frontmatter is preserved verbatim on every page and never interpreted by Muffin.
Add any value you like:

```markdown
---
type: writings
---

# My First Post
```

Muffin does not know what `type: writings` means. Your renderer decides.

## Step 4 — make the type look different

Open `src/presentation/renderSitePage.ts` and branch on the value:

```ts
export const renderSitePage: PageRenderer = (context, template) => {
  if (context.page.metadata.frontmatter.type === "writings") {
    return `<article class="writings">${context.page.content}</article>`;
  }
  return renderPage(context, template); // the stock shell for everything else
};
```

`context` carries everything a page knows: `context.page` (content HTML,
metadata, TOC, backlinks), `context.site`, `context.explorerHtml`, and flags
such as `hasMath`. Anything you don't special-case falls back to `renderPage`,
so you keep Muffin's shell, navigation, and TOC for free. To ship a fully
custom renderer instead, pass it to `build()`:

```ts
import { build } from "./build.ts";

await build({ renderer: renderSitePage });
```

## Step 5 — derive pages from all pages

`assemblePages()` is Muffin's reusable Content → Page boundary. It returns
every page without writing anything, so you can build cross-page artifacts
yourself:

```ts
import { assemblePages } from "./build.ts";

const { pages } = await assemblePages();
const posts = pages.filter((p) => p.metadata.frontmatter.type === "writings");
```

Build a `/posts/` index from `posts` and write it with `writePages`, or render
an index as a normal page and let its own `type` pick the layout — the choice
is the site's, never Muffin's.

See [[Markdown Flavors]] for what the parser understands and [[Wikilinks]] for
how notes link together. For theming and custom page styles, see
[[Styling Your Pages]]. Back to [[Home]].
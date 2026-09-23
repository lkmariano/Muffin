# Muffin

A barebones static site generator built in Node.js + TypeScript for Obsidian vaults, supporting nested folders, wikilinks, backlinks, and an explorer navigation tree.

## Status: Core pipeline working end-to-end

Point Muffin at a `content/` folder of markdown files and it will:

- discover files recursively (nested folders supported)
- resolve `[[wikilinks]]` against real files (same-folder-first tie-breaking for duplicate filenames)
- compute backlinks
- build an explorer/navigation tree from the folder structure
- render each page through an HTML template
- write real `.html` files to `muffin/`, mirroring the folder structure
- **prune stale output**: deleting a `.md` source removes its generated `.html` on the next build
- copy vault images/PDFs into the output and embed them with `![[...]]`
- copy a project-level `public/` directory through verbatim (favicons, robots.txt, site CSS, ...)
- render GFM, KaTeX math (emitted only when the vault contains math), callouts, highlights/comments, and `[[note#Heading]]`/`[[note#^block-id]]` references
- render a per-page table of contents (H1–H3) and a backlinks section in the right-sidebar
- highlight the current page and its ancestor folders in the Explorer (server-rendered, `aria-current`)
- emit an RSS 2.0 `feed.xml` and an XML `sitemap.xml` when a site origin is configured (`SITE.url` / `MUFFIN_SITE_URL`), with absolute, base-path-aware URLs per page
- persist Explorer folder state across visits (`localStorage`, scoped per `basePath`)
- highlight scrolled-through TOC headings (dimmed until passed) with an on-page scroll-spy
- collapse the Explorer into a `≤899px` off-canvas drawer nav with a burger button on the top bar
- mark keyboard focus site-wide and give `focus-visible` a visible ring

## Zero Configuration

Muffin works with no configuration at all. Site identity and paths are
compile-time constants in `src/site.ts`, and the build-time knobs are the
`MUFFIN_BASE_PATH` environment variable (GitHub Pages sub-path prefixing) and
the `MUFFIN_SITE_URL` environment variable (site origin enabling
`feed.xml`/`sitemap.xml`); `MUFFIN_SITE_URL` falls back to `SITE.url`, which is
`""` by default (feeds disabled):

- the full Muffin v1 theme lives in the self-contained `templates/styles.css`
  (dark colors, Instrument Sans typography 400/600/700, `630px` content measure)
- site title `Muffin`, language `en`
- a homepage derived from `Home.md` (falling back to `home.md`/`index.md`),
  aliased to `index.html`

The repository ships a small sample vault in `content/` to demonstrate nested folders, wikilinks, and backlinks. Replace it with your own content — Muffin makes no assumptions about a particular site's identity or design.

## Configuration

There is no configuration file. Everything lives in `src/site.ts`:

```ts
export const SITE = { title: "Muffin", lang: "en", url: "" };
export const CONTENT_DIRECTORY = "./content";
export const EXCLUDE_GLOBS: string[] = [];
export const HOMEPAGE = "Home"; // basename of the page aliased to index.html
export const OUTPUT_DIRECTORY = "./muffin";
```

`url` is the site origin used for absolute RSS/sitemap URLs (`""` keeps feeds
disabled); `MUFFIN_SITE_URL` overrides it at build time. Change the constants to
point at your vault and site; the GitHub Pages workflow (`deploy.yaml`) sets
`MUFFIN_BASE_PATH: /Muffin` (the sub-path) and
`MUFFIN_SITE_URL: https://${{ github.repository_owner }}.github.io` (the bare
origin) so feed/sitemap absolute URLs compose as `origin + basePath + path`
without duplicating `/Muffin`.

## Commands

- **Build:** `npx tsx build.ts` (equivalent to `await build()`)
- **Test:** `npm test`

## Extending presentation for your own site

`build.ts` is safely importable and exposes two seams:

- `assemblePages()` — the reusable Content → Page boundary. It returns fully
  assembled `Page[]` (metadata, rendered content, TOC, backlinks, paths, title),
  plus contents, assets, and the site-wide math flag — never earlier pipeline
  state, and it performs no output writes.
- `build({ renderer? })` — the high-level build command. Pass a `PageRenderer`
  (`(context, template) => string`) to choose per-page presentation; without
  one it routes every page through Muffin's shipped default renderer,
  `src/presentation/renderSitePage.ts`.

Right out of the box, every page renders through that single file — a
transparent pass-through to Muffin's stock shell (`renderPage`), whose doc
comment is the guided place to branch on your own frontmatter. Muffin only
preserves frontmatter verbatim in `Page.metadata.frontmatter`; it never decides
what your values mean:

```ts
import { build, assemblePages } from "./build.ts";
import { renderPage } from "./src/rendering/page.js";
import type { PageRenderer } from "./src/rendering/context.js";

const renderSitePage: PageRenderer = (context, template) => {
  // "type: writings" means nothing to Muffin — your site decides:
  if (context.page.metadata.frontmatter.type === "writings") {
    return `<article>${context.page.content}</article>`;
  }
  return renderPage(context, template); // stock shell for everything else
};

const { pages } = await assemblePages(); // cross-page work, e.g. a writings index

await build({ renderer: renderSitePage });
```

## Architecture

```
(compile-time constants in src/site.ts + MUFFIN_BASE_PATH/MUFFIN_SITE_URL env)
content/*.md
  → assemblePages()          the reusable Content → Page boundary:
  →   loadContent()            CONTENT_DIRECTORY + EXCLUDE_GLOBS → LoadedContent[] + assets
  →   slugMap                  slug → [candidate file paths] (supports duplicate filenames)
  →   parseMarkdown()          body → shared mdast tree (wikilinks + embeds resolved once)
  →   buildTargetIndex()       heading/block anchors from the parsed ASTs
  →   buildSiteGraph()         forward/back links from the parsed ASTs
  →   renderMarkdownTree()     same trees → HTML (GFM, KaTeX, callouts)
  →   returns { pages, contents, assets, hasMath }   (assembled Page[] — no writes, no AST)
  → build({ renderer? })     the high-level build command (default renderer: renderSitePage)
  →   buildExplorerTree()      from relPath, no filesystem access → explorer HTML
  →   createPresentationContext()  page + SITE + explorer → PresentationContext
  →   PageRenderer()           context + template → HTML shell (injected at the composition root)
  →   writePages()             writes .html to OUTPUT_DIRECTORY, resolves HOMEPAGE, prunes stale output
  →   writeStaticAssets()      copies the self-contained styles.css + KaTeX assets when math present
  →   writeSyndication()       feed.xml/sitemap.xml via renderRssFeed/renderSitemap when an origin resolves
  →   copyAssets()             copies vault images/PDFs into the output
  →   copyPublicAssets()       copies ./public through verbatim (project-level passthrough)
```

Pipeline order matters: site constants and the `MUFFIN_BASE_PATH`/`MUFFIN_SITE_URL`
envs are the only inputs. `withBasePath` reads the env at call time, so every
generated URL (wikilink hrefs, asset embeds, explorer links, styles.css/KaTeX
hrefs, and the `<body data-base-path>` scoping hook) picks it up uniformly;
`resolveSiteUrl` does the same for the RSS/sitemap origin. `buildSiteGraph`
must run before `renderMarkdownTree` because rendering mutates the shared
markdown AST.

## Page Shell

Each page renders through `templates/page.html`. The `<body>` carries `data-slug`, `data-relpath` (the page's canonical identity, used for current-page highlighting and also read by the Explorer persistence script) and `data-base-path` (the `MUFFIN_BASE_PATH` env, scoping storage keys). Muffin ships no site-specific page types such as "portfolio" or "home" — but per-page presentation is yours to own: an injectable `PageRenderer` at the composition root can pick a layout from arbitrary frontmatter (`type: writings`, …), falling back to `renderPage`. Pages render from a generic `PresentationContext` (page + `SITE` + explorer HTML), so templates never touch raw build data — the three-column layout, per-page TOC, and backlinks are defined entirely by the template, the stylesheet, and the page model.

The template ships three tiny standalone client scripts (all gated so the page works without JS): one persists Explorer folder `details` state (keyed as `muffin:explorer:v1:{basePath}`), one opens the `≤899px` burger drawer, and one drives the TOC scroll-spy (`.has-spy`/`.is-passed`, `aria-current="location"`). Current-page highlighting needs no script — it is rendered per page at build time. All storage access is wrapped in try/catch so the page works even when storage is unavailable.

Template tokens: `{{TITLE}}`, `{{CONTENT}}`, `{{TOC}}`, `{{BACKLINKS}}`, `{{NAV}}`, `{{CSS}}`, `{{KATEX_CSS}}`, `{{RSS_LINK}}`, `{{PAGE_META}}`, `{{TAGS}}`, `{{SITE_TITLE}}`, `{{LANG}}`, `{{SITE_DESCRIPTION}}`, `{{BODY_ATTRS}}`.
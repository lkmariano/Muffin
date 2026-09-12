# AGENTS.md — Muffin

A barebones static site generator for Obsidian vaults (markdown → HTML) built in
Node.js + TypeScript. Single entrypoint: `build.ts`.

This file describes the current codebase — structure, commands, and conventions.
The design philosophy and architectural direction live in `ARCHITECTURE.md`.

## Build & Verify

- **Build command:** `npx tsx build.ts` (tsx runs TS directly — no compile step)
- **Test command:** `npm test` (runs `vitest run`)
- **Verification loop:** After every file change, run the build and tests. If
  either fails, fix the error and re-run. DO NOT mark work complete while
  the build or tests throw.

## Architecture Rules

Modular Monolith with a strictly unidirectional dependency pipeline:

```
Configuration → Content → Transformers → Site Graph → Renderer → Output
```

- **Content boundary:** `src/content/loader.ts` is the only module that
  discovers and reads source-vault files; it emits `LoadedContent[]` + `slugMap`
  with a validated root-relative `relPath`. Other layers consume that output
  rather than accessing `./content`.
- **Renderer restriction:** code in rendering/layout layers MUST NOT import `fs`
  or perform direct filesystem operations.
- **Data isolation:** keep data parsing/page-structure definitions entirely
  separate from HTML generation.
- **Composition root:** `build.ts` wires discovery → parse → graph → render →
  output and may assemble `Page` objects; it must not own the implementation of
  those stages.
- **Page model:** everything maps to a structured `Page` object —
  `{ path, title, metadata, content, backlinks? }`, with
  `Backlink = { title, href }`. Do not pass raw strings between modules.
  The domain `Page` model lives in `src/domain/page.ts`.

  (These rules follow the principles in `ARCHITECTURE.md` §1.)

## Architecture Reference

`ARCHITECTURE.md` is Muffin's design philosophy and architectural direction — it
describes principles, not the current code (AGENTS.md documents the current state).

Consult it when planning:
- an architectural/refactoring change
- adding or changing module boundaries
- changing dependency direction
- introducing a new page type, pipeline stage, or shared domain model

Skip it for routine bug fixes, small local changes, or unrelated tasks.

## Planning Output

For architectural/refactoring plans, return:
1. Responsibility of the new module
2. Minimal API/signature
3. Relevant dependencies/imports
4. Verification plan

## TypeScript Strictness

`tsconfig.json` enables strict flags that commonly trip agents up:

- `verbatimModuleSyntax` — use `import type` for type-only imports.
- `noUncheckedIndexedAccess` — array/object indexing yields `T | undefined`.
- `exactOptionalPropertyTypes` — `?:` means "missing or exact type", not
  "missing or undefined".

## Structure

| Path | Purpose |
|------|---------|
| `build.ts` | composition root — wires discovery → parse → graph → render → output and assembles `Page` objects |
| `./content/*.md` | source vault (nested folders supported) |
| `./templates/page.html` | HTML shell with `{{PLACEHOLDER}}` tokens |
| `./templates/styles.css` | global stylesheet using CSS variables |
| `./public/` | reserved for future static assets — currently unused (not copied by `writeStaticAssets()`) |
| `./src/config/` | site config loading from disk (`loader.ts` → `SiteConfig` with optional `homepage`) |
| `./src/content/` | sole source-vault boundary: discovery/read + frontmatter parse (`loader.ts` → `LoadedContent` `{ path, relPath, frontmatter, body, mtime }` + `slugMap`); markdown parse/render (`markdown.ts`) |
| `./src/graph/` | backlink graph (`backlinks.ts`) + explorer tree (`navigation.ts`, built from `LoadedContent.relPath` — no filesystem access) |
| `./src/domain/` | models: `page.ts` (`Page`, `Backlink`, `PageMetadata`), `siteGraph.ts` (`SiteGraph`), `explorer.ts` (`ExplorerNode`) |
| `./src/rendering/` | pure HTML generation — `page.ts`, `explorer.ts` — no `fs` imports |
| `./src/output/` | file writing (`writer.ts`), static assets + theme.css (`assets.ts`), template loading (`templates.ts`) |
| `./src/theme/` | theme config → CSS (`css.ts`) — pure functions, no `fs` |
| `./plugins/` | `wikilinks.ts` only (target resolution + URL construction) |
| `./tests/` | vitest unit + integration tests, shared helpers |
| `./muffin/` | build output (gitignored) |
| `ARCHITECTURE.md` | design philosophy + architectural direction — not current-state documentation |
| `muffin.config.json` | theme tokens (colors, fonts, spacing, layout) + `homepage` |
| `basePath.ts` | `withBasePath()` — URL prefixing via `MUFFIN_BASE_PATH` |
| `util.ts` | slug/title/date helpers (`getSlug`, `getTitle`, `formatDate`) |
| `vitest.config.ts` | vitest configuration |

## Tests

`npm test` (vitest run). Unit specs mirror the pipeline modules; integration
tests run the pipeline end-to-end on temp dirs via `tests/helpers.ts`
(`makeTempDir`/`writeFile`/`cleanupTempDir`).

- `tests/unit/` — `loader`, `markdown`, `wikilinks`, `backlinks`, `explorer`,
  `theme`, `writer`, `page-renderer`, `util`, `basePath`
- `tests/integration/` — `pipeline` (discovery → graph → render)

## Pipeline Flow

```
getMarkdownFiles("./content")              → src/content/loader.ts
  → slugMap (filename → candidate paths; supports duplicate filenames)
  → loadContent → LoadedContent[] (full `path` + root-relative `relPath`)
  → parseMarkdown: body → mdast (remarkParse + wikilink plugin) once per file → src/content/markdown.ts
  → buildSiteGraph (forward/back links) from the parsed ASTs     → src/graph/backlinks.ts
  → renderMarkdownTree → HTML (from the same parsed ASTs)       → src/content/markdown.ts
  → buildExplorerTree (from LoadedContent.relPath, no fs)       → src/graph/navigation.ts
  → renderExplorer → NAV html                                  → src/rendering/explorer.ts
  → loadConfig("./muffin.config.json")                         → src/config/loader.ts
  → writePages + writeStaticAssets (theme.css via css.ts)      → src/output/writer.ts + assets.ts
  → ./muffin/ (mirrors folder structure)
```

- **Single parse + rendering mutates the tree:** each body is parsed once into a
  shared mdast tree (`parseMarkdown` resolves wikilinks into `link` nodes).
  `buildSiteGraph` consumes the trees first; `renderMarkdownTree` then rewrites
  wikilink URLs to final hrefs and hastifies the same trees. Graph construction
  MUST run before content rendering — rendering mutates the shared AST.
- **Slug:** `basename(filename, .md)` lowercased, spaces/underscores → hyphens.
- **Wikilink resolution:** duplicate filenames resolve same-folder-first, walking
  up the directory tree for precedence (`plugins/wikilinks.ts`).
- **Homepage:** `muffin.config.json`'s `homepage` field names the source page
  (by basename) aliased to `index.html`; handled in `writePages()`
  (`src/output/writer.ts`). `writeStaticAssets()` only copies `styles.css` and
  writes `theme.css` from the theme config (`src/output/assets.ts` +
  `src/theme/css.ts`).
- **Template tokens:** `{{TITLE}}`, `{{CONTENT}}`, `{{BACKLINKS}}`, `{{NAV}}`,
  `{{CSS}}`, `{{THEME_CSS}}`, `{{PAGE_META}}`.

## Deployment

`.github/workflows/deploy.yaml` builds and deploys to GitHub Pages on push to
`main`, with `MUFFIN_BASE_PATH: /Muffin` set in CI.


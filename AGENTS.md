# AGENTS.md — Muffin

A barebones static site generator for Obsidian vaults (markdown → HTML) built in
Node.js + TypeScript. Single entrypoint: `build.ts`.

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

- **Renderer restriction:** code in rendering/layout layers MUST NOT import `fs`
  or perform direct filesystem operations.
- **Data isolation:** keep data parsing/page-structure definitions entirely
  separate from HTML generation.
- **Page model:** everything maps to a structured object with
  `{ type, title, slug, content, metadata, links }`. Do not pass raw strings
  between modules. The domain `Page` model lives in `src/domain/page.ts`.
- **Registry pattern:** match page types to layouts via a centralized mapper;
  do not write separate hardcoded build functions per page.

## Architecture Reference

`ARCHITECTURE.md` is the architectural source of truth.

Read it only when:
- planning or implementing an architectural/refactoring change
- adding or changing module boundaries
- changing dependency direction
- introducing a new page type, pipeline stage, or shared domain model

Do not read it for routine bug fixes, small local changes, or unrelated tasks.

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
| `./content/*.md` | source vault (nested folders supported) |
| `./templates/page.html` | HTML shell with `{{PLACEHOLDER}}` tokens |
| `./templates/styles.css` | global stylesheet using CSS variables |
| `./public/` | static public assets (copied to output) |
| `./src/content/` | file discovery (`loader.ts`) and markdown processing (`markdown.ts`) |
| `./src/graph/` | backlink graph construction (`backlinks.ts`) |
| `./src/rendering/` | pure HTML generation (`page.ts`) — no `fs` imports |
| `./src/output/` | file writing (`writer.ts`), static asset copy (`assets.ts`), and template loading (`templates.ts`) |
| `./src/theme/` | theme config loading from disk (`config.ts`) |
| `./plugins/` | `wikilinks.ts` (remark plugin), `explorer.ts` (tree + render), `theme.ts` (config → CSS vars) |
| `./tests/` | vitest unit + integration tests, shared helpers |
| `./muffin/` | build output (gitignored) |
| `ARCHITECTURE.md` | architecture source of truth |
| `muffin.config.json` | theme tokens (colors, fonts, spacing, layout) |
| `basePath.ts` | `withBasePath()` — URL prefixing via `MUFFIN_BASE_PATH` |
| `util.ts` | slug/title helpers (`getSlug`, `getTitle`) |
| `vitest.config.ts` | vitest configuration |

## Pipeline Flow

```
getMarkdownFiles("./content")              → src/content/loader.ts
  → slugMap (filename → candidate paths; supports duplicate filenames)
  → Pass 1: wikilink extraction → buildSiteGraph (backlinks computed)
  → Pass 2: renderMarkdownFile → HTML                            → src/content/markdown.ts
  → buildExplorerTree + renderExplorer                            → plugins/explorer.ts
  → writePages + writeStaticAssets                                → src/output/writer.ts
  → ./muffin/ (mirrors folder structure)
```

- **Known inefficiency:** every file is parsed twice (once for link extraction,
  once for HTML). Not yet fixed.
- **Slug:** `basename(filename, .md)` lowercased, spaces/underscores → hyphens.
- **Wikilink resolution:** duplicate filenames resolve same-folder-first, walking
  up the directory tree for precedence (`plugins/wikilinks.ts`).
- **Template tokens:** `{{TITLE}}`, `{{CONTENT}}`, `{{BACKLINKS}}`, `{{NAV}}`,
  `{{CSS}}`, `{{THEME_CSS}}`, `{{PAGE_META}}`.

## Deployment

`.github/workflows/deploy.yaml` builds and deploys to GitHub Pages on push to
`main`, with `MUFFIN_BASE_PATH: /Muffin` set in CI.

## Current Work: Phase 5 — Content Processing Pipeline

Phase 5 is complete. The content processing pipeline has clean boundaries:

- **`src/content/markdown.ts`** — frontmatter extraction + MD→HTML transformation (coherent single responsibility)
- **`src/content/loader.ts`** — file discovery + file stat metadata
- **`plugins/wikilinks.ts`** — remark plugin for wikilink resolution
- **`src/graph/backlinks.ts`** — site graph construction (forward/back links)

`build.ts` is a thin orchestrator (slug map, contentMap, graph, Page assembly, render, output).

No further content-layer refactoring is justified at the current scale.


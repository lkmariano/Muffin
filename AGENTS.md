# AGENTS.md — Muffin

A barebones static site generator for Obsidian vaults (markdown → HTML) built in
Node.js + TypeScript. Single entrypoint: `build.ts`.

## Build & Verify

- **Build command:** `npx tsx build.ts` (tsx runs TS directly — no compile step)
- **Verification loop:** After every file change, run the build. If it fails,
  fix the error and re-run. DO NOT mark work complete while the build throws.
- **No tests or lint:** the `test` script is a stub; no formatter/linter configured.

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
  between modules.
- **Registry pattern:** match page types to layouts via a centralized mapper;
  do not write separate hardcoded build functions per page.

## Architecture Reference

`ARCHITECTURE.md` is the architectural source of truth.

Read it only when:
- planning or implementing an architectural/refactoring change
- adding or changing module boundaries
- changing dependency direction
- introducing a new page type, pipeline stage, or shared domain model

## Planning Output

For architectural/refactoring plans, return:
1. Responsibility of the new module
2. Minimal API/signature
3. Relevant dependencies/imports
4. Verification plan

Do not read it for routine bug fixes, small local changes, or unrelated tasks.

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
| `./plugins/` | `wikilinks.ts`, `explorer.ts`, `theme.ts` |
| `./muffin/` | build output (gitignored) |
| `muffin.config.json` | theme tokens (colors, fonts, spacing, layout) |
| `basePath.ts` | `withBasePath()` — URL prefixing via `MUFFIN_BASE_PATH` |

## Pipeline Flow

```
getMarkdownFiles("./content")
  → slugMap (filename → candidate paths; supports duplicate filenames)
  → Pass 1: wikilink extraction → invert to compute backlinks
  → Pass 2: markdown → HTML rendering
  → writeOutput() → ./muffin/ (mirrors folder structure)
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

## Current Work: Phase 2 — Refactor build.ts



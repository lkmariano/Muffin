# ARCHITECTURE.md — Muffin

This document is the architectural source of truth for Muffin.

Muffin is a lightweight static site generator for Obsidian vaults built with Node.js and TypeScript.

The goal is to keep Muffin modular, easy to understand, easy to test, and easy to extend without introducing unnecessary complexity.

# 1. Architecture Principles

## Keep responsibilities separate

Each module should have one clear responsibility.

Prefer small modules, simple functions, and typed data.

Avoid large utility modules, hidden dependencies, and unnecessary abstractions.

## Use a one-way pipeline

Muffin follows this general flow:

Configuration → Content → Transformers → Site Graph → Rendering → Output

A later stage should consume the results of an earlier stage instead of reaching backward and doing its work.

## Keep build.ts thin

`build.ts` is the composition root.

It should coordinate the build but should not contain the implementation of each stage.

Conceptually:

Configuration
→ Content
→ Markdown
→ Graph
→ Rendering
→ Output

## Separate data from presentation

Page data and HTML should be separate.

The general flow is:

Markdown → Page → Renderer → HTML

The renderer should not parse Markdown, discover files, or calculate backlinks.

## Keep infrastructure separate

Filesystem operations, templates, environment variables, and output writing are infrastructure concerns.

Domain and application logic should not directly depend on these details.

For example, rendering code should not import `fs`.

## Keep configuration in one place

Things such as the base path, theme, fonts, colors, layout, homepage, and enabled features should come from configuration where practical.

Modules should not independently read environment variables or configuration files when configuration can be passed to them.

## Prefer composition over modification

Adding new functionality should not require repeatedly changing `build.ts`.

For example, adding a new page type should mainly involve creating and registering a renderer.

## Keep Muffin small

Muffin should use useful architectural ideas from larger static site generators such as Quartz without copying their complexity.

Prefer:

Simple + Modular + Testable

over:

Abstract + Generic + Complex

# 2. Target Structure

The intended application structure is:

```text
src/
├── domain/
│   ├── page.ts
│   ├── link.ts
│   ├── metadata.ts
│   ├── explorer.ts
│   └── siteGraph.ts
│
├── content/
│   ├── loader.ts
│   ├── markdown.ts
│   ├── wikilinks.ts
│   └── transformers/
│
├── graph/
│   ├── backlinks.ts
│   └── navigation.ts
│
├── pages/
│   ├── registry.ts
│   ├── default/
│   ├── portfolio/
│   ├── photo/
│   └── note/
│
├── rendering/
│   ├── page.ts
│   ├── explorer.ts
│   └── backlinks.ts
│
├── theme/
│   ├── loader.ts
│   ├── tokens.ts
│   └── css.ts
│
├── config/
│   ├── schema.ts
│   └── loader.ts
│
└── infrastructure/
    ├── filesystem.ts
    ├── templates.ts
    └── assets.ts

build.ts
```

Not all of these modules need to exist immediately.

Create modules as responsibilities are extracted.

# 3. Main Data Flow

The target flow is:

```text
Obsidian Markdown
      ↓
ContentLoader
      ↓
MarkdownProcessor
      ↓
Page
      ↓
SiteGraph
      ↓
Page Renderer
      ↓
HTML
      ↓
Output
```

Configuration, theme, URLs, and infrastructure support these stages.

# 4. Module Responsibilities

## Configuration

Responsible for:

* Loading configuration
* Validating configuration
* Providing normalized configuration

Configuration may contain:

* Theme
* Base path
* Fonts
* Colors
* Layout
* Homepage
* Features

Load configuration once and pass it through the pipeline.

## Content Loader

Location:

`src/content/loader.ts`

Responsible for discovering Markdown files.

It should not:

* Render HTML
* Calculate backlinks
* Write output

## Markdown Processor

Location:

`src/content/markdown.ts`

Responsible for Markdown processing.

This includes:

* Markdown parsing
* Frontmatter
* Remark/Rehype configuration
* Wikilinks
* Other Markdown transformations

Markdown processing should not contain page layout or output-writing logic.

## Domain

Location:

`src/domain/`

Contains the core data structures used by Muffin.

The domain should define the data passed between pipeline stages without depending on filesystem, HTML, or output details.

Core types include:

* `Page`
* `PageMetadata`
* `Link`
* `ExplorerNode`
* `SiteGraph`
* `BuildContext`
* `RenderContext`

Example:

```ts
type PageType =
  | "default"
  | "portfolio"
  | "photo"
  | "note";

interface Page {
  id: string;
  type: PageType;
  title: string;
  slug: string;
  content: string;
  metadata: PageMetadata;
  links: Link[];
  backlinks: Link[];
}
```

`BuildContext` contains state shared across build stages.

`RenderContext` contains the data required to render a page.

These contexts should be passed explicitly between functions rather than stored in global state.

Domain types should not depend on:

* `fs`
* HTML
* CSS
* Templates
* Deployment
* Output paths

## Site Graph

Location:

`src/graph/`

Responsible for relationships between pages.

This includes:

* Links
* Backlinks
* Navigation
* Explorer structure

Graph logic should not generate HTML.

## Explorer

Explorer construction and Explorer rendering are separate.

Explorer construction creates the data:

`ExplorerNode[]`

Explorer rendering turns that data into HTML.

This means Explorer logic can be tested without HTML rendering.

# 5. Page Types

Page types are a first-class concept.

Initial types may include:

* `default`
* `portfolio`
* `photo`
* `note`

All page types use the same core `Page` model.

Page type and layout should remain separate.

For example:

```text
type = photo
layout = gallery
```

A page type describes what the page represents.

A layout describes how it is presented.

# 6. Renderer Registry

Page types should use a centralized renderer registry.

Conceptually:

```ts
const renderers = {
  default: renderDefaultPage,
  portfolio: renderPortfolioPage,
  photo: renderPhotoPage,
  note: renderNotePage,
};
```

The build pipeline should not contain separate hardcoded build functions for every page type.

Adding a page type should mainly involve:

1. Defining the type
2. Creating its renderer
3. Registering the renderer

`build.ts` should not need to change.

Initially, only the default renderer needs to exist.

# 7. Markdown Transformers

Markdown processing should eventually use an ordered transformer pipeline.

For example:

```text
Markdown
  ↓
Wikilinks
  ↓
Frontmatter
  ↓
Other Transformers
  ↓
Processed Content
```

Transformers should be independently understandable and testable.

Use a consistent transformer interface:

```ts
interface MarkdownTransformer {
  transform(input: MarkdownInput): MarkdownOutput;
}
```

Each transformer should accept the output of the previous transformer and return the transformed result.

The interface may be extended when the existing implementation requires additional context, but individual transformers should not introduce unrelated responsibilities.

# 8. Rendering

Location:

`src/rendering/`

Rendering converts structured data into HTML.

Rendering can use:

* Page data
* Site graph data
* Configuration
* Theme data
* URL information
* Templates

Rendering should not:

* Discover Markdown files
* Parse source files
* Calculate backlinks
* Write output files
* Import `fs`

# 9. Theme

Location:

`src/theme/`

Theme responsibilities should be separated into:

```text
Theme Configuration
      ↓
Tokens
      ↓
CSS
      ↓
Assets
```

Theme changes should not require changes to content processing.

# 10. URLs

URL and base-path handling should be isolated.

For example:

`withBasePath()`

should remain a URL concern.

Rendering should receive the required URL information rather than reading environment variables directly.

# 11. Infrastructure

Location:

`src/infrastructure/`

Infrastructure contains environment-specific operations.

Examples:

* Filesystem access
* Template loading
* Asset copying
* Output writing

Infrastructure may depend on application and domain data.

Domain code should not depend on infrastructure.

# 12. Output

Output is responsible for creating the generated site.

This includes:

* Writing HTML
* Writing CSS
* Copying assets
* Creating directories
* Maintaining the output structure

Output should consume already-processed data.

It should not perform Markdown parsing, backlink calculation, or other content analysis.

# 13. Dependency Direction

The most important rule is:

Core data should not depend on environment-specific details.

Conceptually:

```text
Domain
  ↑
Application
  ↑
Infrastructure / Presentation
```

Domain code should not import:

* `fs`
* HTML templates
* CSS
* Environment variables
* Output writers
* Deployment-specific code

`build.ts` connects everything together.

Modules should never import `build.ts`.

# 14. Refactoring Order

Refactor incrementally.

Do not build the entire architecture at once.

Recommended order:

## Phase 1

Extract existing responsibilities from `build.ts`:

1. Content Loader
2. Markdown Processor
3. Site Graph / Backlinks
4. Renderer
5. Output / Assets

Preserve behavior after every extraction.

## Phase 2

Introduce the core domain models:

* Page
* PageMetadata
* Link
* ExplorerNode
* SiteGraph
* BuildContext
* RenderContext

## Phase 3

Separate graph logic from rendering.

Move backlink calculation out of rendering.

Move Explorer construction out of Explorer HTML rendering.

## Phase 4

Introduce the page renderer registry.

Start with the default page type.

## Phase 5

Convert Markdown processing into an explicit transformer pipeline.

## Phase 6

Finish configuration and theme separation.

Remove hardcoded policy where appropriate.

## Phase 7

Add tests for:

* Slugging
* Wikilinks
* Backlinks
* Explorer construction
* Configuration
* Renderers

## Phase 8

Add additional page types after the architecture is stable.

# 15. Definition of Done

The architecture is successful when:

* Markdown processing can change without rewriting page renderers.
* Backlinks can be tested without generating HTML.
* Explorer construction can be tested without HTML.
* A new page type can be added without changing `build.ts`.
* Theme changes do not require content-processing changes.
* Filesystem details are isolated from domain logic.
* New output artifacts do not require rewriting the content pipeline.
* Major modules can be tested independently.
* `build.ts` primarily coordinates the system.

# 16. Guiding Principle

Muffin should remain small.

The architecture exists to make the project easier to understand, modify, test, and extend.

Do not introduce architecture simply for the sake of architecture.

**Keep Muffin simple.**
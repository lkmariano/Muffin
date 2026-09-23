# Muffin Architecture

This document describes the **architectural direction and design philosophy** Muffin should follow as it evolves.

It is a set of guiding principles, not a description of the current codebase. The actual implementation and file structure are documented separately.

Muffin is an **Obsidian-to-static-site engine**. Its purpose is to turn a vault into a usable website with sensible defaults while remaining configurable enough to support substantially different sites.

The goal is not to reproduce every feature of Quartz or build a highly abstract framework. The goal is to make Muffin a **small, understandable, ready-made content machine** that can grow without becoming tied to any particular website.

---

## 1. Architecture Principles

### Keep responsibilities separate

Each part of Muffin should have a clear responsibility.

Content processing, transformation, graph construction, rendering, configuration, asset handling, and output should not become mixed together simply because doing so is convenient in the short term.

A module should generally have one reason to change.

### Prefer a clear flow of data

Muffin should generally move information through a predictable sequence:

```text
Configuration
     ↓
Content
     ↓
Transformations
     ↓
Site Graph
     ↓
Rendering
     ↓
Output
```

Not every feature needs to pass through every stage, but responsibilities should generally follow this direction rather than reaching backward into earlier stages.

### Keep orchestration thin

The build process should primarily coordinate the system.

The composition root may assemble configuration, content processing, graph construction, rendering, asset handling, and output, but the underlying behavior should live in the components responsible for it.

The build process should remain understandable even as Muffin gains capabilities.

### Separate data from presentation

Muffin should distinguish between:

```text
source content
     ↓
structured data
     ↓
presentation
     ↓
generated output
```

Rendering should consume information that has already been interpreted and prepared.

Presentation code should not become responsible for discovering files, parsing source content, calculating backlinks, or performing unrelated application logic.

### Keep the core independent of the environment

Core concepts should not depend directly on filesystem details, deployment environments, HTML templates, CSS, or other environment-specific concerns.

Infrastructure should exist at the edges of the system.

This makes individual parts easier to understand, test, replace, and reuse.

---

## 2. Muffin as a Content Engine

Muffin should primarily solve the problem of publishing an Obsidian vault.

The engine should understand the concepts that make a vault useful as a website, including:

* Markdown
* frontmatter
* Wikilinks
* links and relationships
* backlinks
* headings and anchors
* images and media
* embedded content
* file and folder structure
* navigation
* generated URLs

These capabilities should be implemented as reusable engine behavior rather than as features belonging to a particular website.

The engine should not assume what the author's site is about.

A vault containing documentation, notes, a digital garden, a portfolio, or a personal knowledge base should all be valid inputs.

### Obsidian compatibility over feature accumulation

Muffin should prioritize features that make ordinary Obsidian content publish correctly.

For example:

```md
[[Another Note]]
```

```md
[[Another Note|Custom title]]
```

```md
[[Another Note#Section]]
```

```md
![[image.png]]
```

should be treated as content features of the engine.

Muffin does not need to implement every Obsidian feature immediately. New source constructs should be added when they provide meaningful value for publishing a vault.

---

## 3. Content Boundary

Content loading forms the boundary between Muffin and its source material.

The source may contain Markdown or other supported formats in the future, but downstream parts of Muffin should not need to know how that source was obtained.

The content boundary should be responsible for discovering and loading the material required to build a site.

This includes both:

```text
content
assets
```

rather than treating Markdown files as the only meaningful source material.

Content processing should produce structured information that the rest of the system can work with.

It should not become responsible for rendering pages or writing generated output.

---

## 4. Assets

Assets are part of publishing content and should therefore be treated as a first-class concern of Muffin.

This includes things such as:

* images
* media referenced by content
* fonts or other site assets where appropriate
* public/static files

The asset system should provide a clear path from source material to generated output:

```text
Vault
├── notes/
│   └── page.md
├── images/
│   └── image.png
└── public/
    └── favicon.ico

          ↓

Generated site
├── notes/
│   └── page.html
├── images/
│   └── image.png
└── favicon.ico
```

Content should be able to reference assets using the conventions expected by the source format.

Asset discovery and copying should remain separate from rendering. Renderers should receive the appropriate URL or asset information rather than directly reading files from the source vault.

---

## 5. Transformations

Transformations should modify or enrich content in well-defined stages.

Examples may include:

* parsing frontmatter
* parsing Markdown
* resolving Wikilinks
* resolving heading references
* interpreting embeds
* enriching content with derived information
* preparing content for rendering

Transformations should remain composable where useful.

Muffin should not introduce a formal abstraction or pipeline framework merely for the sake of having one. The complexity of the transformation system should match the complexity of the features it supports.

A transformation should operate on structured information where practical rather than repeatedly rediscovering or reparsing source files.

---

## 6. Domain Model

Muffin should have clear representations for the concepts that make up a site.

Examples include:

* pages
* metadata
* assets
* links
* navigation
* explorer structures
* site graphs
* page types

These concepts should represent Muffin's information rather than the mechanics used to store or display that information.

The domain should avoid direct dependencies on:

* filesystem operations
* HTML
* CSS
* templates
* deployment details
* output mechanisms

The exact shape of these models may change as Muffin develops.

---

## 7. Site Graph

Relationships between content should be represented independently from presentation.

The site graph may contain information such as:

* forward links
* backlinks
* relationships between pages
* other derived site structure

Graph construction should operate on content and domain data rather than generating HTML.

This allows relationships to be tested and reasoned about independently from how they are eventually displayed.

Not every possible relationship needs to become part of the graph. The graph should contain relationships that are meaningful to Muffin's publishing model.

---

## 8. Navigation and Exploration

Navigation and explorer structures should represent the site's organization separately from their visual presentation.

Construction of the structure and rendering of that structure are different responsibilities.

The same underlying information should be capable of supporting different presentations without requiring the graph or domain model to know about HTML.

Muffin may provide a useful default explorer because folder-based navigation is a natural fit for Obsidian vaults.

However, the default explorer should remain a presentation choice rather than becoming a requirement of the content model.

---

## 9. Page Types and Layouts

Muffin may support different kinds of pages when there is a meaningful distinction between them.

Page types should not become hardcoded application concepts such as "portfolio", "blog", or "resume".

Instead, Muffin should provide a generic mechanism through which a site can associate a page type with a presentation or layout.

Conceptually:

```text
Page
 ↓
Page Type
 ↓
Layout / Template
 ↓
Rendered Page
```

Adding a new page type should not require modifying unrelated parts of content loading, graph construction, or output.

Page types should only be introduced when they provide a meaningful distinction. Muffin should not create abstractions for hypothetical use cases.

Site-specific page types should be configurable by the site rather than becoming permanent concepts in the engine.

---

## 10. Rendering

Rendering is the boundary between Muffin's structured information and its presentation.

Renderers should primarily transform prepared data into output.

They may depend on things such as:

* page data
* graph information
* configuration
* theme information
* URL information
* templates
* asset URLs

They should not be responsible for:

* discovering source files
* reading source content
* calculating backlinks
* performing application-level analysis
* writing files

Rendering should remain replaceable without requiring changes to the underlying content model.

---

## 11. Templates and Layouts

Muffin should provide a useful default presentation while allowing sites to replace or extend it.

The default experience should be:

* neutral
* functional
* readable
* usable without configuration
* suitable for ordinary notes and knowledge bases

The default presentation should not contain personal branding, personal content, or assumptions about a particular site.

Templates should receive site information through configuration and structured data rather than hardcoding it.

For example:

```text
Site configuration
     ↓
Template
     ↓
Generated page
```

rather than:

```text
Template
     ↓
hardcoded site identity
```

Muffin should favor simple template mechanisms over a highly abstract component framework unless real use cases justify additional complexity.

---

## 12. Default Experience

Muffin is intended to be usable without requiring every user to design a site from scratch.

A fresh Muffin site should therefore have sensible defaults for things such as:

* page layout
* typography
* navigation
* backlinks
* page metadata
* theme tokens
* basic responsive behavior
* generated URLs
* output structure

The defaults should be **Muffin defaults, not author defaults**.

They should not contain:

* personal names
* personal links
* site-specific copy
* portfolio content
* personal color palettes
* personal fonts
* per-site page rules

A user should be able to start with a vault and obtain a functional website before customizing it.

The default experience should be opinionated enough to be useful but generic enough to serve different kinds of sites.

---

## 13. Configuration

Site configuration should provide control over site identity and paths without
requiring a runtime file. Muffin expresses the small set of meaningful
site-level decisions as compile-time constants in `src/site.ts` (site identity,
content directory, exclude globs, homepage, output directory) plus a single
deployment-time environment variable, `MUFFIN_BASE_PATH`, consumed by
`withBasePath`.

At minimum this should cover:

* site identity
* content/homepage/output paths and exclude globs
* base path (deployment prefix)

Configuration should remain small and understandable.

The constants should have sensible defaults so a fresh vault builds a
functional website before any customization.

The existence of configuration should not turn Muffin into a collection of flags for every possible behavior.

New configuration should be introduced when it represents a meaningful site-level decision.

---

## 14. Theme and Presentation

Theme configuration should remain separate from the content and domain model.

Styling decisions, visual tokens, CSS generation, and presentation-specific configuration should not leak into core content processing.

Changing the appearance of a site should not require changing how Muffin understands the site's content.

Muffin may provide a default theme, but a site's visual identity belongs to the site using Muffin.

A site should be able to replace the default presentation without modifying the engine's content model.

---

## 15. URLs

URL construction should be treated as a separate concern from content processing.

Base paths, deployment prefixes, and similar environment-specific URL concerns should not be scattered throughout the application.

Code that needs a URL should receive the appropriate URL information rather than independently reconstructing deployment details.

Generated URLs should work consistently for:

* pages
* Wikilinks
* heading anchors
* images
* assets
* navigation
* generated artifacts

---

## 16. Infrastructure

Infrastructure concerns should remain at the boundaries of the system.

This includes things such as:

* filesystem access
* environment variables
* template loading
* asset handling
* writing generated files
* development servers
* other environment-specific operations

Core application logic should depend on the information provided by infrastructure rather than directly controlling these mechanisms wherever practical.

Infrastructure should not leak into the domain merely because a feature happens to require filesystem access during implementation.

---

## 17. Output

Output should consume already-processed information and produce the generated site.

Writing files should not require Muffin to rediscover or reinterpret the source content.

The output layer may produce more than HTML pages. Generated artifacts may include:

* HTML
* copied assets
* stylesheets
* sitemap files
* feeds
* other static artifacts

New generated artifacts should consume information already available from the site's model and configuration where practical.

Adding an artifact should not require unrelated content-processing logic to become aware of how that artifact is written.

---

## 18. Generated Site vs. Site Behavior

Muffin primarily generates a static website.

The engine should distinguish between:

```text
build-time generation
```

and:

```text
client-side site behavior
```

Build-time concerns belong in Muffin when they are necessary to publish the vault.


Muffin may expose stable markup, data attributes, or generated artifacts that make such behavior easy to add, but it should not absorb site-specific browser behavior without a clear engine-level use case.

---

## 19. Extensibility

Muffin should remain configurable and replaceable without becoming a framework of abstractions.

Potential extension points include:

* templates
* layouts
* themes
* page types
* transformations
* generated artifacts
* future plugins

However, an extension API should only be introduced when real use cases justify it.

The existence of a `plugins/` directory or a desire for future customization is not, by itself, a reason to create a formal plugin architecture.

Muffin should first make the common customization paths simple.

---

## 20. Dependency Direction

Muffin should generally follow this principle:

```text
Core concepts
     ↑
Application behavior
     ↑
Infrastructure / presentation
```

The important idea is that **core concepts should not depend on environment-specific details**.

Dependencies should generally point toward more concrete implementation concerns rather than allowing filesystem, rendering, or deployment details to spread throughout the system.

This is a guideline rather than an absolute rule. Practical simplicity is more important than enforcing a theoretical dependency structure at all costs.

---

## 21. Testing

Architecture should make individual responsibilities testable.

Ideally:

* content processing can be tested without rendering
* graph construction can be tested without HTML
* rendering can be tested with prepared data
* configuration can be tested independently
* asset handling can be tested independently from page rendering
* output can be tested without reimplementing content analysis

Tests should reinforce the boundaries that make Muffin understandable.

The architecture should not become more complicated merely to make something theoretically testable.

---

## 22. What Belongs in Muffin

A useful rule for deciding whether a feature belongs in Muffin is:

> **If the feature makes an Obsidian vault publish better, it probably belongs in Muffin. If it makes one particular website look or behave better, it probably belongs in the site.**

Features that generally belong in Muffin include:

* Markdown processing
* frontmatter
* Wikilinks
* heading anchors
* backlinks
* navigation
* images and assets
* Obsidian-compatible content constructs
* URL generation
* page rendering
* layouts and templates
* default presentation
* sitemap and feed generation
* static output

---

## 23. Evolving Muffin

Muffin should evolve incrementally.

When introducing a feature:

1. Identify which responsibility the feature belongs to.
2. Determine whether it improves the general vault-to-site workflow or only one particular site.
3. Keep that responsibility contained where practical.
4. Reuse existing boundaries instead of creating parallel systems.
5. Avoid modifying unrelated parts of the pipeline.
6. Introduce new abstractions only when the existing design genuinely becomes insufficient.
7. Prefer configuration or extension over engine-specific assumptions when a behavior is site-specific.

New capabilities should fit into the existing direction of the architecture rather than forcing the entire system to accommodate them.

Muffin should not attempt to anticipate every possible website.

---

## 24. A Healthy Muffin Architecture

A healthy architecture should make the following kinds of changes relatively localized:

* changing how source content is interpreted
* adding support for an Obsidian content construct
* adding or changing asset handling
* changing how links are resolved
* changing how pages are rendered
* changing the site's visual presentation
* changing a layout or template
* changing how generated files are written
* adding a meaningful generated artifact
* adding a meaningful new capability

Changes should not routinely require modifications across the entire build process.

The exact module boundaries may change over time. What matters is that responsibilities remain clear and dependencies remain understandable.

A healthy Muffin installation should also make the distinction between:

```text
Muffin engine
     ↓
Muffin default experience
     ↓
Site-specific customization
```

easy to understand.

---

## 25. Guiding Principle

Muffin should remain **small, understandable, composable, and useful out of the box**.

Architecture exists to make the project easier to understand, modify, test, and extend.

It should not exist for its own sake.

When choosing between a simple design and a more elaborate abstraction, prefer the simpler design unless the added structure solves a real problem.

Muffin does not need to reproduce every capability of Quartz or become a general-purpose web framework.

The goal is simpler:

> **Give an Obsidian vault a good website by default, while making the engine configurable enough that different sites can make it their own.**

The architecture should give Muffin enough structure to **grow without losing its simplicity**.

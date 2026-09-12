# Muffin Architecture

This document describes the **architectural direction and design philosophy** Muffin should follow as it evolves.

It is a set of guiding principles, not a description of the current codebase. The actual implementation and file structure are documented separately.

The goal is not to build a highly abstract system. The goal is to keep Muffin understandable, modular, and easy to extend as it grows.

---

## 1. Architecture Principles

### Keep responsibilities separate

Each part of Muffin should have a clear responsibility.

Content processing, transformation, graph construction, rendering, configuration, and output should not become mixed together simply because doing so is convenient in the short term.

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

The composition root may assemble configuration, content processing, graph construction, rendering, and output, but the underlying behavior should live in the components responsible for it.

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

Core concepts should not depend directly on filesystem details, deployment environments, HTML templates, or other environment-specific concerns.

Infrastructure should exist at the edges of the system.

This makes individual parts easier to understand, test, replace, and reuse.

---

## 2. Content

Content loading should form the boundary between Muffin and its source material.

The source may contain Markdown or other supported formats in the future, but downstream parts of Muffin should not need to know how that source was obtained.

Content processing should be responsible for interpreting source material and producing information that the rest of the system can work with.

It should not become responsible for rendering pages or writing generated output.

---

## 3. Transformations

Transformations should modify or enrich content in well-defined stages.

Examples may include:

* parsing frontmatter
* resolving wikilinks
* processing Markdown
* interpreting other source constructs
* enriching content with derived information

Transformations should remain composable where useful.

Muffin should not introduce a formal abstraction or pipeline framework merely for the sake of having one. The complexity of the transformation system should match the complexity of the features it supports.

---

## 4. Domain Model

Muffin should have clear representations for the concepts that make up a site.

Examples include:

* pages
* metadata
* links
* navigation
* explorer structures
* site graphs

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

## 5. Site Graph

Relationships between content should be represented independently from presentation.

The site graph may contain information such as:

* forward links
* backlinks
* relationships between pages
* navigation relationships
* other derived site structure

Graph construction should operate on content and domain data rather than generating HTML.

This allows relationships to be tested and reasoned about independently from how they are eventually displayed.

---

## 6. Navigation and Exploration

Navigation and explorer structures should represent the site's organization separately from their visual presentation.

Construction of the structure and rendering of that structure are different responsibilities.

The same underlying information should be capable of supporting different presentations without requiring the graph or domain model to know about HTML.

---

## 7. Page Types

Muffin may eventually support different kinds of pages.

When this becomes necessary, page types should be treated as an extension of the site's domain rather than as unrelated special cases scattered throughout the build process.

Adding a page type should not require modifying unrelated parts of content loading, graph construction, or output.

At the same time, page types should only be introduced when they provide a meaningful distinction. Muffin should not create abstractions for hypothetical use cases.

---

## 8. Rendering

Rendering is the boundary between Muffin's structured information and its presentation.

Renderers should primarily transform prepared data into output.

They may depend on things such as:

* page data
* graph information
* configuration
* theme information
* URL information
* templates

They should not be responsible for:

* discovering source files
* reading source content
* calculating backlinks
* performing application-level analysis
* writing files

Rendering should remain replaceable without requiring changes to the underlying content model.

---

## 9. Theme and Presentation

Theme configuration should remain separate from the content and domain model.

Styling decisions, visual tokens, CSS generation, and presentation-specific configuration should not leak into core content processing.

Changing the appearance of a site should not require changing how Muffin understands the site's content.

---

## 10. URLs

URL construction should be treated as a separate concern from content processing.

Base paths, deployment prefixes, and similar environment-specific URL concerns should not be scattered throughout the application.

Code that needs a URL should receive the appropriate URL information rather than independently reconstructing deployment details.

---

## 11. Infrastructure

Infrastructure concerns should remain at the boundaries of the system.

This includes things such as:

* filesystem access
* environment variables
* template loading
* asset handling
* writing generated files
* other environment-specific operations

Core application logic should depend on the information provided by infrastructure rather than directly controlling these mechanisms wherever practical.

---

## 12. Output

Output should consume already-processed information and produce the generated site.

Writing files should not require Muffin to rediscover or reinterpret the source content.

The output layer should therefore remain independent from content analysis and graph construction.

Adding a new generated artifact should not require unrelated content-processing logic to become aware of how that artifact is written.

---

## 13. Dependency Direction

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

## 14. Testing

Architecture should make individual responsibilities testable.

Ideally:

* content processing can be tested without rendering
* graph construction can be tested without HTML
* rendering can be tested with prepared data
* configuration can be tested independently
* output can be tested without reimplementing content analysis

Tests should reinforce the boundaries that make Muffin understandable.

The architecture should not become more complicated merely to make something theoretically testable.

---

## 15. Evolving Muffin

Muffin should evolve incrementally.

When introducing a feature:

1. Identify which responsibility the feature belongs to.
2. Keep that responsibility contained where practical.
3. Reuse existing boundaries instead of creating parallel systems.
4. Avoid modifying unrelated parts of the pipeline.
5. Introduce new abstractions only when the existing design genuinely becomes insufficient.

New capabilities should fit into the existing direction of the architecture rather than forcing the entire system to accommodate them.

The architecture should support growth without requiring Muffin to anticipate every possible feature in advance.

---

## 16. A Healthy Muffin Architecture

A healthy architecture should make the following kinds of changes relatively localized:

* changing how source content is interpreted
* changing how links are resolved
* changing how pages are rendered
* changing the site's visual presentation
* changing how generated files are written
* adding a meaningful new capability

Changes should not routinely require modifications across the entire build process.

The exact module boundaries may change over time. What matters is that responsibilities remain clear and dependencies remain understandable.

---

## 17. Guiding Principle

Muffin should remain **small, understandable, and composable**.

Architecture exists to make the project easier to understand, modify, test, and extend.

It should not exist for its own sake.

When choosing between a simple design and a more elaborate abstraction, prefer the simpler design unless the added structure solves a real problem.

The goal is not to predict what Muffin will become.

The goal is to give Muffin enough structure that it can **grow without losing its simplicity**.
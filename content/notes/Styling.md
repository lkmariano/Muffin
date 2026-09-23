---
tags:
  - #guide
  - #theming
---

# Styling Your Pages

Muffin splits presentation into two layers you own entirely: **the theme** (the
stylesheet) and **the renderer** (which HTML each page gets). A "style" is the
two put together — your own layout function plus the CSS that dresses it.

## Where the theme lives

`templates/styles.css` is a self-contained stylesheet copied verbatim into
`{{CSS}}` on every page. Every visual value flows from the design tokens in its
`:root` block:

```css
:root {
  --color-text: #E8EAED;
  --color-background: #202124;
  --color-link: #81C995;
  --color-accent: #81C995;
  --typography-body: 'Instrument Sans', ...
  --typography-base-size: 14px;
  --spacing-1: 2px;
  --radius-sm: 0;
}
```

Reskin the whole site by editing those tokens — no HTML changes needed. To style
a *particular* page style, you add scoped rules named after your layout.

## 1. Write the layout function

Page styles live in `src/presentation/layouts/`, one file per style. A layout
is a plain function from a presentation context to HTML:

```ts
// src/presentation/layouts/writings.ts
import type { PresentationContext } from "../../rendering/context.js";

export function renderWritingPage(context: PresentationContext): string {
  const { page, site } = context;
  return `
    <article class="writings">
      <header>
        <h1>${page.title}</h1>
        <p class="writings-meta">
          ${page.metadata.status ?? "published"} · ${page.metadata.updated}
        </p>
      </header>
      ${page.content}
    </article>
  `;
}
```

`context.page` gives you the rendered content HTML, metadata, TOC, and
backlinks; `context.explorerHtml` and `context.site` are there too.

## 2. Route your page type to it

`src/presentation/renderSitePage.ts` is Muffin's default renderer — the single
dispatcher every page flows through. Point `type: writings` at the new layout:

```ts
import { renderPage } from "../rendering/page.js";
import { renderWritingPage } from "./layouts/writings.js";
import type { PageRenderer } from "../rendering/context.js";

export const renderSitePage: PageRenderer = (context, template) => {
  if (context.page.metadata.frontmatter.type === "writings") {
    return renderWritingPage(context);
  }
  return renderPage(context, template); // stock shell for everything else
};
```

Then give a page that type in its frontmatter:

```markdown
---
type: writings
status: published
---

# A New Piece
```

Muffin does not interpret `type` — your renderer matched it.

## 3. Dress the layout in CSS

Add rules for your layout's classes to `templates/styles.css`, reusing the
tokens so your style stays in the theme:

```css
.writings { max-width: var(--layout-content-width); }
.writings header { margin-bottom: var(--spacing-4); }
.writings-meta { color: var(--color-muted); font-size: var(--typography-size-sm); }
```

Rebuild and the page renders with your `<article class="writings">` and its CSS.

## The fallback keeps Muffin's shell

Any page whose type you don't handle — or all of them, if you change nothing —
falls back to `renderPage(context, template)`, so you keep Muffin's
three-column shell, Explorer navigation, TOC, and backlinks for free. You add a
style only for the pages you want to look different.

See [[Usage]] for the full renderer walkthrough. Back to [[Home]].
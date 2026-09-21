# DESIGN.md — Muffin v1

Source: Penpot export `MuffinStyleGuide.html` (frame "Desktop - 1", 1440 × 1024).
The desktop reference below records the values read from the exported CSS. This
file is the frontend source of truth for Muffin v1.

The design is intentionally small: a restrained visual system, a three-column
desktop layout, and responsive rules that rearrange the same components rather
than introducing a separate mobile design language.

Token names follow `ThemeTokens` in `src/theme/defaults.ts`
(`colors`, `typography` including `sizes`, `spacing`, `layout`, `radius`).
Values that were not visible in the mockup are explicitly defined here as
Muffin v1 defaults so implementation does not depend on undocumented choices.

---

## 1. Design principles

- The Penpot desktop frame is the canonical visual reference.
- Responsive behavior changes layout and scale only when necessary; it does
  not introduce a separate mobile theme.
- Existing tokens are preferred over one-off CSS values.
- Content remains the visual priority. Navigation supports the content rather
  than competing with it.
- The layout must remain usable from small mobile widths through large desktop
  displays without horizontal page scrolling.
- Theme values describe appearance; responsive rules describe arrangement.

---

## 2. Colors

| Token | Value | Use |
| --- | --- | --- |
| `colors.background` | `#1A1D23` | page background |
| `colors.text` | `#E6EDF3` | body text, headings, meta row, explorer heading, chevrons, tree line |
| `colors.accent` | `#6BEFA9` | site title, active folder, emphasis |
| `colors.link` | `#6BEFA9` | links and backlinks |
| `colors.muted` | `rgba(230, 237, 243, 0.5)` | inactive / secondary text |
| `colors.border` | `rgba(230, 237, 243, 0.3)` | subtle structural borders where needed; not used for the desktop tree line |
| `colors.code` | `#E6EDF3` | inline and block code text |
| `colors.codeBackground` | `rgba(230, 237, 243, 0.06)` | code block background |
| `colors.codeBorder` | `rgba(230, 237, 243, 0.15)` | code block boundary |

For Penpot / 8-digit hex notation:

- 50% = `#E6EDF380`
- 30% = `#E6EDF34D`
- 15% = `#E6EDF326`
- 6% = `#E6EDF30F`

`colors.border` is retained as a reusable theme token, but the tree line in the
reference uses `colors.text` with a `0.4px` stroke. The page itself has no
visually prominent border.

---

## 3. Typography

Family: **Instrument Sans**.

Weights used by the design:

- 400 — regular body and metadata
- 600 — backlinks and secondary emphasis
- 700 — titles, headings, explorer labels

Letter spacing is `0` throughout the design.

The Penpot export uses `1.2` line height throughout and Muffin v1 keeps that
value as the canonical line-height token.

```yaml
typography:
  body: '"Instrument Sans", system-ui, sans-serif'
  heading: '"Instrument Sans", system-ui, sans-serif'
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
  baseSize: 14px
  lineHeight: "1.2"
  weight: "400"
  headingWeight: "700"
  sizes:
    xs: 12px
    sm: 14px
    md: 16px
    lg: 20px
    xl: 22px
    2xl: 38px
```

### Text styles

| Role | Size | Weight | Color | Notes |
| --- | ---: | ---: | --- | --- |
| Site title | `2xl` / 38px | 700 | `accent` | desktop left column |
| Page title | `2xl` / 38px | 700 | `text` | page header |
| H1 | `xl` / 22px | 700 | `text` | primary content heading |
| H2 | `lg` / 20px | 700 | `text` | secondary content heading |
| H3 | `md` / 16px | 700 | `text` | tertiary content heading |
| H4 | `sm` / 14px | 700 | `text` | smaller content heading |
| H5 | `sm` / 14px | 600 | `text` | smaller content heading |
| H6 | `sm` / 14px | 600 | `muted` | lowest heading level |
| Sidebar section heading | `md` / 16px | 700 | `text` | TOC, Backlinks |
| Explorer heading | `lg` / 20px | 700 | `text` | "Explorer" |
| Folder (active) | `md` / 16px | 700 | `accent` | active folder label |
| Note (tree item) | `md` / 16px | 700 | `text` | explorer note labels |
| Meta row | `sm` / 14px | 400 | `text` | date, tags |
| Body | `sm` / 14px | 400 | `text` | paragraphs and prose |
| TOC entry | `sm` / 14px | 400 | `text` | default TOC entry |
| TOC inactive | `sm` / 14px | 400 | `muted` | used only when an active TOC state exists |
| Backlink | `sm` / 14px | 600 | `link` | backlink list |

The H2–H6 values are Muffin v1 defaults that extend the mockup's existing
scale. The mockup itself explicitly defines H1 and the surrounding interface
roles; the additional levels keep authored Markdown readable without creating
new font-size tokens.

---

## 4. Spacing

The mockup uses the following values:

| Token value | Use |
| ---: | --- |
| `2px` | between backlink items |
| `5px` | title-to-meta gap, explorer section gap, tree-item vertical padding |
| `10px` | heading-to-content gap, chevron-to-label gap, meta-item gap |
| `20px` | folder-list vertical padding, content-section gap |
| `25px` | page-header-to-body gap |
| `27px` | tree-item horizontal indentation |
| `50px` | gap between TOC and Backlinks |

Muffin v1 maps these to the theme spacing scale as:

```yaml
spacing:
  "1": 2px
  "2": 5px
  "3": 10px
  "4": 20px
  "5": 25px
  "6": 27px
  "7": 50px
```

Keys above `7` are not required by the v1 design. Components that need
intermediate space should use the closest existing token instead of inventing
new values.

The `27px` tree indentation is intentionally retained even though it is an
unusual spacing value. It is part of the reference geometry.

---

## 5. Layout

### Desktop reference

Canvas: `1440 × 1024`.

The Penpot frame shows three visual columns beginning near the top of the
canvas:

| Column | Reference x | Reference width | Reference top |
| --- | ---: | ---: | ---: |
| Left: site title + Explorer | `159px` | `auto` (widest item ≈ `113px`) | `64px` |
| Middle: page | `630px` content measure | `630px` | `64px` |
| Right: TOC + Backlinks | `1149px` | `181px` | `63px` |

Derived desktop relationships:

- left-to-middle offset: approximately `240px`
- middle-to-right gap: approximately `120px`
- right margin: approximately `110px`
- the desktop reference is intentionally asymmetric

These measurements describe the visual reference, not an instruction to use
absolute positioning. Production layout should use normal flow / grid / flex
layout and reproduce the same relationships responsively.

Theme layout values:

```yaml
layout:
  contentWidth: 630px
  asideWidth: 181px
  navWidth: 113px
  mainWidth: 630px
  sidebarInset: 159px
```

`contentWidth` and `mainWidth` are maximum desktop measures, not immutable
widths. They must be allowed to shrink below their desktop values.

### Content measure

The body reading measure is `630px` maximum. On narrower viewports:

```css
width: 100%;
max-width: 630px;
```

The content must never require horizontal scrolling merely to preserve the
desktop measure.

---

## 6. Components

### 6.1 Left column

#### Site title

- `38px`, weight `700`, `accent`
- text: `Muffin` in the reference
- desktop position is governed by the layout system, not absolute positioning

#### Explorer header

- label: `Explorer`
- `20px`, weight `700`, `text`
- chevron box: `25px`
- chevron stroke: `1px`
- chevron color: `text`
- chevron-to-label gap: `10px`

#### Folder list

- vertical padding around list: `20px`
- folder row vertical padding: `5px`
- folder chevron box: `15px`
- folder chevron glyph: approximately `7.5 × 3.75px`
- chevron-to-label gap: `10px`
- active folder uses `accent`

#### Note tree items

- note row width in reference: approximately `113px`
- horizontal indentation: `27px`
- vertical padding: `5px`
- tree line: `0.4px`, `colors.text`
- tree-line-to-label gap: `10px`
- note label: `16px`, weight `700`, `text`

The tree line is a visual navigation affordance and does not become a page
border.

### 6.2 Middle column

#### Page header

- page title: `38px`, weight `700`, `text`
- title-to-meta gap: `5px`
- meta row: `14px`, weight `400`, `text`
- date and tag groups: `10px` apart
- tags are displayed as comma-separated text in the reference

#### Body

- page-header-to-body gap: `25px`
- content sections: `20px` apart
- heading-to-following-content gap: `10px`
- body text: `14px`, weight `400`, `text`

### 6.3 Right column

#### Table of Contents

- section heading: `16px`, weight `700`, `text`
- chevron box: `25px`
- chevron glyph: approximately `12.5 × 6.25px`
- entries: `14px`
- entry gap: `10px`
- entries are plain text by default, not backlink-styled

The design supports an active TOC state. When no client-side active state is
available, all entries use `colors.text`. When active-state behavior is
implemented, the active entry uses `text` and inactive entries use `muted`.

Muffin v1 does not require scroll-spy behavior in the engine solely to satisfy
this visual distinction.

#### Backlinks

- section heading: `16px`, weight `700`, `text`
- links: `14px`, weight `600`, `link`
- backlink item gap: `2px`
- TOC-to-Backlinks gap: `50px`

### 6.4 Icons

Only one icon family is required by the reference: a down chevron.

- stroke: `1px`
- color: `text`
- Explorer / TOC box: `25px`
- folder box: `15px`
- expanded direction is the reference state
- collapsed direction is the vertical inverse of the same glyph

No additional icon set is part of the v1 visual contract.

---

## 7. Responsive behavior

Responsive behavior is part of the design contract. The same components and
tokens are reused; only their arrangement and selected display scale change.

### Breakpoints

Muffin v1 uses three layout ranges:

| Viewport | Mode | Layout |
| --- | --- | --- |
| `≥ 1100px` | Desktop | three columns |
| `700px–1099px` | Tablet | navigation + content; secondary sections below |
| `< 700px` | Mobile | single column |

These are layout thresholds, not separate themes. They may be tuned slightly
in implementation if real content demonstrates that a transition needs to
occur earlier, but the three-mode model should remain intact.

### Desktop: ≥ 1100px

The page preserves the Penpot composition:

```text
┌────────────────┬──────────────────────────┬───────────────┐
│ Site title     │                          │ Table of      │
│                │ Page                     │ Contents       │
│ Explorer       │                          │               │
│                │ Content                  │ Backlinks      │
└────────────────┴──────────────────────────┴───────────────┘
```

- Left: site title + Explorer
- Middle: page header + content
- Right: TOC + Backlinks
- desktop content measure: `630px` maximum
- desktop visual offsets follow the reference geometry

### Tablet: 700px–1099px

The right sidebar moves below the main page content. The left navigation stays
alongside the content while space permits.

```text
┌────────────────┬────────────────────────────┐
│ Site title     │ Page                       │
│ Explorer       │                            │
│                │ Content                    │
└────────────────┴────────────────────────────┘

Table of Contents

Backlinks
```

Rules:

- left navigation remains visible
- main content fills the remaining horizontal space
- `contentWidth` remains a maximum, not a fixed width
- TOC appears after the content
- Backlinks appear after TOC
- the desktop `50px` TOC-to-Backlinks gap may reduce to `20px` on tablet to
  avoid excessive empty space

### Mobile: < 700px

The layout becomes a single vertical flow:

```text
┌─────────────────────────┐
│ Site title              │
│ Explorer                │
├─────────────────────────┤
│ Page title              │
│ date, tags              │
│                         │
│ Content                 │
│                         │
├─────────────────────────┤
│ Table of Contents       │
│                         │
│ Backlinks               │
└─────────────────────────┘
```

Rules:

- one column only
- page horizontal padding: `20px`
- content width: `100%`, capped by `contentWidth`
- no fixed-width desktop columns
- no horizontal page scrolling
- site title remains above the Explorer
- Explorer remains above page content
- page content remains the primary reading area
- TOC moves below page content
- Backlinks follow TOC
- TOC-to-Backlinks gap reduces from `50px` to `20px`
- tree indentation remains visually consistent but may shrink to fit very
  narrow screens if needed

### Mobile Explorer state

The Explorer is collapsible below `700px`.

- default state: expanded on first visit
- expanded state: shows the same tree structure as desktop
- collapsed state: shows the Explorer heading and toggle only
- state persistence should use Muffin's existing client-side navigation state
  mechanism when available
- collapsing the Explorer must not change the current page

No hamburger menu or alternate navigation drawer is part of the v1 design.

---

## 8. Responsive typography and spacing

The desktop type scale is the canonical scale.

Mobile rules are intentionally limited:

- body text remains `14px`
- metadata remains `14px`
- H1 remains `22px`
- page title and site title may reduce from `38px` to `32px` below `700px`
  when needed to prevent awkward wrapping
- no additional font-size tokens are introduced for mobile
- existing spacing tokens remain the default source
- page horizontal padding is the primary mobile spacing adjustment

The goal is to preserve the visual identity rather than make the mobile layout
feel like a separate theme.

---

## 9. Content elements not represented by the mockup

Muffin already supports content that is broader than the Penpot sample. The
following defaults keep those elements visually consistent with the design
without creating a new component system.

### Code

- text: `colors.code`
- background: `colors.codeBackground`
- border: `colors.codeBorder`
- border radius: `0`
- use the existing monospace token for code
- do not introduce shadows

### Blockquotes

- text: `colors.muted`
- left border: `1px solid colors.border`
- padding-left: `10px`
- no background panel
- no radius

### Tables

- full-width within the content measure
- header text uses weight `700`
- cells use normal body text
- boundaries use `colors.border`
- horizontal scrolling is permitted inside the table wrapper on narrow
  screens when the table's intrinsic content cannot reasonably wrap
- the page itself must never horizontally scroll because of a table

### Callouts

Callouts use the existing content semantics but stay visually restrained:

- background: `colors.codeBackground`
- border: `colors.border`
- text: `colors.text`
- no shadow
- no decorative illustration required by the theme

These are functional defaults, not additional Penpot components.

---

## 10. Radius, borders, and shadows

- default radius: `0`
- rounded cards are not part of the v1 design
- `box-shadow`: none
- page border: none visually
- subtle structural borders use `colors.border`
- tree line uses `colors.text` with a `0.4px` stroke as specified above

`radius.sm` and `radius.md` may remain available in `ThemeTokens` for API
compatibility, but Muffin v1's default visual system does not rely on rounded
surfaces.

---

## 11. Font loading

Muffin v1 ships **Instrument Sans** with these weights:

- 400
- 600
- 700

The font package must include the subsets required by the distribution setup
used by Muffin. The CSS fallback stack remains available so the site stays
readable if the custom font cannot be loaded.

The custom font is part of Muffin's shipped visual system, not a requirement
that each generated site configure manually.

---

## 12. Interaction states

The desktop mockup only shows expanded and static states. Muffin v1 defines
the smallest useful set of additional interaction behavior without expanding
the visual system.

### Explorer

- expanded: reference state
- collapsed: same chevron, rotated to indicate collapsed state
- active folder: `accent`
- current note: normal `text`; no additional filled background

### TOC

- default: `text`
- active heading, when client-side state exists: `text`
- inactive headings, when active state exists: `muted`
- hover does not introduce a new color token; links may use normal browser
  interaction affordance or remain visually stable

### Backlinks

- default: `link`
- hover may use normal text-decoration changes
- no additional background treatment

Muffin v1 does not require elaborate hover animations, transitions, or motion.

---

## 13. Accessibility and content resilience

Responsive behavior must preserve readability and navigation at all viewport
sizes.

- text must wrap naturally
- controls must remain usable without precise pointer input
- no information may depend only on color
- active navigation should retain a non-color state indicator where needed
  (for example, link structure, current-page semantics, or emphasis)
- focus styles must remain visible even though they are not depicted in the
  Penpot frame
- long words, URLs, and inline code must not force the page itself to overflow
- media must be constrained to the content measure and scaled down as needed
- tables may scroll inside their own wrapper rather than causing page-level
  overflow

Accessibility behavior takes precedence over pixel-perfect reproduction when
those goals conflict.

---

## 14. Implementation rules

1. Treat this file as the frontend source of truth for Muffin v1.
2. Transcribe design tokens into `DEFAULT_THEME_TOKENS` one key at a time.
3. Do not encode the desktop mockup through absolute positioning when normal
   layout primitives can reproduce it.
4. Keep responsive behavior in layout CSS / rendering structure rather than
   duplicating templates for mobile.
5. Reuse the same components across desktop, tablet, and mobile.
6. Prefer existing tokens over new one-off values.
7. Add a new token only when the design requires a genuinely new visual role.
8. Do not add gradients, shadows, rounded cards, decorative illustrations, or
   extra icon families unless this design contract is intentionally revised.
9. A mobile adaptation is considered correct when content remains readable,
   navigation remains accessible, and the visual hierarchy still matches the
   desktop design language.

---

## 15. Explicit non-goals for Muffin v1

The following are outside the v1 design contract:

- separate mobile and desktop themes
- complex animation systems
- a hamburger navigation drawer
- a second icon library
- card-heavy layouts
- automatic dark/light theme switching
- elaborate hover effects
- engine-level scroll-spy solely for TOC styling
- arbitrary per-site visual identity encoded into Muffin's core theme

Site-specific branding and layout extensions belong in the site built on top of
Muffin rather than being added to this core design system.

# Welcome to Quartz 5

## Mission
Create implementation-ready, token-driven UI guidance for Welcome to Quartz 5 that is optimized for consistency, accessibility, and fast delivery across documentation site. Use the current styles and formats. Have this as an inspiration on how things should look.

## Brand
- Product/brand: Welcome to Quartz 5
- URL: https://quartz.jzhao.xyz/
- Audience: developers and technical teams
- Product surface: documentation site

## Style Foundations
- Visual style: clean, functional, implementation-oriented
- Main font style: `font.family.primary=Source Sans Pro`, `font.family.stack=Source Sans Pro`, `font.size.base=16px`, `font.weight.base=600`, `font.lineHeight.base=25.6px`
- Typography scale: `font.size.xs=13.33px`, `font.size.sm=15.2px`, `font.size.md=16px`, `font.size.lg=17.92px`, `font.size.xl=22.4px`, `font.size.2xl=28px`
- Color palette: `color.text.primary=#ebebec`, `color.text.secondary=#d4d4d4`, `color.text.tertiary=#7b97aa`, `color.text.inverse=#646464`, `color.surface.base=#000000`, `color.surface.muted=#8f9fa9`, `color.surface.raised=#161618`
- Spacing scale: `space.1=1.6px`, `space.2=3.2px`, `space.3=4.8px`, `space.4=6.4px`, `space.5=8px`, `space.6=16px`, `space.7=25.92px`, `space.8=30.4px`
- Radius/shadow/motion tokens: `radius.xs=4px`, `radius.sm=5px` | `motion.duration.instant=200ms`, `motion.duration.fast=500ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
Concise, confident, implementation-focused.

## Rules: Do
- Use semantic tokens, not raw hex values, in component guidance.
- Every component must define states for default, hover, focus-visible, active, disabled, loading, and error.
- Component behavior should specify responsive and edge-case handling.
- Interactive components must document keyboard, pointer, and touch behavior.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.
- Do not ship component guidance without explicit state rules.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and semantic tokens.
3. Define component anatomy, variants, interactions, and state behavior.
4. Add accessibility acceptance criteria with pass/fail checks.
5. Add anti-patterns, migration notes, and edge-case handling.
6. End with a QA checklist.

## Required Output Structure
- Context and goals.
- Design tokens and foundations.
- Component-level rules (anatomy, variants, states, responsive behavior).
- Accessibility requirements and testable acceptance criteria.
- Content and tone standards with examples.
- Anti-patterns and prohibited implementations.
- QA checklist.

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.
- Include known page component density: links (277), lists (29), buttons (15), cards (6), inputs (5), navigation (5), tables (4).


## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Teams should prefer system consistency over local visual exceptions.

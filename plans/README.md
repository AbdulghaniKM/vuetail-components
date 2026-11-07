# VueTail redesign plan

The default look is **Ink**; **Pine** and **Console** are presets (`<html data-vt-preset="…">`).
The contract is [DESIGN.md](../DESIGN.md); token values live in `styles/tokens.mjs`.
Work happens on the `redesign` branch of vuetail-components and vuetail-docs, and, from phase 4, vuetail-template;
it reached the live site (vuetail-docs.vercel.app) when all three merged on 2026-11-08.

| Phase | Work | Status |
|---|---|---|
| 0 | DESIGN.md contract | Done |
| 1 | `styles/tokens.css` generated from `styles/tokens.mjs`, `scripts/tokens.mjs` checker | Done |
| 2 | Docs load the tokens; Ink shell, home page, preset switcher; `useAppUi` presets | Done |
| 3 | Every component on the token vocabulary (0 old names) | Done |
| 3b | Motion on the tokens: ease-out exits, token durations, reduced motion, no `transition-all` | Done |
| 4 | vuetail-template adopts the tokens, the new `theme.ts` and the CLI `styles` entry | Done |
| 5 | `useThemeCustomizer` (replaces `useColorCustomizer`): the five settings on top of any preset | Done |
| 6 | Merge `redesign` into components `main`, then docs `master` and template `main` | Done 2026-11-08: live on vuetail-docs.vercel.app |
| 7 | Docs finalisation: every page on Ink, docs read in order (below) | **In progress** |

## Phase 4 plan

Branch `redesign` in vuetail-template (it is on `main` today). The template keeps its essentials-only
file list: this phase changes the files it already has and adds `src/styles/tokens.css`, nothing else.

What the template has today: an old 16-colour palette in `app.config.ts` that `applyTheme()` injects
at boot, a second copy of it in the `@theme` block of `style.css`, `data-shape` radius rules, a
`theme.ts` that exports `Shape`, and fonts registered as inline variables on `<html>`. Its six bundled
components and four composables are pre-redesign copies. About 85 old token names sit in its own
layouts and pages (`_theme.vue` 28, `_routes.vue` 15, the rest 1 to 6 each).

### 4.1 Registry prep (vuetail-components)

- [x] `useTheme`: drop `palette` and `getColor`. They read the old palette and nothing uses them
  (`useColorCustomizer` has its own `getColor`). `useTheme` then needs only `defaultTheme` from
  `app.config.ts`, plus `applyThemeToDOM` and `getSystemTheme`.
- [x] `scripts/tokens.mjs check --usage --dir <path>`: scan any `src/` (template, docs), not only
  this repo, so the template has a measurable 0.

### 4.2 Theme plumbing (template)

- [x] `src/styles/tokens.css`: a copy of the registry's, recorded in `vuetail.json` like a component.
- [x] `style.css`: import `./styles/tokens.css`; delete the `@theme` palette, the font variables and
  the `data-shape` rules; take body, selection, `:focus-visible` and scrollbar rules from docs.
- [x] `theme.ts`: the docs version (`Preset`, `theme.preset`, `presetInfo`, `presetFonts`).
- [x] `config/app.config.ts` + `types.ts`: `theme` keeps only `defaultTheme`; `typography` drops
  `primary` / `secondary` / `mono` (the tokens own `--font-sans`, `--font-display`, `--font-mono`).
- [x] `config/index.ts`: no `applyTheme()`, no `registerFontFamily()` (the docs fix).
- [x] `utils/theme.ts`: keep `getSystemTheme` and `applyThemeToDOM`, delete the palette generators.
  `utils/fonts.ts`: delete `registerFontFamily` and `applyFontFamily`.
- [x] `index.html`: the docs boot script (theme + `app-preset`), no `app-shape`.
- [x] `main.ts` imports the Ink faces; `package.json` adds the fontsource packages (decision 1).

### 4.3 Bundled files to the registry versions

- [x] Copy over AppEmptyState, AppIcon, AppPageLoader, AppSkeleton, AppToast, ThemeToggle and
  useAppUi, useTheme, useToast, useSidebar from `redesign`, recorded in `vuetail.json` at that SHA.

### 4.4 The template's own pages on the tokens

- [x] Layouts (Auth, Dashboard, Default), `index.vue`, Login, Offline, ServerError, 404,
  `_routes.vue`, `types/text.types.ts`.
- [x] `_theme.vue` becomes the token preview: preset and light/dark switch, every colour token with
  its value, type scale, radius, and a row of real controls.

### 4.5 CLI (`scripts/add.js`)

- [x] `pnpm add-component styles` installs every `registry.json` `"styles"` entry to
  `src/styles/<name>.css`, records it in `vuetail.json`, and `verify` covers it.
- [x] Adding any component warns when `src/styles/tokens.css` is missing or differs from the ref
  being installed.

### 4.6 Docs for the template

- [x] Template README theming section: pick a preset in `theme.ts`, switch at runtime with
  `useAppUi`, edit tokens in `styles/tokens.css`; colours no longer live in `app.config.ts`.

### Verification

- `pnpm build` and `pnpm check` in the template.
- `node scripts/tokens.mjs check --usage --dir ../vuetail-template/src`: 0 old names.
- `pnpm dev`, then screenshot `/`, `/login` and `/_theme` in all six preset × theme combinations; no
  flash of Ink on reload when Pine or Console is stored.
- CLI: in a scratch copy of the template (never the template itself), run
  `node scripts/add.js AppButton --ref redesign` and `styles`, then `verify`.
- `pnpm build && pnpm test` in docs (4.1 touches `useTheme`).

### Decided

1. Fonts: all six fontsource packages ship; Pine and Console load on first use.
2. `IBMPlexSansArabic-Regular.ttf`: deleted.

### Done differently from the plan

- AppToast needs `useMotionTokens` and `useReducedMotion`, so the template ships those two
  composables as well as `tokens.css`.
- The template had newer fixes than the registry: `useTheme` with one module-scope OS listener,
  and AppToast freezing its progress bar while paused. They moved into the registry first.
- `useAppConfig` lost `primaryFont` / `secondaryFont` / `monoFont`; docs `app.config.ts` and
  its showcase moved off typography families too.
- The bundled files are recorded by content, not in a shipped `vuetail.json`: oxfmt reformats
  them, and the CLI now asks before overwriting an unrecorded file that differs.
- Verified: template build and lint, 0 old names (`--dir`), all six preset × theme combinations
  screenshotted with no flash and no console errors, CLI `styles` / add / verify in a scratch copy
  against pushed `74ff2c2`, docs build and tests.

Phase 5 replaced `useColorCustomizer` with `useThemeCustomizer`, which needs only `src/theme.ts`.

## Phase 5 notes

- Renamed to `useThemeCustomizer`: radius, density and font are not colours, and the API is new.
- Inputs: `accent` (hex), `neutralHue`, `radius` (the md step), `density`, `font` (a preset name).
  Each overrides the active preset on its own, in light and dark.
- Derivation is OKLCH. The accent label picks the preset's light or dark text by the weaker of
  fill and hover; when neither reaches 4.5:1 (pure red) the fill darkens until one does. Link and
  ring colours are pushed to 4.5:1 and 3:1. A grey accent keeps the preset's link and ring.
- `checkContrast` uses the accent pairs of `scripts/tokens.mjs`; docs tests run 7 hard accents
  and 5 hues against every preset.
- The preset table inside the composable is generated by `tokens.mjs build` and checked by
  `check`; the usage scan skips that file (it is data).
- Overrides stay in memory and go to `<style id="app-theme-variables">` with `:root:root:root:root`
  selectors, which outrank the preset blocks. RibbonField now follows that stylesheet (even when it
  appears after mount) and `data-vt-preset`.
- Docs dropped the old palette from `app.config.ts`, `types.ts` and `utils/theme.ts`, matching
  the template.

## Docs finalisation

Goal: every vuetail-docs page matches Ink, and the docs read in order. Ink stays the design system:
no Inter, no plain-white light mode, borders over shadows, 3px corners, one token vocabulary. The
audit lens is ui-ux-pro-max's Quick Reference (§1 accessibility, §5 layout, §9 navigation) and
`--stack vue`; its `--design-system` palette generator is not used. vuetail-template is out of scope.
Nothing is committed without the user's OK.

### WP0 audit (2026-11-08)

286 page loads at http://localhost:5199. Each of the 11 guide and shell routes, plus AppButton,
AppModal and useThemeCustomizer, was loaded in all 6 preset × theme combinations at 1440px and
375px. The other 59 doc pages were loaded in Ink light at both widths. axe-core 4.14 (WCAG 2.1 A/AA
plus best practice) ran on every load at 1440px and on Ink at 375px.

What already holds:
- 0 console errors in 286 loads.
- Each preset gets its own face: Schibsted Grotesk, Plus Jakarta Sans, IBM Plex Sans.
- A skip link and `<main id="main">` exist on every page but /login.
- No horizontal page scroll at 375px except on the three error pages.
- The shell (sidebar, preset switcher, header) is on the tokens.

**§9 Navigation**
- [ ] The sidebar is three flat lists. Guide has 6 links. Components is grouped by folder, so
  `Fields/*` is apart and everything else is "Components". Composables is one list of 25. The home
  page already groups the registry by role (Actions and feedback, Forms, Overlays, Data, Navigation
  and layout, Materials), so the sidebar and home disagree.
- [ ] No prev/next on any page (1 of 73 routes has a prev/next link, by accident).
- [ ] Breadcrumbs are visible but not semantic: no `<nav aria-label="Breadcrumb">`, no
  `aria-current="page"`. They fail axe's landmark checks on 73 of 73 routes.
- [ ] The explore pages group by folder (General / Fields) with one repeated icon on almost every
  card. They duplicate the sidebar instead of being the overview it lacks.
- [ ] The page scrolls inside `<main class="overflow-y-auto">`, not the window, so Back does not
  restore the scroll position and `#anchor` links land under the sticky header (§9
  `state-preservation`).
- [ ] Focus stays on the clicked link after a route change (§9 `focus-on-route-change`).
- [ ] The header search filters the sidebar only. There is no ⌘K palette, though the input shows a
  Ctrl K hint.

**§5 Layout**
- [ ] /offline, /500 and the 404 overflow at 375px (the header's actions row, `ms-auto.flex`).
- [ ] DocPage's preview box is a fixed `min-h-[20rem] p-8 bg-surface` card: oversized for small
  demos, with no stage treatment.
- [ ] At 375px the API table is cut off on the right (Default, Description). It needs stacked rows
  or a labelled scroll region.
- [ ] Mixed type scale: guide pages use `text-[1.375rem]`, `text-[0.9375rem]`, `text-[0.8125rem]`,
  `text-[0.6875rem]` (11px). Headings are Title Case ("Getting Started", "Explore Components") where
  DocPage and home use sentence case.

**§1 Accessibility (axe, by routes affected)**
- [ ] `color-contrast` (serious), 69 routes. Two causes cover almost all of it:
  1. `text-text-subtle` on real text, such as home's 12px labels and the getting-started captions.
     The token is 3:1 by design (placeholders, captions); readable text needs `text-text-muted`.
     4.31:1 Ink, 3.68:1 Pine, 3.85:1 Console.
  2. CodeBlock's hard-coded dark theme: comments `#6272a4` on `#1e1e1e` reach 3.54:1 in every
     preset, and the block ignores the tokens (17 raw hex).
- [ ] `scrollable-region-focusable` (serious), 56 routes: the `overflow-x-auto` code and table
  wrappers are not focusable, so keyboard users cannot scroll them. Needs `tabindex="0"`, a
  `role="region"` and a label.
- [ ] `button-name` (critical), 6 routes (AppButton, AppFilterPanel, AppLiquidGlass, …): icon-only
  `size-control-sm` buttons in demos with no label.
- [ ] `landmark-unique` on 6 guide pages (two unnamed asides or navs);
  `page-has-heading-one` on /offline, /500 and the 404; `landmark-one-main` and no skip link on
  /login; `heading-order` on /explore/composables.
- [ ] Component-level, routed to the registry rather than docs: AppTable's select-all header cell
  has no label (`label`, `empty-table-header`); DatePicker nests an interactive element
  (`nested-interactive`).

**Content and Ink**
- [ ] Stale copy: "tokens live in `src/style.css`" (getting-started.vue:172 and :266,
  conventions.vue:144). Tokens are `styles/tokens.css`, the preset is `src/theme.ts`, and tuning is
  `useThemeCustomizer`. (The `solar--palette-linear` hits are icon names, not content.)
- [ ] Design tokens page: colour swatches only. No presets, radius, density, type or motion, and no
  mention of the five settings.
- [ ] Off-token classes in docs (`check --usage --dir ../vuetail-docs/src`): 127 raw hex, 3 raw
  palette, 5 text-muted misuses, 1 old name. The worst are CodeBlock (17), RibbonFieldShowcase (20)
  and AdvancedAppTable demos (14). The glass stages are intentional backdrops.
- [ ] `pnpm test`: 1 of 132 fails (docCoverage, `appnotificationpreview.ts`). Owned by 5d and 76;
  it clears when that doc file lands.

### Packages

| WP | Owner | Owns (only these files) | Estimate | Starts |
|---|---|---|---|---|
| 1 Information architecture | opensource-3b | `layouts/DashboardLayout.vue`, `router/`, new `config/docsNav.ts`, `pages/explore-*.vue`, `App.vue` | 3–4 h | now |
| 2 Component page template | opensource-76 | `pages/DocPage.vue`, `components/docs/ApiTable.vue` (new) | 3 h | after AppNotificationPreview docs (~30 min) |
| 3 Guide pages | opensource-5d | `pages/home.vue`, `getting-started.vue`, `conventions.vue`, `data-layer.vue`, `design-tokens.vue`, `NotFound/Offline/ServerError/Login.vue` | 3 h | now |
| 4 Demo and content sweep | opensource-76 | `components/docs/*.vue` except the two above, `content/docs/*.ts` | 3–4 h | after WP2 |
| 5 QA | opensource-3b | read-only, then fixes routed to the owner | 1.5 h | after 1–4 |

**WP1, information architecture.**
- `config/docsNav.ts` is the single ordered list (title, route, group, icon). The sidebar, the
  explore pages, breadcrumbs, prev/next and search all read it.
- Flow: Start (Introduction, Getting started, Conventions, Data layer) → Foundations (Design tokens,
  Presets & theming, useThemeCustomizer) → Components by role (Actions, Forms, Overlays, Feedback
  incl. AppNotificationPreview, Data, Navigation & layout, Glass) → Composables by role (Theme & UI,
  State & data, Input & events, Motion, Dock, Glass).
- Semantic breadcrumbs from the nav data.
- ⌘K / Ctrl K command palette over docsNav, as a dialog with combobox semantics.
- Window scrolling instead of the `<main>` scroller, so Back restores the position and anchors
  clear the header.
- Focus moves to the h1 on route change.
- The explore pages become role-grouped overviews with distinct icons.
- Exports `prevNext(route)` for WP2.

**WP2, component page template.**
- An Ink preview stage sized to its content (hairline border, `bg` ground, 3px corners, no shadow).
- Preview/Code as a real tablist: `role="tablist"`/`tab`/`tabpanel`, `aria-selected`, arrow keys.
- An on-page TOC from the h2s, with anchors.
- `ApiTable` on the tokens, stacking at 375px, with a focusable scroll region.
- Prev/next from `docsNav.prevNext`.
- Sentence-case headings.

**WP3, guide pages.**
- Rewrite for presets, `src/theme.ts`, `styles/tokens.css`, the five settings and
  `useThemeCustomizer`.
- The design tokens page shows the live tokens per preset: colour, radius, density, type, motion.
- Readable text moves off `text-text-subtle` to `text-text-muted`.
- One type scale, no `text-[Npx]`; sentence case.
- Error pages get an h1, no 375px overflow, and /login a `<main>`.

**WP4, demo and content sweep.**
- CodeBlock on the tokens (a highlight theme built from the token colours, AA in all six
  combinations).
- Focusable labelled scroll regions for code and tables.
- Labels on the icon-only demo buttons.
- Raw hex and palette classes onto tokens, except the glass backdrops.
- Stale examples in `content/docs/*.ts`.

**WP5, QA.**
- Rerun this crawl, aiming for 0 serious or critical axe issues and 0 overflow at 375px.
- Keyboard pass through nav, palette, tabs and TOC.
- `prefers-reduced-motion`.
- `pnpm test` and `pnpm build`.

Rules for every package: edit only the files your package owns, and message the owner for anything
else. Don't commit; the user approves commits. Don't touch vuetail-template. The two registry
findings (AppTable, DatePicker) go to the components repo, not to docs.

### Status at handoff (76)

Done, uncommitted, `pnpm test` 132/132 and `pnpm build` clean in vuetail-docs:
- Docs 404 / empty-preview fix. `pages/DocPage.vue` globs `content/docs/*.ts` and
  `components/docs/*.vue`, so demos need no registering. Loading, error and not-found states are
  `h()` components, and a failed import shows "This example failed to load".
- New docs: `appbadge`, `appcheckbox`, `appnotificationpreview`, `usedockdrag`, `usedockflight`,
  `usedockposition`, `useliquidglass`, `usemotiontokens`, `usereducedmotion`, `usetabledisplay`.
  Fixed `apppageloader`, `apppopover`, `appskeleton`.
- New demos: `AppPageLoaderDemo`, `AppPopoverDemo`, `AppCheckboxDemo`, `AppCheckboxSelectAllDemo`,
  `AppNotificationPreviewDemo`.
- `tests/docCoverage.spec.ts`: fails on any registry entry without a doc, or an example
  `component` that resolves to nothing.
- AppNotificationPreview: docs, demo, the README section here and the tracker row are all done.
  Two component bugs are with 5d: dark-appearance stack ghosts can't be seen, and an invalid
  `time` throws in Intl. The stack demo uses light appearance until the first one is fixed.

Half-done: nothing. WP2 and WP4 have not started; no files are open.

Next:
- WP2: start in `pages/DocPage.vue` with the Preview/Code tablist (the `exampleStates` buttons at
  the top of each example section), then the h2 anchors and TOC, then `components/docs/ApiTable.vue`.
  WP2 is confirmed as 76's (3b, at handoff). `config/docsNav.ts` exists, so use `prevNext(route.path)`
  and `breadcrumbs(route.path)`, or place `<DocsBreadcrumbs/>` and `<DocsPager/>` from
  `components/nav/`. They replace DocPage's hand-made breadcrumb `<nav>`. Don't edit 3b's
  uncommitted WP1 files: `DashboardLayout.vue`, `config/docsNav.ts`, `components/nav/*`.
  WP0 findings on DocPage: Preview/Code need tab roles; the preview box is a fixed
  `min-h-[20rem] p-8 bg-surface` card; the API table is cut off at 375px; the `overflow-x-auto`
  code and table wrappers need `tabindex="0"`, `role="region"` and an `aria-label`; the breadcrumb
  nav has no `aria-label`.
- WP4: after WP2.
- AppNotificationPreview: once 5d fixes the dark ghosts, set `appearance="dark"` back on the stack
  example in `AppNotificationPreviewDemo.vue` and in `content/docs/appnotificationpreview.ts`.

### Status at handoff (3b, 2026-11-08)

WP0 is done (above). WP1 is about 60% done, uncommitted, type-checks, and passed a smoke test
(0 console errors; Ctrl K → "toast" → Enter lands on AppToast with focus on its h1).

- Done:
  - `src/config/docsNav.ts` **exists**. It holds the parts, role sections, `docsPages`,
    `findDocsPage`, `prevNext(path)` and `breadcrumbs(path)`. WP2 can use it now.
  - `src/components/nav/DocsBreadcrumbs.vue` (semantic `nav` + `ol` with `aria-current`) and
    `src/components/nav/DocsPager.vue` (prev/next with `rel`). Pages place them: WP2 in DocPage,
    WP3 in the guide pages, each replacing its own hand-made breadcrumb `<nav>`.
  - `src/components/nav/CommandPalette.vue`: a ⌘K / Ctrl K / `/` dialog with combobox and listbox.
  - `src/components/nav/DocsNavTree.vue`.
  - `src/layouts/DashboardLayout.vue`: the sidebar reads docsNav and the header search opens the
    palette. The page scrolls the window, not `<main>`. The mobile sheet is a dialog with Escape
    and a focus trap. Focus moves to the h1 on route change.
- Not started:
  - `src/router/index.ts` scrollBehavior: restore `savedPosition`; for a hash, scroll to the
    element with `top: 72` (the header), smooth only without reduced motion; otherwise `{ top: 0 }`.
  - `pages/explore-components.vue` and `pages/explore-composables.vue`: rebuild as role-grouped
    overviews from `docsNav`, and drop the folder grouping and the repeated card icon.
  - home.vue's own GROUPS list (WP3) should import from docsNav so the two can't disagree.
- Next step: the router scrollBehavior (5 min). Then the explore pages (about 1 h). Then rerun the
  WP0 crawl against the sidebar.

## Known decisions

- Plain white is not used anywhere in Ink light.
- Control edges (`border-strong`) are 3:1 in every preset (WCAG 1.4.11), enforced by the checker.
- motion-v keeps `y`/`scale` shorthands: in motion-v 1.6.1, full `transform` strings flash the
  initial state for one frame when an animation ends. Revisit on upgrade.
- `useMotionTokens` parses `.2s` and `200ms`: production CSS minifies `200ms` to `.2s`.
- Intentional raw colours: AdvancedAppTable's categorical palette, liquid-glass material constants,
  RibbonField canvas fallbacks, the dark chrome of AppDock and AppNavbar, white on glass in
  AppButton's glass mode, and the white controls of AppImageModal (they sit on a dark backdrop).

## Before the merge (phase 6)

- [x] AppTable column switch: on is `accent-fg` on `accent`, off is `text-muted` on `muted` inside a
  `border-strong` edge, all pairs the checker holds to AA; `rounded-switch` corners.
- [x] `vuetail-docs/audit-plan.md` deleted.
- [x] AppText: `color` takes `text`, `text-muted`, `text-subtle`, `accent`, `success`, `warning`,
  `danger`, `info`, mapped to the text-safe tokens (`accent-text`, `*-text`); `primary`,
  `secondary`, `text-secondary`, `error` and `text-text-muted` still work. `font` takes `sans`,
  `display`, `mono` (`primary` / `secondary` still work); the old `--font-primary` variable no
  longer existed. Gradient stops gained `primary`. The template's `text.types.ts` matches.
- [x] Template `pnpm check`: the format failures were CRLF only; `check` also called a missing
  `typecheck` script, now added. It passes.

`// token-scan: off` … `// token-scan: on` in a source file hides prop values that look like
classes from `check --usage` (AppText uses it).

Usage check before the merge: 0 old names, 14 raw palette, 46 raw hex, all intentional.

## Checks

```bash
node scripts/tokens.mjs check            # tokens, contrast in all six preset × theme combinations
node scripts/tokens.mjs check --usage    # leftover old names, raw palette, hex in components
cd ../vuetail-docs && pnpm build && pnpm test
```

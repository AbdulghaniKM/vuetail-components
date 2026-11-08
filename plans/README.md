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
| 8 | Apply DESIGN-BIBLE.md to the registry (P1–P8, below) | **In progress**: P1–P7 done, P8 icons left |
| 9 | Composables: fix the 25, add the four that components duplicate (below) | **In progress**: 9.1–9.3 done, 9.4 left |

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
- [x] The sidebar is three flat lists. Guide has 6 links. Components is grouped by folder, so
  `Fields/*` is apart and everything else is "Components". Composables is one list of 25. The home
  page already groups the registry by role (Actions and feedback, Forms, Overlays, Data, Navigation
  and layout, Materials), so the sidebar and home disagree.
- [x] No prev/next on any page (1 of 73 routes has a prev/next link, by accident).
- [x] Breadcrumbs are visible but not semantic: no `<nav aria-label="Breadcrumb">`, no
  `aria-current="page"`. They fail axe's landmark checks on 73 of 73 routes.
- [x] The explore pages group by folder (General / Fields) with one repeated icon on almost every
  card. They duplicate the sidebar instead of being the overview it lacks.
- [x] The page scrolls inside `<main class="overflow-y-auto">`, not the window, so Back does not
  restore the scroll position and `#anchor` links land under the sticky header (§9
  `state-preservation`).
- [x] Focus stays on the clicked link after a route change (§9 `focus-on-route-change`).
- [x] The header search filters the sidebar only. There is no ⌘K palette, though the input shows a
  Ctrl K hint.

**§5 Layout**
- [ ] /offline, /500 and the 404 overflow at 375px (the header's actions row, `ms-auto.flex`).
- [x] DocPage's preview box is a fixed `min-h-[20rem] p-8 bg-surface` card: oversized for small
  demos, with no stage treatment.
- [x] At 375px the API table is cut off on the right (Default, Description). It needs stacked rows
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

### Status (70, 2026-11-08)

The 3b, 5d and 76 sessions are gone; 70 owns every package. WP1 is done, uncommitted. Docs
`pnpm test` 147/147 (the docCoverage failure cleared), `vue-tsc -b` clean.

- `router/index.ts` scrollBehavior: `savedPosition` on Back; a hash clears the header by 4.5rem
  (from the root font size), smooth unless reduced motion; otherwise `{ top: 0 }` with no animation.
  Tests: `tests/routerScroll.spec.ts`.
- `components/nav/DocsOverview.vue`: one overview for a docsNav part. h1, intro slot with the count,
  semantic breadcrumb, a labelled filter over name, key and description with a `role="status"`
  count, role sections with their own icon (`DocsNavSection.icon`), cards with the doc's
  description, an empty state with Clear filter, and the pager. `explore-components.vue` and
  `explore-composables.vue` are now 10-line wrappers. Tests: `tests/docsOverview.spec.ts`,
  `tests/docsNav.spec.ts`.
- Checked in all 6 preset × theme combinations at 1440px and 375px: 0 console errors, 0 overflow,
  0 serious or critical axe issues. One moderate `region` on the layout's skip link (WP5).
- TDD guard: docs `vite.config.ts` adds the `tdd-guard-vitest` reporter (dev dependency) only when
  `CLAUDE_PROJECT_DIR` is set. Run tests with
  `CLAUDE_PROJECT_DIR="C:/Users/Abdulghani/Desktop/OpenSource"` so the guard sees red and green.

WP2 is done, uncommitted. Docs `pnpm test` 159/159, `vue-tsc -b` clean.

- `components/docs/PreviewCodeTabs.vue`: APG tabs with automatic activation (arrows wrap, Home, End,
  one tab stop), `hidden` panels so demos keep their state, the preview panel is the Ink stage
  (`bg` ground, hairline border, no min-height, no shadow).
- `components/docs/ApiTable.vue`: a stacked list below `sm`, a table in a focusable labelled
  region from `sm`.
- `pages/DocPage.vue`: `DocsBreadcrumbs`, `DocsPager`, h2 ids with an "On this page" rail at `xl`
  (sticky, clears the header), a named copy-install button, an h1 on the not-found state, token
  buttons, no `animate-in`, no px. CodeBlock's own Copy replaces the duplicate "Copy code" bar.
- Checked AppButton, AppModal, useThemeCustomizer and AppTable in all 6 combinations at both
  widths: DocPage's own chrome has 0 axe findings, 0 overflow, 0 console errors. Arrow keys and the
  TOC anchor (lands at 72px) checked in Chromium.
- Left for WP4 (demos and content): icon-only buttons without labels in the AppButton examples, the
  useThemeCustomizer demo's `.max-h-72` scroll box at 375px, Title Case example titles, dated
  descriptions. For the registry: AppTable's toolbar icon buttons, row and select-all checkbox
  labels, `text-text/50` contrast, empty header cells and its `overflow-x-auto` scroller.

WP3 is done. Docs `pnpm test` 196/196, `vue-tsc -b` and `pnpm build` clean.

- `components/docs/GuidePage.vue` + `GuideSection.vue`: the frame for guide pages (breadcrumb, h1,
  lead, the shared `components/nav/OnThisPage.vue` rail that DocPage now uses too, pager). Each page
  declares its sections once, so the h2s and the rail cannot drift.
- Getting started, Conventions and Data layer rewritten against vuetail-template as it is: presets
  in `src/theme.ts`, tokens in `src/styles/tokens.css`, `useAppUi` / `useTheme` /
  `useThemeCustomizer`, file-based routes with `definePage()`, the in-memory auth token. No
  `localStorage` auth, no "tokens live in style.css".
- Design tokens: live values of the active preset (colour by group, radius, density, type,
  motion) through `components/docs/useLiveTokens.ts`, which follows preset, theme and customizer
  changes.
- home.vue groups the registry from docsNav. Breadcrumbs no longer link "Docs" to the page you are
  on. `/login` has a `<main>`. Pages, nav and layouts use the Tailwind type scale only
  (`tests/typeScale.spec.ts` guards it); readable text moved off `text-text-subtle`.
- Checked 9 routes in all 6 combinations at both widths: 0 console errors, 0 overflow (the error
  pages included), 0 critical axe. The 30 serious hits are all CodeBlock comment colour (WP4).
- The docs `.prettierrc` has `htmlWhitespaceSensitivity: "ignore"`, which splits punctuation from
  inline tags and renders a stray space ("`dist/` ."). The guide pages were formatted with
  `--html-whitespace-sensitivity css`; a plain `pnpm format` would break them again.

WP4 is done. Docs `pnpm test` 374/374, `vue-tsc -b` and `pnpm build` clean.

- CodeBlock: syntax colours from the text-safe tokens on `bg` (all held to 4.5:1 by the checker),
  no Prism theme, no hex. It caps at 37.5rem and becomes a focusable labelled group only when it
  overflows. This cleared every CodeBlock contrast hit.
- Registry: AppButton names an icon-only button from `label`, then `tooltip`; an explicit
  `aria-label` still wins. This cleared button-name on AppButton, AppLiquidGlass and the AppTable
  and AppFilterPanel toolbars.
- Demos: readable text no longer faded with `opacity-*` or `/40` alpha; every scroll box is
  focusable and labelled; useLocalStorage's delete button is named and shows on focus.
  Guarded by `tests/demoContrast.spec.ts` and `tests/demoScroll.spec.ts`.
- Content: 80 titles in sentence case (`tests/docContent.spec.ts`), the AppSpinner colour example's
  code and preview agree, the AppTooltip triggers are named. No removed API is referenced.
- Raw hex left in docs is intentional: glass and magnifier backdrops, AdvancedAppTable's categorical
  palette, RibbonField colours, notification app icons, and hex as customizer input.
- Site crawl (all 70 routes, Ink light, both widths) after WP4: 0 overflow, 0 console errors. The
  serious or critical hits left are all inside registry components: AdvancedAppTable identity
  colours (contrast), AppTable checkbox labels and `text-text/50`, Select's `text-text/50`
  placeholder (also in AppFilterPanel), AppDock's badge contrast, DatePicker's nested interactive.

Registry fixes are done, uncommitted. Docs `pnpm test` 429/429, `tokens.mjs check` and
`check --usage` OK.

- No registry component fades text with a token alpha (`text-text/50`, `text-text-muted/40`, …):
  readable text is `text-text-muted`, native placeholders and decorative icons `text-text-subtle`.
  Guarded by docs `tests/registryContrast.spec.ts`.
- AppDock badge `#e5484d` → `#d93036` (3.91 → 4.74:1 with white).
- AppTable: named select-all and row checkboxes, readable text in the select and actions header
  cells, and its horizontal scroller is a focusable labelled group.
- DatePicker: the Clear button is beside the trigger, not nested inside it.
- AdvancedAppTable: avatar initials, hue chips and `tone()` badges mix the hue 55% with
  `--color-text`, so each keeps its colour and reaches at least 4.99:1 on its tint in light and
  dark; the identity code drops its 0.75 opacity. Guarded by `tests/advancedAppTableHues.spec.ts`.
- Site crawl after this (all 73 routes, Ink light, both widths): 0 serious or critical, 0 overflow,
  0 console errors.
- Not changed: AdvancedAppTable line ~1259 uses an overshooting `cubic-bezier(0.22, 1.12, 0.36, 1)`
  that the design hook flags as bounce easing. It predates this work; the owner decides.

Next: WP5.

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

## Phase 8: apply DESIGN-BIBLE.md (in progress, uncommitted)

Guarded by docs `tests/designBible.spec.ts`. Order follows the bible's appendix.

- [x] P1 focus: one ring in `tokens.css` (`@layer base`, `:where(:focus-visible)`), docs and
  template drop their unlayered rule, 11 components lose halos and focus edge changes; fields
  draw the ring at -1px. Checked in Ink dark, Pine light, Console dark: one 2px outline, no shadow.
- [x] P2 navigation: AppDock chrome, tiles, badge and shadows on tokens; AppNavbar defaults to
  `surface`, `dark` is token-built (inverse in light, raised surface in dark), CTA on accent tokens.
- [x] P3 AppNotificationPreview: wallpaper from `--color-accent`, icon fill on accent tokens, caption on
  the type scale.
- [x] P4 materials: RibbonField's ribbons from `--color-accent` and `--color-ring` (a drained accent
  where they match, as in Console), word font `--font-sans`. AppLiquidGlass's default tone is
  `--color-surface`, its high-contrast edge `--color-text`, its shadow `--shadow-lg`, and its hover
  transition is on `--vt-duration` / `--vt-ease` (the overshoot curve is gone). The white specular
  highlights stay as material constants. Checked in Chrome in Ink light and dark, Pine dark and
  Console light.
- [x] P5 motion: `tokens.css` sets Tailwind's `--default-transition-duration` / `-timing-function` to
  `--vt-duration` / `--vt-ease`, so every bare `transition-colors` follows the preset (Ink 160ms,
  Console 110ms). No `cubic-bezier` literals, `duration-NNN` or raw `0.2s ease` in components:
  AdvancedAppTable (17 transitions, the overshoot bulk bar), AppNavbar (`useMotionTokens`), AppTable,
  AppDock, AppImageModal, AppNotificationPreview. AppPageLoader moves on `scaleX`, not `width`.
  Exempt: infinite loading loops (`ease-in-out`) and AppToast's linear countdown. Guarded by the
  §10 block in docs `tests/designBible.spec.ts`.
  Not changed: the capsule's `max-width` contraction in AppNavbar and `useDockFlight`'s spring,
  which overshoots (damping ratio 0.74). Owner decides.
- [x] AppNavbar layout (user report, "the nav looks bad"): the full nav switches on a container
  query on the bar (`sm` 40rem … `xl` 80rem), not the viewport, so a narrow bar shows the menu
  button instead of overflowing; links don't wrap; the dark tone has an inverse CTA (Ink's accent
  vanished into the capsule); its private accent focus outline is gone (one ring). The default
  tone is `surface` in the docs too. Docs: the bar pins below the mock browser chrome and the demos
  use `sm`.
- [x] P6 shape and type: AdvancedAppTable's 14 radii onto `--radius-*` by role (shell and row
  cards `lg`, triggers and menu items `md`, badges and chips `--radius-badge`, switch
  `--radius-switch`, bulk bar `xl`) and its 13 sizes onto `--text-xs` / `--text-sm`, so 10 and 11px
  text is gone. Its uppercase mono column headers, menu title and card labels are sentence-case sans
  now (mono stays for IDs, counts and pagination). AppButton sizes are `text-xs` / `text-sm` /
  `text-control` / `text-base`; AppBadge, AppToast, AppTooltip, AppFilterPanel, InputField's error
  text and AppDock's badge are on the scale; AppDock is `rounded-xl` with `rounded-lg` tiles;
  AppSkeleton and AppTable's sort button are `rounded-sm`; AppTable headers and DatePicker weekdays
  lose `uppercase`. Exempt (§13): AppNotificationPreview's imitated screen and AppLiquidGlass.
  AppText's opt-in `overline` variant is kept.
- [x] P7 elevation: only `shadow-sm` / `-lg` / `-xl` (`var(--shadow-lg|xl)` in CSS). AppTooltip
  `shadow-md` → `lg`; AppTable loses `hover:shadow-md` and the inset accent bar on row hover;
  AdvancedAppTable's bulk bar loses its black shadow and accent glow, the avatar its hover glow;
  AppDock and AppNavbar read `--shadow-lg|xl` instead of `--vt-shadow-N`; AppDock's badge ring is an
  outline and its private double focus ring is gone (one ring, §4). Kept: the sticky table
  header's inset 1px border line.
  Guarded by the §5 and §6/§8 blocks in docs `tests/designBible.spec.ts`.
- [ ] P8 icons

**Modal flash (user report, fixed, uncommitted).** Two causes, both measured in Chrome:
1. motion-v 1.6.1 resets every motion element to its `initial` for one frame when an animation
   ends, so the modal went to opacity 0 at ~250ms and then to 1. Docs now run motion-v 2.11.1
   (`^2.2.1`, the template's range); the frame is gone. AppModal's static fade targets are hoisted
   constants. Retest "Known decisions: motion-v keeps y/scale shorthands" on 2.x before relying on it.
2. The body scroll lock removed a 10px Windows scrollbar, shifting the page 5px and the header
   10px. `tokens.css` reserves it: `@layer base { :where(html) { scrollbar-gutter: stable } }`.
Also: AppModal's close button, ThemeToggle and AppTable's editable-cell trigger had
`focus-visible:outline-none`, which beats the zero-specificity ring and left no focus indicator.
Removed; guarded in `designBible.spec.ts`.

## Phase 9: composables

Reviewed all 25 on 2026-11-08. Each step: fix, a vitest spec in docs `tests/` that fails first,
the README section, the docs page in `content/docs/`. Order is by user impact. Estimates are for
one session.

### 9.1 Bugs (about 3 h)

| # | Composable | Defect | Fix |
|---|---|---|---|
| 1 | useInfiniteScroll | Stalls when a page does not fill the box (the observer never fires again); Vue appends new items after its hand-inserted sentinel; `reset()` during a fetch appends the stale page; container scrolling only | `sentinelRef` the consumer places last; re-check intersection after each load; a request id (or `AbortSignal` to `fetch`) drops stale pages; `root: null` option for window scrolling |
| 2 | useConfirm | A second `confirm()` leaves the first promise pending forever; `createApp` loses router, plugins and provides; a fixed 300ms close | Resolve the previous with `false`; render through one `<AppConfirmHost>` mounted in the app (or `app._context`); resolve after the exit (`--vt-duration-exit`); a `variant` beyond danger |
| 3 | useAuth | Access and refresh tokens in `localStorage`, against the template's in-memory `lib/authToken.ts` and the docs guide; refresh logic written twice | Build on `lib/authToken.ts`; one `refresh()` used by both the axios provider and the public method; `AuthUser` without `[key: string]: any` (generic `useAuth<TUser>()`); registry `requires.files` gains `src/lib/authToken.ts` |
| 4 | usePagination | Page is not clamped when `total` shrinks (page 5 of 2, empty slice); options are not reactive | Watch `totalPages` and clamp; `MaybeRefOrGetter` for `total`, `pageSize`, `maxVisiblePages`; reset to 1 when `pageSize` changes |
| 5 | useKeyboard | Single-key shortcuts fire while typing; `shift+/` never matches (`e.key` is `?`); IME composition and `repeat` not handled | Skip editable targets unless the combo has ctrl/alt (option `allowInInputs`); match on `e.key` with shift folded in; ignore `isComposing`; option `repeat: false` |

**9.1 status (2026-11-08): done, uncommitted.** Docs `pnpm test` 664/664, `pnpm build` clean,
checked in Chrome (0 console errors). Each has a spec in docs `tests/`, a README section under the
new "Composable reference" and an updated docs page.
- useInfiniteScroll (`useInfiniteScroll.spec.ts`, 8): re-checks the sentinel after every page,
  drops pages that land after `reset()` or unmount (generation counter + `AbortSignal` passed to
  `fetch`), advances the page only on success, `sentinelRef` and `window` options. One claim was
  wrong: Vue already keeps the added sentinel last (it inserts before its own fragment anchor), so
  there was no ordering bug; the spec keeps it as a guard.
- useConfirm (`useConfirm.spec.ts`, 4): renders through `render()` with the caller's
  `appContext`; a second confirm answers the first with `false`; unmounts after
  `--vt-duration-exit`; `variant: 'primary'` and `body` options (ConfirmDangerModal gained
  `variant` and a default slot). Found on the way: **AppModal confirmed on Enter while Cancel had
  focus**, so Enter on Cancel ran the destructive action. AppModal now leaves Enter to focused
  buttons and links. The spec mocks motion-v: happy-dom throws an AbortError when an animation is
  cancelled, which browsers do not.
- useAuth (`useAuth.spec.ts`, 6): on `lib/authToken.ts` (memory) plus an httpOnly refresh cookie;
  nothing in localStorage; one refresh in flight shared with the interceptor; `configureAuth()`
  for routes; `useAuth<TUser>()`. The template's `lib/authToken.ts` now keeps the token in a
  `shallowRef` (same functions), so `isAuthenticated` follows a clear made anywhere; docs got a
  copy and the registry `requires.files`. Found on the way: a 401 on the refresh request would make
  the interceptor wait on its own refresh; the request is marked `_retry`.
- usePagination (`usePagination.spec.ts`, 6): sync clamp when `total` shrinks, page 1 on a new
  `pageSize`, `MaybeRefOrGetter` options, clamped `initialPage`. AppTable picks this up as is.
- useKeyboard (`useKeyboard.spec.ts`, 10): single keys stay quiet in fields (Escape and modified
  combos still fire), `shift+/` and `?` both match, IME composition ignored, `repeat` and
  `allowInInputs` options, `enabled` takes a getter.
- README: AppNavbar's stale "Why `tone="dark"` is the default" is now "surface by default, dark on
  request", plus the container-query breakpoint.

### 9.2 Smaller fixes (about 2 h)

- useDebounce, useThrottle, useClipboard: clear timers in `onScopeDispose`; debounce gains
  `cancel()` / `flush()`; useClipboard falls back to a hidden textarea where `navigator.clipboard`
  is missing (http, old WebViews) and takes the toast text as an option.
- useMotionTokens: add `state()` for `--vt-duration`; return opacity-only, near-zero-duration
  transitions under reduced motion. Decide whether `tokens.css` shortens durations under
  `prefers-reduced-motion` (the bible says it does; today only the press transform is dropped).
- useLiquidGlass (content mode): the rAF loop reads every pane's rect every frame while any pane
  exists. Run it only while a pane is in view (IntersectionObserver) and stop after a quiet frame.
- useSeo: `watchEffect` over the config getter, so a title from fetched data updates; not only on
  `route.path`.
- useFormValidation: superseded by `useForm` (9.4); keep as a thin wrapper for one release.

**9.2 status (2026-11-08): done, uncommitted.** Docs `pnpm test` 677/677, `pnpm build` clean,
checked in Chrome.
- Reduced motion (user decision: shorten): `styles/tokens.mjs` exports `reducedMotion` and
  tokens.css ends with `@media (prefers-reduced-motion: reduce) { :root, :root[data-vt-preset] }`
  at 80 / 100 / 70ms and no press movement, in every preset (Chrome: Ink, Pine and Console all
  read 80/100/70ms under `reducedMotion: 'reduce'`). DESIGN.md and the bible say so.
- useMotionTokens: `state()` for `--vt-duration`; AppNavbar's pill uses it.
- useDebounce: `flush()` / `cancel()` on the returned ref; debounce, throttle and useClipboard
  timers stop on scope dispose. useClipboard falls back to a hidden textarea and the legacy copy
  command, takes `toastMessage`. Spec `useDebounce.spec.ts` (6).
- useLiquidGlass: the content-mode loop runs only while a marked surface is on screen
  (IntersectionObserver). Chrome with a Safari user agent: about 1800 layout reads a second
  before, on screen or not; 152 on screen and 0 off screen after; the lens still draws.
- useSeo: `watchEffect`, so a getter follows fetched data (`useSeo.spec.ts`, 2).
- useFormValidation: nested error keys (`address.city`) by full path (`useFormValidation.spec.ts`, 3).

### 9.3 Cleanups (about 1 h)

- useLocalStorage: sync across tabs (`storage` event) or wrap `@vueuse/core` `useStorage` (already
  a dependency) with the zod check.
- useAppConfig: return the static config object; twelve `computed`s over a constant add nothing.
- useTableDisplay: `data-view` / `data-density` on `<html>` are generic names any app might use;
  rename to `data-vt-table-view` / `data-vt-table-density` (AdvancedAppTable's CSS follows).
- useBreakpoint: `greaterThan` is really "at least" (`min-width`), so rename or alias
  `atLeast`; share the five media queries at module scope instead of five per call.
- useDateFormat: `MaybeRefOrGetter` + `toValue` instead of the `'value' in date` check.
- useDockFlight: `FLIGHT_MS` and the spring are the open motion decision (bible §10 bans
  overshoot); read `--vt-duration-enter` and use `useReducedMotion` instead of its own media query.
- useToast: optional `max` (oldest dropped), an `action` (Undo), `update(id)` and `promise()`.
- Version the registry's `motion-v` requirement (`^2.2.1`); it is unversioned today and docs ran 1.x.

**9.3 status (2026-11-08): done, uncommitted.** Docs `pnpm test` 693/693, `pnpm build` clean;
template `lint` and `typecheck` pass (`format:check` flags 29 untouched files: CRLF from
`core.autocrlf=true` on this checkout, as before). Checked in Chrome, 0 console errors.
- useToast: `max` (default 5, oldest closes), `action` (AppToast shows the button; it runs, then
  closes the toast), `update(id, patch)`, `promise(p, { loading, success, error })`,
  `configureToasts()`. `useToast.spec.ts` (6). ToastBoard demo rewritten on Ink (it named a missing
  Solar icon and used shadows and an uppercase footer).
- useLocalStorage: follows other tabs through the `storage` event, same schema; listener stops
  with the scope. `useLocalStorage.spec.ts` (3).
- useTableDisplay: `<html data-vt-table-view>` / `data-vt-table-density` (nothing read the old
  generic names; AdvancedAppTable uses its own element's attributes).
- useBreakpoint: `atLeast()`, `greaterThan` kept as a deprecated alias; one shared set of media
  queries. useDateFormat / useDateRange take `MaybeRefOrGetter`. useDockFlight and useDockDrag use
  `useReducedMotion` (registry deps updated). `composableCleanups.spec.ts` (4).
- Registry `requires.packages`: `motion-v@^2.2.1`. Template CLI (`scripts/add.js`): prints
  `pnpm add …` for required packages missing from package.json; `run()` only when executed, so the
  helpers are importable. `cliPackages.spec.ts` (3).
- Template bundled copies synced with the registry and formatted with oxfmt: AppToast,
  ThemeToggle (it still had the old ring halo with `outline-none`), AppPageLoader, AppSkeleton,
  useToast, useMotionTokens.
- Not done, on purpose: useAppConfig. Three template layouts read its refs, so returning the plain
  object would break them for no gain.
- Still open (user decision): useDockFlight's 420ms overshooting spring and AppNavbar's
  `max-width` contraction.

### 9.4 New composables (about 5 h, then adopt)

| New | Replaces code in | API sketch |
|---|---|---|
| useOverlay | AppModal, AppImageModal, docs CommandPalette, DashboardLayout's mobile sheet (four focus traps, two scroll locks) | `useOverlay(panelRef, open, { initialFocus, returnFocus, lockScroll, closeOnEscape })`: focus trap, return focus, scroll lock with a stacking count, Escape, `inert` on the rest of the page |
| useRovingFocus | Select, AppImageModal, PreviewCodeTabs, PresetSwitcher, CommandPalette (arrow keys written five times) | `useRovingFocus(items, { orientation, loop, typeahead })`: one tab stop, arrows, Home/End, typeahead, `aria-activedescendant` mode for comboboxes |
| useForm | useFormValidation, ad hoc submit state in forms | `useForm({ schema, initial })` → `values`, `errors` (nested zod paths), `touched`, `validate()`, `handleSubmit(fn)`, `isSubmitting`, `reset()` |
| useAnnouncer | `aria-live` in 7 components (AppToast, AppTable, Fields…) | `announce(message, 'polite' \| 'assertive')` through one live region, so messages are not lost when a component unmounts |

Adoption: AppModal and AppImageModal move to useOverlay first (their traps differ today), then
the docs CommandPalette and DashboardLayout; Select and the docs tab and switcher components to
useRovingFocus. Each needs a registry entry, `dependencies`, a README section and a docs page
(docCoverage fails without one).

### 9.5 Checks

`pnpm test` and `pnpm build` in docs; a keyboard pass through every overlay and list after 9.4;
the motion check (`tests/designBible.spec.ts`) stays green.


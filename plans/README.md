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
| 7 | Docs finalisation: every page on Ink, docs read in order (below) | Done 2026-11-10 (WP5 QA uncommitted) |
| 8 | Apply DESIGN-BIBLE.md to the registry (P1–P8, below) | Done 2026-11-10 (uncommitted) |
| 9 | Composables: fix the 25, add the four that components duplicate (below) | Done 2026-11-08 |
| 10 | Icon set choice: Heroicons (default), Lucide, Phosphor, picked per project by the CLI (below) | Done 2026-11-10; docs preview per set left as optional |
| 11 | New components: 8 basics, 5 from Pasta UI, the Sileo toast morph, interior.dev picks (below) | Done 2026-11-13 (11.1 to 11.6; Chrome 6-combination matrix still open); next is phase 12 |
| 12 | Blobify: the goo morph as a shared primitive (AppBlob, AppSwap, useBlob, useIndicator), then nine places it goes; ship step syncs the template and checks the docs deploy (below) | In progress: 12.0–12.2 done 2026-11-13 (primitives, AppToast on them); 12.3 next |

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

**WP5, QA.** (2026-11-10, uncommitted)
- [x] Crawl (scratchpad `crawl.mjs`, installed Chrome, axe-core 4.14, WCAG 2.0–2.2 A/AA plus best
  practice): 77 routes × 3 presets × light/dark × 1440 / 375px. First run: 0 overflow, 0 console
  errors, 1 serious, 3 moderate. Fixed:
  - serious `label-content-name-mismatch`: AdvancedAppTable's page-size button showed "10 / page"
    but was named "Rows per page" (WCAG 2.5.3); the name now starts with the visible text.
  - moderate `region` on every route: the skip link sat after the sidebar / header. It is now
    the first element in DashboardLayout and MarketingLayout (MarketingLayout's `<main>` also
    takes `tabindex="-1"` and lost its `shadow-md`).
  - moderate `landmark-unique` (demo pages): AppToast takes a `label` prop (default
    "Notifications") and the toast showcase names its sandbox; demo navbars are named from their
    screen title; the filter-panel showcase has its own title.
- [x] Keyboard pass (scratchpad `keyboard.mjs`, 43 checks at 1440 and 375px), 43/43 after fixes:
  - The skip link was not the first Tab stop on desktop (80 sidebar links came first). Fixed above.
  - AppPopover: the trigger had no ARIA state and focus never reached the teleported panel.
    It now passes `triggerAttrs` (`aria-expanded`, `aria-controls`) to the trigger slot, moves
    focus into the panel on open, and Tab past the last item closes it and continues after the
    trigger (Shift+Tab and Escape return to the trigger). A click outside no longer pulls focus
    back to the trigger. AppTable (3), AppFilterPanel (2), AdvancedAppTable (2) and the docs demo
    bind it. Spec: docs `tests/appPopover.spec.ts` (7).
  - "On this page": a hash jump scrolled but left focus in the TOC, so the next Tab went on
    through the TOC. The router now focuses the target heading (`focusHashTarget`,
    `tabindex="-1"`, no ring); the next Tab lands in the section. Spec in `routerScroll.spec.ts`.
  - Passing already: palette (Ctrl+K, arrows, Enter, Escape, focus return), Preview / Code tabs
    (roving tabindex, arrows, Home), mobile menu (focus in, Escape, focus return), visible ring
    on the first 40 Tab stops at both widths.
- [x] Reduced motion: palette, modal, toast and popover open with no movement. AppSpinner and the
  docs page loader spun under `reduce` (bible §10: movement goes, fades stay); they now pulse
  (`motion-reduce:animate-pulse`).
- [x] `pnpm test` 755/755, `pnpm build` clean, template typecheck clean. AppToast synced to the
  template.
- [x] Rerun on the fixed build: 77 routes × 12 combinations, **0 serious or critical, 0 overflow,
  0 console errors**. One moderate left, accepted: `landmark-unique` on /docs/component/appnavbar
  and /appdock, because each page renders AppNavbarBasicDemo / AppDockBasicDemo in two examples
  (appnavbar.ts 125 and 165, appdock.ts 104 and 184), so the demo landmark name repeats. Fix if
  wanted: give the second example its own demo or a `title` prop.

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

## Phase 8: apply DESIGN-BIBLE.md (done 2026-11-10)

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
  The capsule's `max-width` contraction and `useDockFlight`'s spring were left for the owner;
  decided 2026-11-10 (see phase 9, "Still open").
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
- [x] P8 icons, done 2026-11-10 (stopped by the user 2026-11-09, committed unfinished, then finished). User
  decision: **Heroicons v2** (`icon-[heroicons--*]`: outline by default, `-solid` for active
  states). The bible had the sets backwards: `heroicons-outline` is the old v1 set (385 icons),
  `heroicons` is v2.2 (1288). Done: 303 swaps in 83 files across components, docs and template
  (scratchpad `convert.mjs`: v1 same-name, v1 renames such as `menu` → `bars-3`, `x` → `x-mark`,
  `upload` → `arrow-up-tray`; Solar, Phosphor and MDI mapped by meaning; every target checked to
  exist in v2). Kept as brand marks: `mdi--github`, `logos--vue`. No sidebar, keyboard, compass or
  accessibility glyph in v2: the sidebar toggle is `chevron-double-left/right`, keyboard
  `command-line`, compass and routing `map`, accessibility `window`. AppNotificationPreview's
  imitated app icons use `bell-solid` / `calendar-solid` (§13).
  Left:
  1. ~~Grep for icon names built from strings~~ Done 2026-11-10: none in components or
     composables (AppIcon only converts `set:name` to `set--name`). `scripts/update-apptable.js`
     moved from `heroicons-outline--` to `heroicons--`.
  2. ~~Fix DESIGN-BIBLE.md §9~~ Done: §9, the checklist line and appendix row name Heroicons v2
     and point at `icons.map.json`. Guard: docs `tests/designBible.spec.ts` "§9: one icon set"
     (registry and docs `icon-[…]` classes are `heroicons--*`, `mdi--github` / `logos--vue`
     excepted; proven by a planted `solar--home`). Stray mentions fixed: AppDock / AppNavbar doc
     comments, the AppIcon `name` prop row.
  3. ~~Chrome pass~~ Done: every `icon-[…]` class in source (83) has a rule in the built CSS, and
     installed Chrome rendered 75 routes × 3 presets × light/dark (10,032 icons): 0 blank, 0
     zero-size. Scratchpad `iconpass.mjs` / `iconcss.cjs`.
  4. ~~Sync the template~~ Done: decision (a), template `.oxfmtrc.json` ignores
     `src/components/ui/**` and `src/composables/**` (the CLI's folders); the 14 bundled files
     are copied verbatim from the registry (the drift was class order and wrapping only).
     Template typecheck passes. Its `format:check` still fails on 22 template-owned files on
     this Windows checkout (it failed on 38 before); not looked into.
  5. ~~**Docs `pnpm build` is broken**~~ Fixed 2026-11-10: AppForm is now generic over its
     values (`TValues`, inferred from `formModel`), `submit` emits `TValues`, and the text-like
     fields bind through a type-only `getTextValue`. `pnpm build` passes, `pnpm test` 747/747.
     History: (since docs `08fab27`, pushed): `AppFormValidationDemo.vue`
     declares `FIELDS` without the `FormFieldRow[]` type, so vue-tsc fails in AppForm's template
     (`unknown` not assignable). Fix: `import type { FormFieldRow } from '@/types/form.types'` and
     `const FIELDS: FormFieldRow[] = [...]`. `pnpm test` was 736/736 before the stop; template
     typecheck passed. The last docs Vercel deploy has likely failed.
     **2026-11-10: still broken.** `FIELDS: FormFieldRow[]` is in place, but vue-tsc now fails
     on three lines: AppForm.vue 53 and 63 (`getFieldValue` returns `unknown`, PhoneInput and
     DatePicker take `string`), and AppFormValidationDemo.vue 3 (`@submit` is typed
     `(values: unknown) => any`, so the demo's `(values: { email: string })` is rejected). The
     generic `TSchema` on AppForm does not reach `formModel` or `submit`. `pnpm test` 746/746.

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

## Phase 11: new components (planned 2026-11-11)

User asked 2026-11-11 after comparing with pastaui.com/docs/component. Every item lands with the
full checklist in the component port workflow (registry file, `registry.json` deps / requires,
README section, docs page in `src/content/docs/`, live demos, a spec) and passes the bible:
tokens only, one focus ring, Heroicons v2 with a row in `icons.map.json` for every new glyph, no
width or overshoot animation, reduced motion, 44px hit areas in Ink and Pine. Each gets an APG
pattern check with the keyboard script from WP5 and a crawl of its docs page in all 6
preset × theme combinations at both widths. Order is by dependency, then by size.

### 11.1 Form basics (done 2026-11-11)
- [x] **AppSwitch.** APG Switch: `<button role="switch" aria-checked>`, Space and Enter
  toggle, label clickable, `v-model: boolean`, `disabled`, `size`, optional `description`.
  Thumb moves on `transform`, not `left`. Works inside AppForm (`type: 'switch'` field) and
  AppFilterPanel. About 2 h.
- [x] **AppRadioGroup.** APG Radio Group: native `<input type="radio">` in a `<fieldset>` with
  a `<legend>`, so arrows and the single Tab stop come from the browser; `v-model`, `items`
  (`{ label, value, description?, disabled? }`), `orientation`, `error` (linked with
  `aria-describedby`). AppForm field `type: 'radio'`. About 2 h.
- [x] **AppSlider.** APG Slider: native `<input type="range">` styled, so keyboard and screen
  readers come free; `v-model: number` or `[number, number]` for a range (two inputs),
  `min` / `max` / `step`, value label, `aria-valuetext` formatter. The range needs its own
  thumb-crossing logic. About 4 h.

**Done 2026-11-11 (uncommitted).** Three components with registry entries, README sections, docs
pages and demos (Forms group), specs `appSwitch` 7, `appRadioGroup` 6, `appSlider` 7. Docs `pnpm test`
871/871, `vue-tsc -b` clean. Chrome: 3 presets × light / dark at 1440 and 375, axe clean on all
three pages (the disabled slider's value moved inside its `<label>`, since a disabled input's label
is exempt from contrast); a real mouse drags both range thumbs and they stop at each other; the ring
sits on the thumb; a click 10px above the switch track toggles it.
- AppForm takes `type: 'radio'` (`items`, `orientation`) and `type: 'slider'` (`min`, `max`, `step`).
  `src/types/form.types.ts` gained both types plus `step` and `orientation`, in docs and in the
  template (user OK 2026-11-11).
- [x] Decided 2026-11-11, user: **keep the rule.** DESIGN.md says never put a switch in a form with
  a Save button, and AppForm always has one, so AppForm has no `switch` field. AppFilterPanel's
  `boolean` fields stay checkboxes for the same reason (the panel has an Apply button).

### 11.2 Disclosure and navigation (done 2026-11-11)
- [x] **AppTabs.** Promote the docs' `PreviewCodeTabs` onto `useRovingFocus`: `role=tablist /
  tab / tabpanel`, arrows, Home / End, automatic or manual activation, `v-model` on the key,
  `items` or slots, the sliding pill from AppNavbar (`layoutId`, on the state tokens). Docs
  switch to it afterwards. About 3 h.
- [x] **AppAccordion.** APG Accordion: heading-wrapped `<button aria-expanded aria-controls>`,
  `multiple` or single, `v-model` on open keys. The panel opens without animating height (bible
  §10): `<details>`-style instant open with a content fade, or a `grid-template-rows` 0fr → 1fr
  step. Decide in the build; fade is the default. About 3 h.
- [x] **AppDropdownMenu.** APG Menu Button on top of AppPopover (it already moves focus in,
  closes on Tab and Escape): `role=menu / menuitem`, arrows, Home / End, type-ahead, `items`
  (`{ label, icon?, onSelect, danger?, disabled?, shortcut? }`), separators and groups,
  `menuitemcheckbox` / `menuitemradio`. Replaces the hand-built menus in AdvancedAppTable's
  column picker and the popover demo. About 4 h.

**Done 2026-11-11 (uncommitted).** Docs `pnpm test` 931/931, `vue-tsc -b` clean. Specs `appTabs` 9,
`appAccordion` 7, `appDropdownMenu` 9, `useRovingFocus` +2. Chrome: the four pages in 3 presets x light /
dark at 1440 and 375, axe clean (the dropdown also with the menu open); keyboard driven in Ink
light, Pine dark and Console light.
- AppTabs: `pill` (accent-subtle, as the bible's selected tab) and `line` variants, vertical,
  automatic or manual, `lazy`, `listClass` / `panelClass`. The Tab stop returns to the selected
  tab when focus leaves in manual mode. The docs' PreviewCodeTabs is now a wrapper on it, so every
  example's Preview / Code tabs moved from a `muted` fill to the accent-subtle pill.
- useRovingFocus gained `dir` (`'auto'` reads the container): ArrowLeft moves to the next item in
  RTL. Before, every roving widget had the arrows backwards in RTL.
- AppAccordion: fade is the decision (no grid-rows step). Headings 2-6, `card` or `plain`, region
  role up to six panels, Up / Down / Home / End between headers, nested accordions keep their own.
- AppDropdownMenu: groups with headings, separators, checkbox and radio items that keep it open,
  custom trigger through `attrs`. AdvancedAppTable's display menu (layout, density, columns) now is
  one, so it has the menu keys; its hand-built switch rows and their CSS are gone (columns are
  checkbox items). The AppPopover demo now shows a small share form instead of a menu, and its
  page points menus to AppDropdownMenu.
- [ ] Open: AdvancedAppTable's rows-per-page popover is still a hand-built list (buttons with no
  menu or listbox role). It is a single choice, so a Select or an AppDropdownMenu with radio items
  would fit; not changed here.

**In flight 2026-11-12 (7 parallel agents, uncommitted, low usage budget).** If the session ended
mid-run, files below may be half done: check each with its spec and `vue-tsc -b`, finish, then run
docs `pnpm test` in full. Brief given to agents: scratchpad `TEAM_BRIEF.md` (owner rules: one agent
per component; shared files `registry.json`, README, `icons.map.json`, `docsNav.ts`, tracker).
- AppDrawer, AppProgress · AppAvatar(+Group), AppLinkPreview · Select groups, AppFileTree,
  AdvancedAppTable rows-per-page menu · AppColorPicker (+ useThemeCustomizer demo) ·
  AppMediaPlayer · AppButton hold + spinner timing, Tooltip group, AppSegmentedControl ·
  OtpInput, TagInput (AppForm `otp`, `tags`), InputField password strength.
- User OK 2026-11-12: sync the template's `src/types/form.types.ts` with the new `otp` / `tags` types.

**Finished 2026-11-13, no agents:** the six review specs (OtpInput autofill/dir/describedby, TagInput IME/wrap/AppForm focus) were failing; fixed in the components. tsc clean, vitest 1254/1254, docs build ok, template `form.types.ts` synced. Not done: the Chrome 6-combination matrix.

**Resumed 2026-11-13.** The run was cut off about 22:33 on 2026-11-12, during the agents' browser
checks; their reports were lost. State found: every component, demo, doc page, spec, README
section, registry entry, nav entry and tracker row exists; docs `vue-tsc -b` clean; vitest
1241/1241 (72 files). Not done at the cut-off: the full Chrome matrix (most streams ran only Ink
light 1440 and Pine dark 375; button-segmented ran none), any code review, the template
`form.types.ts` sync, `pnpm build`. Seven agents relaunched on the same streams to review, verify
and fix (brief: scratchpad `RESUME_BRIEF.md`, ports 5211–5217). If this run is cut off too: rerun
vitest and `vue-tsc -b`, then check each stream's scratch folder for screenshots of all six
preset × theme combinations.
- vitest must run from an uppercase drive path (`F:\…`, PowerShell). From `f:\…` or Git Bash
  `/f/…` every spec fails with "Vitest failed to find the current suite".

### 11.3 Surfaces and display (done 2026-11-13)
- [x] **AppDrawer.** A side sheet on `useOverlay` (shared stack, scroll lock, focus trap and
  return, Escape), `side: start | end | top | bottom`, `size`, header / footer slots, `v-model`.
  Slides on `transform`; under reduced motion it fades. RTL flips `start` / `end`. About 3 h.
- [x] **AppAvatar** (+ `AppAvatarGroup`). Image with initials fallback (AdvancedAppTable's
  initials logic, its hue from the name), `size`, `shape`, optional status dot that carries a
  word for screen readers (bible §7: status is never colour alone). Group: overlap and "+3".
  About 2 h.
- [x] **AppProgress.** `role="progressbar"` with `aria-valuenow / min / max`, or indeterminate;
  bar fills on `transform: scaleX` (as AppPageLoader does), `tone`, `size`, optional label and
  value text. A circular variant on `stroke-dashoffset`. About 2 h.

### 11.4 From Pasta UI (done 2026-11-13)
- [x] **Select: groups and Category dropdown.** Extend Select instead of a new component: items
  take `group`, rendered as `role=group` with a labelled header inside the listbox; search
  keeps the headers of groups with matches; optional icon per item. About 3 h.
- [x] **AppColorPicker.** Saturation / value area, hue slider (AppSlider), hex and RGB inputs,
  swatches, optional eyedropper (`EyeDropper` where supported). Keyboard: the area is a 2-D
  slider (arrows, Shift for big steps) with `aria-valuetext` naming the colour. Adopted by the
  `useThemeCustomizer` demo for the accent. About 1 day.
- [x] **AppFileTree.** APG Tree View: `role=tree / treeitem / group`, `aria-expanded`, arrows
  (Right opens, Left closes or goes to parent), Home / End, type-ahead, one Tab stop
  (`useRovingFocus`), `items` as nested `{ id, label, icon?, children? }`, `v-model:selected`,
  optional lazy `load(node)`. Folder and file icons from Heroicons. About 5 h.
- [x] **AppLinkPreview.** A card from `{ url, title, description, image, siteName, favicon }`
  (the fetching is the app's job: no scraping in the component); compact and large layouts,
  the whole card one link with the title as its name, skeleton while loading. About 2 h.
- [x] **AppMediaPlayer** (audio and video). Native `<video>` / `<audio>` with our own controls:
  play / pause, scrubber (AppSlider), time, volume, mute, playback rate (AppDropdownMenu),
  fullscreen and picture-in-picture for video, captions track toggle. Every control is a named
  button; Space / K, J / L, M, F work while the player has focus. About 1 day.

### 11.5 AppToast: the Sileo morph (done 2026-11-11)
User 2026-11-11: "it looked so cool, can't we copy it?" Yes: Sileo (github.com/hiaaryan/sileo,
`packages/sileo`, React + motion 12) is MIT (its `package.json`; the repo has no LICENSE file),
so it is ported the way glisse was, credited in the file header and the README. Read from the
source:
- **The look.** A dark pill (badge icon + title) that grows into a card holding the description
  and a button. Two SVG `<rect>`s, pill and body, sit under one filter: `feGaussianBlur`
  (`stdDeviation` = roundness × 0.5) → `feColorMatrix` alpha `20 −10` → `feComposite atop`.
  That "goo" step fuses the two rects, so the pill seems to melt into the card instead of
  sliding over it. The rects animate their SVG `height` / `width`, which is not page layout.
- **Autopilot.** Opens itself after 150ms (2.5% of 6s) and folds back to the pill 2s before it
  leaves; hover opens it and holds it. A state change (loading → success) cross-fades the
  header between a `prev` and a `current` layer.
- **Motion.** One spring, `bounce: 0.25`, 600ms, for the pill and the body opening; closing has
  no bounce.
- **Accessibility, where it falls short.** The whole toast is a `<button>` containing an
  `<a href="#">` (invalid nesting, and the source says so); the SVG's title reads "sileo
  notification"; no Escape, no focus handling. The port keeps ours: the shared live regions
  through `useAnnouncer`, a `region` landmark with `label`, real sibling buttons for dismiss and
  action, pause on hover and focus.

**Done 2026-11-11 (uncommitted).** User picked (c), and "update the docs too to use the new toaster".
- [x] **AppToastMorph** (`components/ui/AppToastMorph.vue`), first a component of its own; the
  same day it became AppToast (see the follow-up below). Six positions, one region per position in use; the stack is absolute and moves on
  transforms; the goo is two `motion.rect`s under one filter in a fixed canvas; header swaps
  cross-fade through a blur; hover / focus / click hold a toast open and pause it; Escape and a
  short swipe dismiss; the pill is a disclosure button (`aria-expanded`, `aria-controls`), the
  closed body `inert`; announced once through `useAnnouncer`. Fill is `--color-text`, ink
  `--color-bg`, so every preset and theme inverts; radius from `--radius-2xl`.
- [x] Token `--vt-toast-bounce` in `styles/tokens.mjs` (Pine .25; Ink, Console, reduced 0);
  DESIGN.md and DESIGN-BIBLE §10 record the exception (and that SVG geometry inside a fixed
  canvas is not layout).
- [x] useToast: `description`, `icon`, `position`, `autopilot`, type `loading` (promise() uses
  it). AppToast handles the new fields (spinner for loading, description line). Template copies
  of useToast and AppToast synced; template typecheck clean.
- [x] Docs: the site's toaster is AppToastMorph (App.vue); new page `apptoastmorph.ts` with the
  `ToastMorphShowcase` playground (6 positions, autopilot toggle, promise, action, pill-only);
  useToast and AppToast pages point at it; nav Feedback group. README section and tracker row.
  `icons.map.json` gains `bell` (named in useToast's doc comment).
- [x] Spec `tests/appToastMorph.spec.ts` (9): pill / body split, plain pill is no button,
  autopilot open and fold, `autopilot: false`, action then close, Dismiss, Escape, no nested
  controls, loading → outcome, a region per position. Docs `pnpm test` 814/814, build clean.
- [x] Chrome (installed): Pine, Ink and Console in light and dark at top-right and
  bottom-center; axe with toasts open: no serious, critical or nested-interactive; the pill
  takes focus and opens, Tab reaches its buttons, Escape closes; reduced motion opens with no
  movement. 0 page errors.

**Follow-up 2026-11-11: one toaster.** User: the morph is smooth enough to serve formal apps too.
- [x] The morph is now **AppToast**; the old card left the registry (installed copies stay
  theirs). The template ships it (motion-v was already required).
- [x] Formal mode: `tone: 'surface'` (raised surface, `border-strong` edge drawn as a second goo
  layer 1px outside the fill, the card's `*-text` / `*-subtle` status colours), `expand: 'auto' |
  'hover' | 'always'` (`always` is a card from the start and drops the disclosure button),
  `progress` (hairline countdown, frozen while held).
- [x] Docs: one AppToast page; the playground has Tone, Expand, Countdown and Expressive / Formal
  presets. Spec `appToast.spec.ts` 13. Docs `pnpm test` 807/807, build clean, template
  typecheck clean. Chrome: formal in Ink light and Pine dark, expressive in Pine; axe on the
  toaster clean; 0 page errors.
- [x] Decided 2026-11-11, **no** elevation token: the surface tone has no shadow (a hand-written `drop-shadow` would break §5, and
  `--shadow-lg` is a box-shadow), so on busy pages it sits flat. Option: an elevation token in
  `filter: drop-shadow()` form. User said no; the surface tone stays flat, with its edge.
- [x] Bug (user report, screenshot): switching the position of a toast that is showing left it a
  40px pill with a short body and its text spilling out. The move mounts a new copy in the other
  region; the old copy reported 0x0 to the ResizeObserver as it left and overwrote the size, and
  the new copy was never observed (measurement searched the DOM only when the queue changed).
  Fix: every pill and body is tracked through its own ref as it mounts, and a detached element's
  report is dropped. Chrome repro (scratchpad `switch.mjs`): old code 93 → 40px after the switch,
  fixed code 93px at all five positions.
- [x] Agent survey done (Phase 12). Fixed from it: AppToast's preset MutationObserver was never
  disconnected; the pill's focus ring was `rounded-full` around an `rx` shape (now the same radius).

### 11.6 From interior.dev (done 2026-11-13)
interior.dev (React + Motion, MIT, 54 "micro-interactions", copy-in like our registry: "the
behaviour is finished; the style is yours"). Its Accordion, Drawer, Dropdown, Tabs, Tree View,
Progress Bar and Popover overlap 11.1–11.4: read their source for behaviour before building ours.
Not yet in our plan and worth taking:
- [x] **Hold to Confirm** on AppButton (`hold` prop): a destructive action fires only after a
  held press, with the fill showing progress; keyboard holds Space / Enter; reduced motion
  shows a count instead. Fits DeleteModal and ConfirmDangerModal. About 3 h.
- [x] **AppSegmentedControl**: a radio group drawn as one pill track with the sliding
  indicator (AppNavbar's pill, the PresetSwitcher look). Native radios underneath. About 2 h.
- [x] **OTP input** and **Tag input** as Fields (AppForm types `otp`, `tags`). About 3 h each.
- [x] **Password strength** on InputField (`strength` meter, the rules listed as text, not colour
  alone). About 2 h.
- [x] **AppButton loading timing** ("the spinner outliving the request"): show the spinner only
  after 150ms, keep it at least 400ms once shown, so a fast request never flashes. About 1 h.
- [x] **Tooltip group**: once one AppTooltip is open, neighbours open instantly instead of
  waiting for the delay. About 1 h.
- Later, if wanted: Context Menu, Wizard / Task Steps, Skeleton Swap, Value Flash, Reorder List,
  Streaming Text, Typing Indicator.

### 11.7 The morph elsewhere
Moved to **Phase 12: blobify** (below), which plans the shared primitive and every place it goes.

### Not in this phase
- The AI kit (Pasta's Conversation, Tools, Agent and Runs groups, about 50 components).
- Promoting CommandPalette, CodeBlock, Breadcrumbs and Pager from the docs to the registry.
  Tabs is the one promotion included, as 11.2.

## Phase 12: blobify (the morph as a shared primitive, planned 2026-11-11)

User 2026-11-11: "write the whole primitive morph plan … let's blobify the stuff we can", and
"add a step to upload docs and templates after if needed". The agent survey (2026-11-11) is the
source for where it fits and where it does not; its findings are folded in here. "Blob" is the
user's word, so the primitives are named for it.

### What the blob is, and the limits that come with it
Two or more SVG shapes of one colour under one filter: `feGaussianBlur` (σ = radius × 0.5) →
`feColorMatrix` alpha row `0 0 0 20 −10` → `feComposite atop` with the source. Where shapes come
within about 2σ of each other they fuse into one outline with a smooth inner corner. The shapes
animate their SVG geometry inside a canvas of fixed size; text and controls are HTML laid over
it. Limits, from the filter itself:
- **Fills must be opaque.** The alpha curve zeroes anything under about 0.5, so a translucent
  fill (AppNavbar's 14% pill, FilterPanel's `bg-accent/10` chips) disappears. Draw it opaque
  and put `opacity` on the `<svg>`.
- **One colour per blob.** Two fills that meet bridge into a blur of both (mud). Different colours
  need separate canvases.
- **An edge is a second pass** (AppToast's surface tone draws the shape twice, the fill 1px inside).
- **σ follows the radius.** Ink's `--radius-md` is 3px, so σ 1.5 shows nothing. Blobs use
  `--radius-2xl` (Ink 8, Pine 18, Console 10) or a floor of σ 4.
- **Never filter text.** The canvas has no slot, so this cannot happen by accident.
- **Cost.** Each canvas is one or two filter passes over its area per frame while it moves. Budget:
  at most about 10 live canvases on a page, none bigger than about 400 × 300px, nothing in a list
  that repeats per row or per option.

**Status 2026-11-13 (no agents).** 12.0 to 12.2 done: tokens `--vt-morph-bounce` /
`--vt-morph-duration` (toast-bounce kept as alias), bible §10 and DESIGN.md updated, AppBlob,
AppSwap, useBlob, useIndicator with registry entries, README sections, doc pages and
`tests/appBlob.spec.ts`; AppToast draws through AppBlob and AppSwap (its filter, observer and
`SPRING_S` gone; appToast.spec unchanged and green). The design-bible guard from 12.4 landed early
(goo only in AppBlob.vue). Template now bundles AppBlob, AppSwap and useBlob (12.5 template step
for this change). Chrome: blob and toast pages clean in all 3 presets × 2 themes at 1440, no
console errors. Next: 12.3 item 1 (AppSwap in place).

### 12.0 Rules and tokens first (done 2026-11-13)
- [x] DESIGN-BIBLE §10: the exception moves from "AppToast's morph" to "geometry drawn by the
  blob primitive (`AppBlob`), inside its fixed canvas". The blur cross-fade (`filter: blur` on a
  leaving and an entering copy, `AppSwap`) gets its own allowed line. Overshoot stays allowed only
  through `--vt-morph-bounce`.
- [x] Tokens (`styles/tokens.mjs`, then `node scripts/tokens.mjs build`):
  - `--vt-morph-bounce`: Pine .25; Ink, Console and reduced motion 0. `--vt-toast-bounce` stays as
    an alias for one release, then goes.
  - `--vt-morph-duration`: Ink 500ms, Pine 600ms, Console 320ms, reduced 0ms. AppToast's
    hard-coded 600ms (`SPRING_S`) reads it; the survey found it 5 × Console's state duration.
  - No elevation token in `drop-shadow()` form (user, 2026-11-11). Blobs that float (surface
    toast, bulk bar, tooltip) stay flat, with an edge.
- [x] DESIGN.md: the two tokens, the limits above, and the budget.

### 12.1 The primitives (done 2026-11-13)
- [x] **`composables/useBlob.ts`.** `useBlob({ radius = '--radius-2xl', cap?, minBlur = 4 })`
  returns `roundness`, `blur` (radius × 0.5, at least `minBlur`), `spring(opening)` (motion-v
  spring on `--vt-morph-duration` and `--vt-morph-bounce`, bounce only when opening; `{duration: 0}`
  under reduced motion), `quick()` (a `--vt-duration` tween for hover-driven moves), `reduced`.
  One module-level MutationObserver on `<html>` (preset, theme, style) with a subscriber count,
  disconnected at zero, so a page with ten blobs has one observer.
- [x] **`components/ui/AppBlob.vue`.** The canvas. Props: `width`, `height` (fixed);
  `shapes: { key, x?, y?, width, height, radius?, opacity? }[]`; `fill` (CSS colour or var);
  `edge?: string` (draws the shapes twice, the fill 1px inside); `blur?`, `radius?` (default
  `useBlob`); `transition?` (default `spring`); `flipX?` (RTL), `flipY?` (growing upward);
  `pad?` (filter margin, default 2 × blur). Renders an `aria-hidden`, `pointer-events-none`,
  `overflow-visible` `<svg>` with one `useId` filter and a `motion.rect` per shape
  (`:initial="false"`). No slot. Exposes `filterId`.
- [x] **`components/ui/AppSwap.vue`.** The blur cross-fade as a wrapper: `<AppSwap :swap-key
  tag="span">`. The leaving copy is `position: absolute` and `aria-hidden`, so a button is never
  named "Save Saving…" for 130ms. Reduced motion: fade only.
- [x] **`composables/useIndicator.ts`.** `useIndicator(container, activeKey, { axis })` measures
  the item boxes (ResizeObserver, RTL-aware, ref-tracked like AppToast's fix) and returns the
  canvas size and two shapes, head and tail, for AppBlob. The head moves first and the tail
  follows, so the blob stretches between the old item and the new one and then contracts.
- [x] Registry entries (`registry.json` components / composables / dependencies,
  `requires.packages: motion-v`), README sections, docs pages with live demos
  (`appblob.ts`, `appswap.ts`, `useblob.ts`, `useindicator.ts`), specs (shapes render,
  edge layer, flips, reduced-motion transition, observer count, swap `aria-hidden`, indicator
  measures and follows RTL).

### 12.2 AppToast onto the primitive (done 2026-11-13)
- [x] AppToast draws through `AppBlob` and `useBlob`; its own filter, MutationObserver and
  `SPRING_S` go. No behaviour change: `tests/appToast.spec.ts` unchanged and green, and the
  Chrome playground screenshots (3 presets × light / dark, top and bottom, inverse and surface)
  match the ones taken 2026-11-11.

### 12.3 Blobify, ranked by impact for effort
Each item: the blob in place of what it replaces, keyboard and ARIA untouched, reduced motion
falls back to a fade or a jump, checked in all 6 preset × theme combinations at 1440 and 375px.
1. [ ] **AppSwap in place** (S, 1–2 h): AppButton loading → label, with an optional `success`
   state that swaps to a check for 1.2s (`AppButton.vue:27-31`); ThemeToggle sun ↔ moon
   (`ThemeToggle.vue:9,28-35`); counts in AppFilterPanel (`:13-16`), AppDock's badge (`:583-587`),
   AdvancedAppTable's selection count (`:357`), with `tabular-nums`. Folds in 11.6's spinner
   timing (show after 150ms, keep at least 400ms).
2. [ ] **Blob segmented indicator** (S, 2 h): the docs PresetSwitcher first (it sits in the header
   and switches presets, so Pine's bounce shows itself), then TimePickerClock AM / PM
   (`:74-89`), then AppSegmentedControl when 11.6 builds it. The old pill shrinks while the new
   one grows and the blob bridges the gap. Radios and roving focus stay as they are. The active
   pill's `shadow-sm` becomes the edge layer.
3. [ ] **Tabs** (S, +1 h on 2): PreviewCodeTabs (`PreviewCodeTabs.vue:15-16`, every docs
   component page), then AppTabs when 11.2 builds it.
4. [ ] **AppNavbar pill** (M, 3 h): `useIndicator` over the links in place of the `layoutId`
   pill (`AppNavbar.vue:331-337`, transition `:259`). Dark tone: opaque fill with canvas
   opacity (`:476`). Spring and bounce only on click and route change; hover moves on `quick()`
   so the blob never trails the pointer. The active link keeps a non-colour cue (§12).
5. [ ] **AdvancedAppTable bulk bar** (M, 4–6 h): the "3 selected" pill melts sideways into the
   action strip (`AdvancedAppTable.vue:350-373, 1825-1866`). The bar's box sits at its measured
   full width; actions fade and move by transform; the count swaps through AppSwap. Drops the
   glass (`:1835-1838`) for `surface-raised` with an edge, which is closer to §5.
6. [ ] **AppTooltip bubble** (M, 3–4 h): the rotated-square arrow (`AppTooltip.vue:28, 88-93`)
   becomes a nub fused to the bubble. Dark tooltip on the inverse fill (it already is `bg-text`),
   light one with the edge layer. Enter tween, not the spring (tooltips must be quick). The canvas
   lives inside the existing `v-if`, so one filter exists at a time. Four placements and RTL.
   `role="tooltip"` and `aria-describedby` unchanged.
7. [ ] **AppSwitch thumb** (S, +1 h, with 11.1): leading and trailing edges on separate springs,
   so the thumb stretches and settles. No filter (thumb and track differ in colour). `role="switch"`.
8. [ ] **AppNotificationPreview "island" mode** (M, 3–4 h, showcase): a Dynamic-Island pill that
   grows into the notification, the platform's own look inside the mockup (§13). Already
   `aria-hidden` inside `role="img"`.
9. [ ] **Wizard / task steps** (M, 4 h, when that component exists): the done connector flows
   into the next dot; at most 10 shapes in one canvas; progress announced as text.

10. [x] **AppAvatarGroup reveal** (user, 2026-11-13; done): hovering a face closes a ring of
   ink around it and drips a name pill out of it, one AppBlob per group; the pill slides along the
   row on `quick()`, the name swaps through AppSwap, +N names who it hides. The group is one tab
   stop with arrow keys. `reveal: 'tooltip' | 'none'` opt out; AppAvatar gains `tooltip`.
   Also fixed on the way (user: "tooltips is so bad"): AppTooltip on <body>, sized to its text,
   flips and clamps, aria-describedby on the control, Escape, hoverable, one at a time.

### Not blobbed, and why
- Popover, Select, AppDropdownMenu, CommandPalette, AppModal growing from their trigger: the
  trigger is the consumer's markup and cannot be in the canvas; content would wait on the shape;
  the palette and modal would filter a region near viewport size every frame. Their `scale-95`
  from the trigger's origin already reads as growing out of it.
- Anything that repeats: table rows, DatePicker's 42 cells, option and palette lists, filter
  chips (translucent as well).
- AppDock tiles and badge (two colours that would bridge into mud; it already has lift and
  flight), and every glass surface (`backdrop-filter` cannot pass through the blob).
- AppAccordion and AppDrawer: in-flow content would snap while the shape grows; the sheet
  already moves on transform.
- ColorPicker swatches and any colour-critical UI: fused swatches blend their hues.

### 12.4 QA (about 2 h)
- [ ] Rerun the WP5 crawl (scratchpad `crawl.mjs`: axe, 375px overflow, console errors, all
  routes × 3 presets × light / dark × 2 widths) and the keyboard script (`keyboard.mjs`).
- [ ] Reduced motion on every blob: no geometry or transform animation, fades kept.
- [ ] Performance: count live canvases per page (budget 10), and record a Chrome performance
  trace while the navbar pill, tabs and a toast stack move at once; no frame over 16ms on the
  docs home and the AdvancedAppTable page.
- [ ] Guard in `tests/designBible.spec.ts`: an SVG `feColorMatrix` goo filter appears only inside
  `AppBlob.vue` (and AppToast until 12.2 lands), so blobs cannot be hand-rolled elsewhere.

### 12.5 Ship: sync the template, upload, check the docs deploy
After each step that changes a registry file the template ships, and once at the end:
- [ ] **Template**: copy the changed bundled files verbatim from the registry (today: AppToast,
  ThemeToggle, AppIcon, the composables; plus AppBlob, AppSwap and useBlob if AppToast or
  ThemeToggle now need them, which means adding them to the template's bundled list and its
  README "ships by default" line), copy `styles/tokens.css`, run `pnpm typecheck`. Skip when no
  bundled file changed.
- [ ] **Commit and push** components `main`, docs `master`, template `main` (with the user's OK).
- [ ] **Docs deploy**: the push to docs `master` deploys vuetail-docs on Vercel. Check the
  deployment reached READY (Vercel MCP `list_deployments` / `get_deployment`, or the dashboard)
  and open the AppBlob page and the toast playground on vuetail-docs.vercel.app. If the build
  failed, read its build log, fix and push again.
- [ ] **CLI check**: in a scratch copy of the template with fetch pointed at GitHub, `pnpm
  add-component AppBlob` installs it with its dependencies, and `icons <set>` still rewrites
  every glyph (`icons.map.json` gains a row for any new glyph).

### Also found by the survey
- [ ] docs `DashboardLayout.vue:13` animates `transition-[width]` on the sidebar (§10): collapse
  with a transform or snap the width.

## Phase 10: icon set choice (done 2026-11-10)

User asked 2026-11-10. Heroicons v2 stays the registry's only set (DESIGN-BIBLE §9: one set per
project); a project can switch the whole install to Lucide or Phosphor. The rule holds because
the switch is all-or-nothing.

- [x] `icons.map.json` (registry root): `sets.<name>.icons` maps each Heroicons v2 name to the
  set's glyph, `solidSuffix` gives the active form (`ph`: `-fill`; `lucide`: none, so `-solid`
  falls back to outline). 39 names: the 38 the registry uses plus `ellipsis-horizontal`. Every
  target checked against `@iconify/json`, solid forms included.
- [x] CLI (`vuetail-template/scripts/add.js`): `pnpm add-component icons` lists the sets (✓ marks
  the project's); `icons <set>` reinstalls every recorded file plus the unrecorded registry files
  on disk (the template's bundled ones) in that set and saves `icons` in `vuetail.json`. Every
  later `add-component` / `add-composable` rewrites to the saved set. `rewriteIcons` runs before
  hashing, so `verify` and overwrite protection compare the rewritten file; an untouched
  Heroicons original also counts as untouched. Names missing from the map stay Heroicons and are
  printed. A `--icons` flag on `add-component` was dropped: the template always ships registry
  files, so a per-install flag would mix sets.
- [x] Tests: docs `tests/cliIcons.spec.ts` (10): every glyph the registry uses is mapped in each
  set, every target exists in Iconify, rewrite of outline / solid / brand marks / unknown names.
- [x] Docs: Getting started ("Add components") and the template README name the command.
- [x] End-to-end in a scratch copy of the template with fetch pointed at this checkout:
  `icons lucide` switched 3 files and skipped 11; `AppModal` then installed with `lucide--x`;
  `verify` passed.
- [x] **Template formatter: (a), done 2026-11-10** (see P8 step 4). After the sync, the scratch
  run switched all 14 bundled files to `ph`, AppTable installed in `ph`, `verify` passed, and
  `icons heroicons` restored files identical to the registry. Original note: The 11 skipped files are the template's
  bundled copies. `oxfmt` in the template wraps at a shorter width and sorts Tailwind classes,
  so they never match the registry byte for byte and the CLI treats them as locally edited (it
  prompts, or skips without a TTY). This already affects plain updates, not only icons. Options:
  (a) template `.oxfmtrc.json` ignores the registry-managed files and they are copied verbatim
  (small; P8 step 4 becomes a plain copy), or (b) the registry adopts the template's `oxfmt`
  config (reformats about 70 files). Recommended: (a).
- [ ] (Default: accept.) Template-owned pages (404, offline, error pages) use `lock-closed`, `map`, `wifi`,
  `shield-exclamation`. The CLI does not manage them, so they stay Heroicons after a switch.
  Either map them and let `icons <set>` rewrite a fixed list of template files, or accept it.
- [ ] Docs preview in each set (preset-switcher style toggle on demos): not started, about 2–3 h.
- [x] `pnpm test` (747/747) and docs `pnpm build` pass.
- [ ] Commit and push the three repos with the user's OK.

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
- ~~Still open (user decision): useDockFlight's 420ms overshooting spring and AppNavbar's
  `max-width` contraction.~~ **Decided 2026-11-10 (user: "do the 2 open"), by bible §10:**
  - useDockFlight: no spring. The flight runs on `--vt-duration-enter` and `--vt-ease`, read
    live (`flightDuration()` replaces `FLIGHT_MS`); registry dep `useMotionTokens` added.
  - AppNavbar: nothing animates a width. `compactWidth` defaults to `width`, so the capsule keeps
    its measure and only its colour fades; a set `compactWidth` snaps. A folding label fades out
    first, then its box closes in one step (`max-width 0s` after `--vt-duration`); opening, the
    box opens and the label fades in. Sampled in Chrome on the showcase: label opacity 9 steps,
    width 53 → 0 in one step, background 12 steps, capsule width constant.
  - Guard: docs `designBible.spec.ts` "§10: no layout animation, no overshoot".

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

**9.4 status (2026-11-08): useOverlay and useRovingFocus done, uncommitted; useForm and
useAnnouncer next.**
- useOverlay (`useOverlay.spec.ts`, 7): one app-wide stack; the top overlay traps Tab, pulls stray
  focus back and hears Escape (unless something inside handled it); scroll is locked once and the
  previous `overflow` restored when the last closes; focus returns to the opener. Adopted by AppModal
  (its Escape moved here; Enter stays on useKeyboard), AppImageModal and the docs mobile sheet.
  Not adopted on purpose: the docs ⌘K palette is a native `<dialog>` with `showModal()`, which already
  traps focus and handles Escape. Checked in Chrome: nested panels close one at a time, focus
  returns, scroll stays locked until the last one closes.
- useRovingFocus (`useRovingFocus.spec.ts`, 8): arrows by orientation, Home/End, wrap, type-ahead,
  disabled items, sync clamp; roving-tabindex mode (`container`) or active-descendant mode.
  Adopted by Select, the docs PreviewCodeTabs, PresetSwitcher and CommandPalette.
- Found on the way: **Select's list had no tabindex, so `listRef.focus()` did nothing and the arrow
  keys never reached a non-searchable Select** (old and new code behaved the same in Chrome). The
  list is `tabindex="-1"`; with `searchable`, the search box is a `role="combobox"` with
  `aria-activedescendant`. Guarded by `select.spec.ts` (2).
- `demoScroll.spec.ts` accepts `aria-labelledby` as well as `aria-label` for a scroll box's name.
- Docs: "Overlays and focus" section in docsNav with both pages and demos.
- useAnnouncer (`useAnnouncer.spec.ts`, 4): two hidden live regions made on first use, bursts
  collapse to the last message, repeats are read again. AppToast announces through it (errors
  assertive, a changed toast re-read) and its stack is a labelled `region`, no longer
  `aria-live="polite"` around `role="alert"` toasts that were read twice. InputField, Textarea and
  PhoneInput errors drop `aria-live="polite"` next to `role="alert"`. The template ships
  useAnnouncer now (its bundled AppToast needs it). Checked in Chrome.
- useForm → **FormModel extended instead (user decision)**, no third forms API. Errors by path
  with a top-level alias, `touched` / `touch()`, `submitted`, `errorFor()`, `validateField()`,
  `clearResolved()`, `setErrors()` (server, arrays take the first message), `firstErrorPath`.
  `formModel.spec.ts` (6). AppForm: focuses the first invalid field after a failed submit
  (`data-field` on each wrapper, both modes) and clears fixed errors as you type with a FormModel.
  `appForm.spec.ts` (2). Template `src/lib/FormModel.ts` changed (same API plus the new members);
  docs keeps a copy.
- **Phase 9 is done.**

### 9.5 Checks

`pnpm test` and `pnpm build` in docs; a keyboard pass through every overlay and list after 9.4;
the motion check (`tests/designBible.spec.ts`) stays green.


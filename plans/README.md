# VueTail redesign plan

The default look is **Ink**; **Pine** and **Console** are presets (`<html data-vt-preset="…">`).
The contract is [DESIGN.md](../DESIGN.md); token values live in `styles/tokens.mjs`.
Work happens on the `redesign` branch of vuetail-components and vuetail-docs, and, from phase 4, vuetail-template;
it reaches the live site (vuetail-docs.vercel.app) only when they merge.

| Phase | Work | Status |
|---|---|---|
| 0 | DESIGN.md contract | Done |
| 1 | `styles/tokens.css` generated from `styles/tokens.mjs`, `scripts/tokens.mjs` checker | Done |
| 2 | Docs load the tokens; Ink shell, home page, preset switcher; `useAppUi` presets | Done |
| 3 | Every component on the token vocabulary (0 old names) | Done |
| 3b | Motion on the tokens: ease-out exits, token durations, reduced motion, no `transition-all` | Done |
| 4 | vuetail-template adopts the tokens, the new `theme.ts` and the CLI `styles` entry | Done |
| 5 | Docs colour customizer rebuilt around the five settings (`useColorCustomizer`, `utils/theme.ts`) | **Next** |
| 6 | Merge `redesign` into components `main`, then docs `master` and template `main` | Todo |

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

Until phase 5, `useColorCustomizer` does not build against the new template (it imports the
palette types), and the template README no longer documents it. Phase 5 brings both back.

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

- [ ] AppTable column switch: the knob is `bg-white`; it needs a token that reads on both the
  `bg-accent` (on) and `bg-border` (off) track in all six combinations.
- [ ] `vuetail-docs/audit-plan.md` is the pre-Ink docs plan, superseded by this one: delete it.
- [ ] AppText: phase 3's rename turned the `color` value `'text-secondary'` into `'text-text-muted'`.
  That is a prop value, not a class: pick the public name (`'text-muted'`?) and keep the old one
  working. The template's `types/text.types.ts` (imported by nothing) still lists the old names.
- [ ] Template `pnpm check`: 13 files untouched by the redesign already fail `oxfmt --check` on `main`.

Usage check as of phase 3b: 0 old names, 15 raw palette, 46 raw hex, all intentional except the
AppTable knob.

## Checks

```bash
node scripts/tokens.mjs check            # tokens, contrast in all six preset × theme combinations
node scripts/tokens.mjs check --usage    # leftover old names, raw palette, hex in components
cd ../vuetail-docs && pnpm build && pnpm test
```

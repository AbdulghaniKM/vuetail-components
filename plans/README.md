# VueTail redesign plan

The default look is **Ink**; **Pine** and **Console** are presets (`<html data-vt-preset="…">`).
The contract is [DESIGN.md](../DESIGN.md); token values live in `styles/tokens.mjs`.
Work happens on the `redesign` branch of vuetail-components and vuetail-docs, and reaches the live
site (vuetail-docs.vercel.app) only when both merge.

| Phase | Work | Status |
|---|---|---|
| 0 | DESIGN.md contract | Done |
| 1 | `styles/tokens.css` generated from `styles/tokens.mjs`, `scripts/tokens.mjs` checker | Done |
| 2 | Docs load the tokens; Ink shell, home page, preset switcher; `useAppUi` presets | Done |
| 3 | Every component on the token vocabulary (0 old names) | Done |
| 3b | Motion on the tokens: ease-out exits, token durations, reduced motion, no `transition-all` | Done |
| 4 | vuetail-template adopts `tokens.css`, the new `theme.ts` and the CLI `styles` entry | **Next — plan it before editing the template** |
| 5 | Docs colour customizer rebuilt around the five settings (`useColorCustomizer`, `utils/theme.ts`) | Todo |
| 6 | Merge `redesign` → `main` (components) and `master` (docs) together | Todo |

## Phase 4 must cover

- `useAppUi` now imports `Preset`, `theme.preset` and `presetFonts` from the host `theme.ts`; the
  template's `theme.ts` still exports the old brand/shape API, so components and template have to
  ship together.
- Template `style.css`: import `tokens.css`, drop its own palette, stop config-driven fonts writing
  inline variables on `<html>` (docs fix: `src/config/index.ts`).
- Fontsource packages: Ink ships `@fontsource-variable/schibsted-grotesk` and
  `@fontsource-variable/spline-sans-mono`; Pine and Console load on demand.
- `index.html` boot script: apply a stored `app-preset` before first paint.
- CLI (`scripts/add.js`): install `styles/tokens` from `registry.json` `"styles"`.

## Known decisions

- Plain white is not used anywhere in Ink light.
- Control edges (`border-strong`) are 3:1 in every preset (WCAG 1.4.11), enforced by the checker.
- motion-v keeps `y`/`scale` shorthands: in motion-v 1.6.1, full `transform` strings flash the
  initial state for one frame when an animation ends. Revisit on upgrade.
- `useMotionTokens` parses `.2s` and `200ms`: production CSS minifies `200ms` to `.2s`.
- Intentional raw colours: AdvancedAppTable's categorical palette, liquid-glass material constants,
  RibbonField canvas fallbacks, the dark chrome of AppDock and AppNavbar.

## Checks

```bash
node scripts/tokens.mjs check            # tokens, contrast in all six preset × theme combinations
node scripts/tokens.mjs check --usage    # leftover old names, raw palette, hex in components
cd ../vuetail-docs && pnpm build && pnpm test
```

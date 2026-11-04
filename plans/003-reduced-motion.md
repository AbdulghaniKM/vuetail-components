# 003 — Respect prefers-reduced-motion everywhere

- **Status**: DONE
- **Commit**: a4de2de
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: tokens generator + 11 components

## Problem

Only `AppNavbar`, `AppDock`, `RibbonField`, `AppSkeleton`, `AppLiquidGlass` and `AdvancedAppTable`
handle reduced motion. Everything else scales and slides regardless:

```html
<!-- components/ui/AppPopover.vue:8-13 — current -->
enter-from-class="scale-95 opacity-0"
leave-to-class="scale-95 opacity-0"
```

```html
<!-- components/ui/AppModal.vue:36-38 — current -->
:initial="{ opacity: 0, scale: 0.96, y: 12 }"
```

Same in `AppTooltip.vue:13,17`, `Fields/Select.vue:38,42`, `Fields/PhoneInput.vue:57,61`,
`Fields/DatePicker.vue:43,47`, `AppFilterPanel.vue:77,80`, `AppTable.vue` transitions,
`AppToast.vue:93-97`, `AppButton.vue:15` (press translate/scale).

## Target

Reduced motion keeps opacity fades (they aid comprehension) and drops movement.

1. `scripts/tokens.mjs` `buildCss()` appends:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --vt-press-y: 0px;
    --vt-press-scale: 1;
  }
}
```

2. Every `<Transition>` `*-from-class` / `*-to-class` that contains `scale-95` (or a translate)
   gains `motion-reduce:scale-100` (or `motion-reduce:translate-y-0`) next to it, for example:
   `enter-from-class="scale-95 opacity-0 motion-reduce:scale-100"`.
3. motion-v components (`AppModal.vue`, `AppToast.vue`) import `useReducedMotion` from
   `@/composables/useReducedMotion` and use `transform: 'none'` in `initial`/`exit` when it is true:

```ts
const reduced = useReducedMotion();
const panelFrom = computed(() =>
  reduced.value ? { opacity: 0 } : { opacity: 0, transform: 'translateY(12px) scale(0.96)' },
);
```

## Repo conventions to follow

- `composables/useReducedMotion.ts` already exists. Exemplar usage: `components/ui/AppNavbar.vue:101,165,247-253`.
- Tokens are generated: edit `scripts/tokens.mjs`, run `node scripts/tokens.mjs build`.

## Steps

1. Add the media block to `buildCss()` after the `:root` block and rebuild tokens.
2. Add the `motion-reduce:` counterpart in each listed `<Transition>` class.
3. Branch `AppModal` and `AppToast` motion states on `useReducedMotion()`; add `useReducedMotion`
   to their `dependencies` in `registry.json`.

## Boundaries

- Do NOT remove opacity transitions under reduced motion.
- Do NOT touch components that already handle it (listed in Problem).

## Verification

- **Mechanical**: `node scripts/tokens.mjs check` OK; docs build passes.
- **Feel check**: DevTools → Rendering → emulate `prefers-reduced-motion: reduce`. Open a modal,
  a toast, Select, a tooltip, press a button: everything fades, nothing moves or scales.
- **Done when**: no component moves under reduced motion, and all still give visible feedback.

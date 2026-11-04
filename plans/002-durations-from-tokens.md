# 002 — Transition durations come from the motion tokens

- **Status**: DONE
- **Commit**: a4de2de
- **Severity**: HIGH
- **Category**: Cohesion & tokens
- **Estimated scope**: 14 files plus one new composable

## Problem

`tokens.css` defines `--vt-duration` (state changes), `--vt-duration-enter` and
`--vt-duration-exit` per preset (Ink 160/200/130ms, Pine 160/220/140ms, Console 110/140/90ms),
but no transition reads them. Console's faster motion therefore never happens, and there is no
single place to tune or reduce motion.

```html
<!-- components/ui/AppTooltip.vue:12-15 — current (pattern repeats in every <Transition>) -->
enter-active-class="transition duration-150 ease-out"
leave-active-class="transition duration-100 ease-exit"
```

```html
<!-- components/ui/AppModal.vue:12 and :39 — current (motion-v) -->
:transition="{ duration: 0.2 }"
:transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }"
```

`<Transition>` locations: `AppTooltip.vue:12,15`, `AppPopover.vue:8,11`, `Fields/Select.vue:37,40`,
`Fields/PhoneInput.vue:56,59`, `Fields/DatePicker.vue:42,45`, `AppFilterPanel.vue:76,79`,
`AppDock.vue:615,617`, `AppTable.vue:70,73,524,527,565,568,579,582`, `AdvancedAppTable.vue:352`,
`AppModal.vue:43,45`, `AppImageModal.vue:4,7,61,64`.
motion-v locations: `AppModal.vue:12,39`, `AppToast.vue:20`.

## Target

- Every `enter-active-class`: `duration-(--vt-duration-enter) ease-standard` (keep its `transition`
  or `transition-*` property part).
- Every `leave-active-class`: `duration-(--vt-duration-exit) ease-exit`.
- `AppImageModal.vue` photo crossfades (`:4,7`) keep a longer fade: `duration-[calc(var(--vt-duration-enter)*1.5)]`.
- motion-v reads the same tokens through a new composable:

```ts
// composables/useMotionTokens.ts — target (new file)
/**
 * Motion values for motion-v, read from the VueTail tokens so presets and reduced motion
 * reach JS-driven animation the same way they reach CSS transitions.
 */
const EASE: [number, number, number, number] = [0.2, 0, 0, 1];

const seconds = (name: string, fallbackMs: number): number => {
  if (typeof document === 'undefined') return fallbackMs / 1000;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ms = Number.parseFloat(raw);
  return (Number.isFinite(ms) ? ms : fallbackMs) / 1000;
};

export const useMotionTokens = () => ({
  enter: () => ({ duration: seconds('--vt-duration-enter', 200), ease: EASE }),
  exit: () => ({ duration: seconds('--vt-duration-exit', 130), ease: EASE }),
});
```

- `AppModal.vue` panel: `:transition="enter()"` and the exit uses `exit()` via motion-v's
  per-state transition: `:exit="{ opacity: 0, transform: 'translateY(6px) scale(0.97)', transition: exit() }"`
  (transform string from plan 006). Backdrop `:4-12`: `:transition="enter()"`.
- `AppToast.vue:20`: `:transition="enter()"`, and the exit state gets `transition: exit()`.

## Repo conventions to follow

- Composables live in `composables/` and must be listed in `registry.json` `composables`, and as a
  dependency of each component that imports them (`dependencies` map).
- Exemplar of a component reading motion preferences: `components/ui/AppNavbar.vue:247-253`.

## Steps

1. Create `composables/useMotionTokens.ts` with the code above.
2. Add `"useMotionTokens"` to `registry.json` `composables` (alphabetical), and add it to the
   `dependencies` arrays of `AppModal` and `AppToast`.
3. Replace duration and easing words in every `<Transition>` class listed above, per Target.
4. In `AppModal.vue` and `AppToast.vue`, import `useMotionTokens`, call it once in `<script setup>`,
   and use `enter()` / `exit()` as in Target.
5. In vuetail-docs `src/content/docs/`, add a one-line mention in `appmodal.ts` and `apptoast.ts`
   descriptions: "Durations follow the active preset."

## Boundaries

- Do NOT change what animates (opacity/transform values), only how long and with which curve.
- Do NOT touch `AppNavbar.vue` or `AppDock.vue` motion-v springs (gesture-driven, separate).
- Do NOT touch keyframe loops (`animate-spin`, `animate-pulse`, skeleton, toast progress).

## Verification

- **Mechanical**: `grep -rnE "duration-(75|100|150|200|300)\b" components` only matches non-transition
  uses (if any, list them); vuetail-docs `pnpm build` and `pnpm vitest run` pass.
- **Feel check**: in the docs, switch the header preset to Console and open Select and a modal:
  both feel snappier than in Ink. DevTools Animations panel shows 140ms enters in Console, 200ms in Ink.
- **Done when**: no `<Transition>` or motion-v call in `components/` hardcodes a duration.

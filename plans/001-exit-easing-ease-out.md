# 001 — Exits use the ease-out curve, not ease-in

- **Status**: DONE
- **Commit**: a4de2de
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 12 files, one-line class swaps plus one token value

## Problem

Every exit transition starts slow. `ease-in` delays the first frames, which is exactly when the
user is watching the element leave, so dropdowns, tooltips and popovers feel sticky on close.
The token source makes it official: `--ease-exit` is an ease-in curve.

```js
// styles/tokens.mjs:150-153 — current
export const easing = {
  standard: 'cubic-bezier(.2, 0, 0, 1)',
  exit: 'cubic-bezier(.4, 0, 1, 1)',
};
```

```html
<!-- components/ui/Fields/Select.vue:40 — current (same pattern at every location below) -->
leave-active-class="transition duration-100 ease-in"
```

Locations with `ease-in` on a leave transition:
`AppTooltip.vue:15`, `AppPopover.vue:11`, `Fields/Select.vue:40`, `Fields/PhoneInput.vue:59`,
`Fields/DatePicker.vue:45`, `AppFilterPanel.vue:79`, `AppDock.vue:617`, `AppTable.vue:73`,
`AppTable.vue:527`, `AppTable.vue:568`, `AppTable.vue:582`, `AdvancedAppTable.vue:352`.

## Target

Exits reuse the standard strong ease-out curve and differ from entrances only by being shorter.

```js
// styles/tokens.mjs — target
export const easing = {
  standard: 'cubic-bezier(.2, 0, 0, 1)',
  // Exits use the same ease-out curve as entrances, only shorter (--vt-duration-exit).
  exit: 'cubic-bezier(.2, 0, 0, 1)',
};
```

```html
<!-- every leave-active-class listed above — target -->
leave-active-class="transition duration-100 ease-exit"
```

Keep each location's existing duration class; plan 002 replaces durations.

## Repo conventions to follow

- Easing tokens are generated: edit `styles/tokens.mjs`, then run `node scripts/tokens.mjs build`.
  Tailwind exposes them as `ease-standard` and `ease-exit` utilities.
- Exemplar: `components/ui/AppButton.vue:15` already uses `ease-standard`.

## Steps

1. In `styles/tokens.mjs`, set `easing.exit` to `'cubic-bezier(.2, 0, 0, 1)'` with the comment shown above.
2. Run `node scripts/tokens.mjs build` from the repo root.
3. In each of the 12 locations above, replace the word `ease-in` inside the `leave-active-class`
   string with `ease-exit`. Change nothing else in that string.
4. In `DESIGN.md`, Motion table, change the `--vt-ease-exit` row value to
   `cubic-bezier(.2, 0, 0, 1)` in all three preset columns, and change the sentence under the
   table to: "Exits reuse the ease-out curve and are shorter than entrances. Never ease-in on UI."

## Boundaries

- Do NOT touch `ease-in-out` (keyframe pulses in `AppSkeleton.vue:59`, `AdvancedAppTable.vue:1349,1578`).
- Do NOT change durations, enter classes, or any markup.
- If a listed line no longer contains `ease-in`, STOP and report.

## Verification

- **Mechanical**: `node scripts/tokens.mjs check` prints `Tokens OK.`;
  `grep -rn "leave-active-class=\"[^\"]*ease-in\b" components` returns nothing;
  in vuetail-docs, `pnpm build` succeeds.
- **Feel check**: in the docs, open and close Select, a tooltip and the filter panel. In
  DevTools Animations at 10%, the close starts moving on the first frame instead of lingering.
- **Done when**: no UI exit uses an ease-in curve, and `DESIGN.md` says so.

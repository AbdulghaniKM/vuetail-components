# 007 — Tooltip and date picker scale from their trigger

- **Status**: DONE
- **Commit**: a4de2de
- **Severity**: LOW
- **Category**: Physicality & origin
- **Estimated scope**: 2 files

## Problem

Both scale from their centre, so they appear to grow out of empty space instead of out of the
element that opened them. `AppPopover.vue:153-156`, `Fields/Select.vue:182,190` and
`Fields/PhoneInput.vue:179,186` already set an origin; these two do not.

```html
<!-- components/ui/AppTooltip.vue:12-17 — current; no origin anywhere in the file -->
enter-from-class="opacity-0 scale-95"
```

```html
<!-- components/ui/Fields/DatePicker.vue:42-47 — current; no origin in the file -->
enter-from-class="scale-95 opacity-0"
```

## Target

- `AppTooltip.vue`: add an origin class to the tooltip element based on `placement`:
  `top` → `origin-bottom`, `bottom` → `origin-top`, `left` → `origin-right`, `right` → `origin-left`.
  Add it inside the existing `placementClass` computed so each placement returns its origin too.
- `DatePicker.vue`: wherever it computes the popup's position style, set
  `transformOrigin: 'top left'` when the popup opens below the trigger and `'bottom left'` when it
  opens above, the way `Fields/Select.vue:182,190` does.

## Repo conventions to follow

- Exemplar: `components/ui/Fields/Select.vue:182` and `:190` (`transformOrigin` in the style object).

## Steps

1. In `AppTooltip.vue`, append the matching `origin-*` class to each `placementClass` branch.
2. In `DatePicker.vue`, find the computed position style for the popup (the `:style` on the element
   at `:52`) and add `transformOrigin` per opening direction.

## Boundaries

- Do NOT change placement logic, only the origin.

## Verification

- **Mechanical**: docs build passes.
- **Feel check**: at 10% playback, a top tooltip grows up out of its trigger, and the date picker
  grows down from the field (or up, when it flips above).
- **Done when**: both components set an origin for every placement.

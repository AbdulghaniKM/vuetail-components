# 005 — AppTable: drop the toolbar entrance, no overshoot on the empty state

- **Status**: DONE
- **Commit**: a4de2de
- **Severity**: MEDIUM
- **Category**: Purpose & frequency; Physicality
- **Estimated scope**: 1 file

## Problem

The toolbar animates in on every mount of every table, which is the most frequently seen screen
in an admin app, and it explains nothing:

```html
<!-- components/ui/AppTable.vue:21-26 — current -->
<motion.div
  v-if="searchable || exportable || $slots['toolbar-end']"
  class="mb-3 flex w-full min-w-0 flex-wrap items-center gap-2"
  :initial="{ opacity: 0, y: -6 }"
  :animate="{ opacity: 1, y: 0 }"
  :transition="{ type: 'spring', stiffness: 420, damping: 32 }"
>
```

The empty state uses an underdamped spring (stiffness 380, damping 26, damping ratio about 0.67):
it overshoots about 6%, and DESIGN.md forbids overshoot.

```html
<!-- components/ui/AppTable.vue:263-268 — current -->
:initial="{ opacity: 0, scale: 0.94, y: 8 }"
:animate="{ opacity: 1, scale: 1, y: 0 }"
:transition="{ type: 'spring', stiffness: 380, damping: 26 }"
```

`AppTable.vue:507` uses the same 420/32 spring; read what it animates before changing it.

## Target

```html
<!-- toolbar — target: a plain div, no motion -->
<div
  v-if="searchable || exportable || $slots['toolbar-end']"
  class="mb-3 flex w-full min-w-0 flex-wrap items-center gap-2"
>
```

```html
<!-- empty state — target -->
:initial="{ opacity: 0, transform: 'translateY(8px) scale(0.97)' }"
:animate="{ opacity: 1, transform: 'none' }"
:transition="{ duration: 0.2, ease: [0.2, 0, 0, 1] }"
```

(If plan 002 has landed, use `useMotionTokens().enter()` instead of the literal transition.)

For `:507`: if it is a mount entrance seen on every table render, remove its motion like the
toolbar; if it responds to a user action (selection bar, bulk actions), keep it but replace the
spring with `{ duration: 0.2, ease: [0.2, 0, 0, 1] }`.

## Steps

1. Replace the toolbar `<motion.div ...>` with a `<div>` with the same `v-if` and `class`; change its closing tag.
2. Change the empty-state motion props as in Target.
3. Read `:507` and apply the rule above.
4. If `motion` is no longer used in the file, remove it from the `motion-v` import, and remove
   `motion-v` from `AppTable`'s `requires.packages` in `registry.json` only if nothing else in the
   file imports from `motion-v`.

## Boundaries

- Do NOT touch row, sort, pagination or filter behaviour.

## Verification

- **Mechanical**: docs build passes; `vue-tsc` clean.
- **Feel check**: in the docs AppTable page, reload: the toolbar is simply there. Filter to zero
  rows: the empty state rises and settles with no bounce, even at 10% playback.
- **Done when**: no spring with damping ratio under 1 remains in `AppTable.vue`.

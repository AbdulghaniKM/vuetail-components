# 006 — motion-v animates full transform strings, not x/y/scale shorthands

- **Status**: REVERTED (applied, then rolled back after the feel check)
- **Commit**: a4de2de
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 2 files (3 if plan 005 has not landed)

## Outcome

Applied, then reverted. With motion-v 1.6.1, a full `transform` string runs through the Web
Animations API, and when the animation finishes the element shows its *initial* state for one
frame before motion-v commits the final style. A CDP sample of the AppModal demo caught it at
about 242ms: `opacity 0, translateY(12px) scale(0.96)` between two `opacity 1` frames. With the
`y`/`scale` shorthands the same sample goes straight to `transform: none`. A one-frame flash on
every modal and toast is worse than main-thread animation on elements that open occasionally, so
AppModal, AppToast and AppTable keep the shorthands. Revisit when motion-v is upgraded.

## Problem

motion-v (Motion for Vue) runs the `x`, `y` and `scale` shorthands on the main thread; under load
(a page full of table rows) the modal and toast entrances drop frames. A full `transform` string
is hardware-accelerated.

```html
<!-- components/ui/AppModal.vue:36-38 — current -->
:initial="{ opacity: 0, scale: 0.96, y: 12 }"
:animate="{ opacity: 1, scale: 1, y: 0 }"
:exit="{ opacity: 0, scale: 0.97, y: 6 }"
```

```ts
// components/ui/AppToast.vue:93-97 — current
initial: { opacity: 0, y: yOffset, scale: 0.95 },
animate: { opacity: 1, y: 0, scale: 1 },
exit: { opacity: 0, y: isTop ? -8 : 8, scale: 0.95 }
```

## Target

```html
<!-- AppModal.vue — target -->
:initial="{ opacity: 0, transform: 'translateY(12px) scale(0.96)' }"
:animate="{ opacity: 1, transform: 'translateY(0px) scale(1)' }"
:exit="{ opacity: 0, transform: 'translateY(6px) scale(0.97)' }"
```

```ts
// AppToast.vue — target
initial: { opacity: 0, transform: `translateY(${yOffset}px) scale(0.95)` },
animate: { opacity: 1, transform: 'translateY(0px) scale(1)' },
exit: { opacity: 0, transform: `translateY(${isTop ? -8 : 8}px) scale(0.95)` },
```

Keep the from and to strings in the same function order (`translateY` then `scale`) so they interpolate.

## Steps

1. Replace the three motion states in `AppModal.vue` as above.
2. Replace the three states in `AppToast.vue`'s `motionConfig` as above.
3. If plan 005 has not landed, also convert `AppTable.vue:24-25` and `:266-267` the same way.

## Boundaries

- Values only; do not change durations, easing or which elements animate.

## Verification

- **Mechanical**: docs build passes.
- **Feel check**: open a modal and fire four toasts quickly in the docs; at 10% playback the
  motion matches the old path (same distance and scale), and the Performance panel shows the
  animation on the compositor rather than in main-thread script.
- **Done when**: no `x:`, `y:` or `scale:` keys remain in motion-v states in these files.

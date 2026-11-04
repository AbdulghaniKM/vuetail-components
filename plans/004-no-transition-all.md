# 004 — Replace transition-all with explicit properties

- **Status**: DONE
- **Commit**: a4de2de
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 9 files, 29 class swaps

## Problem

`transition-all` animates every changing property, including layout ones (width, height, padding),
off the compositor. Locations (`grep -rn "transition-all" components`): `AppFilterPanel.vue`,
`AppImageModal.vue`, `AppModal.vue`, `AppTable.vue`, `Fields/AppForm.vue`, `Fields/DatePicker.vue`,
`Fields/Select.vue`, `Fields/Textarea.vue`, `Fields/TimePickerClock.vue`.

```html
<!-- components/ui/Fields/Select.vue:18 — current -->
... text-start text-text transition-all focus:border-ring ...
```

## Target

Pick the narrowest list that covers what actually changes in that element's states:

| Element changes | Replace `transition-all` with |
|---|---|
| Colours only (hover, active, selected) | `transition-colors` |
| Border + focus ring (fields) | `transition-[border-color,box-shadow]` |
| Opacity + transform (Vue `<Transition>` classes) | `transition-[opacity,transform]` |
| Colours + transform (pressable) | `transition-[background-color,border-color,color,transform]` |

Each gets `duration-(--vt-duration) ease-standard` if it has no duration yet (state changes use
`--vt-duration`, see DESIGN.md Motion).

## Repo conventions to follow

- Exemplar: `components/ui/Fields/InputField.vue:17` uses
  `transition-[border-color,box-shadow] duration-(--vt-duration)`.

## Steps

1. For each occurrence, read the element's `hover:` / `focus:` / state classes and choose the row
   in the table that covers them. Replace `transition-all` with it.
2. Inside Vue `<Transition>` `enter-active-class`/`leave-active-class`, use `transition-[opacity,transform]`.

## Boundaries

- Do NOT change durations already set by plan 002, or easing set by plan 001.
- If an element really animates size (for example a progress width), use
  `transition-[width]` there and note it in the commit message; do not leave `transition-all`.

## Verification

- **Mechanical**: `grep -rn "transition-all" components` returns nothing; docs build passes.
- **Feel check**: hover and focus Select, Textarea, DatePicker, the filter panel chips and table
  rows; every state change still animates, and opening the modal and image viewer still fades.
- **Done when**: zero `transition-all` in `components/`.

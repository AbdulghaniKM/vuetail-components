---
version: alpha
name: VueTail
description: A copy-in Vue 3 + Tailwind CSS v4 component library whose default look (Ink) is quiet, exact and finished with zero customization, and which retheme from five settings or one preset attribute.
colors:
  bg: "#EDEFF2"
  surface: "#F6F7F9"
  surface-raised: "#F9FAFB"
  muted: "#E3E6EB"
  border: "#D6DAE0"
  border-strong: "#A9AFBA"
  text: "#0E1014"
  text-muted: "#464B56"
  text-subtle: "#6A707C"
  accent: "#0E1014"
  accent-hover: "#2C3038"
  accent-fg: "#F6F7F9"
  accent-subtle: "#DFE4FA"
  accent-text: "#2440D2"
  ring: "#2440D2"
  success: "#1E7F47"
  warning: "#E0A21B"
  danger: "#C4321F"
  info: "#2468B8"
typography:
  display:
    fontFamily: Schibsted Grotesk
    fontSize: clamp(2.3rem, 1.3rem + 3.2vw, 3.9rem)
    fontWeight: 700
    letterSpacing: -0.035em
    lineHeight: 1.02
  heading:
    fontFamily: Schibsted Grotesk
    fontSize: 1.375rem
    fontWeight: 700
    letterSpacing: -0.02em
    lineHeight: 1.2
  body:
    fontFamily: Schibsted Grotesk
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.55
  control:
    fontFamily: Schibsted Grotesk
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1
  mono:
    fontFamily: Spline Sans Mono
    fontSize: 0.8125rem
    fontWeight: 500
rounded:
  sm: 2px
  md: 3px
  lg: 4px
  xl: 6px
  2xl: 8px
spacing:
  unit: 4px
  control-sm: 32px
  control-md: 40px
  control-lg: 48px
  control-px: 16px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.md}"
    height: "{spacing.control-md}"
    padding: 0 16px
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.md}"
  field:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border-strong}"
    focusBorderColor: "{colors.ring}"
    rounded: "{rounded.md}"
    height: "{spacing.control-md}"
  dialog:
    backgroundColor: "{colors.surface-raised}"
    borderColor: "{colors.border}"
    rounded: "{rounded.xl}"
---

# VueTail design contract

Every component, the docs site and the template read this file before they style anything. A token that is not listed here does not exist yet: add it here first, then use it.

The look was chosen from five candidates in the
[VueTail Look Book](https://claude.ai/artifact/Mfy1CALvk7zMKLN4qgSAWd). Its markup is the
reference rendering for every value below.

## Overview

VueTail is a component library, not a design system. People copy components into their own
`src`, then brand them. So the default has two jobs that pull against each other: it has to
look finished when nobody touches it, and it has to get out of the way when somebody does.

**Ink** does both by spending nothing on decoration. Actions are near-black, one signal blue
marks focus, links and selection, corners are 3px, and borders separate surfaces instead of
shadows. With no brand colour, it reads as deliberate. With a brand colour dropped into
`--color-accent`, nothing else in the system competes with it.

Two presets ship beside it and switch with one attribute:

| Preset | Character | Switch |
|---|---|---|
| **Ink** (default) | Swiss rational: ink actions, signal blue, borders over shadows | no attribute |
| **Pine** | Soft utility: pine green, soft two-layer depth, 10px corners | `<html data-vt-preset="pine">` |
| **Console** | Dense pro: 32px controls, 13px UI text, IBM Plex | `<html data-vt-preset="console">` |

Light and dark are a separate axis (`data-theme="dark"` on `<html>`), so there are six
combinations. All six must pass the contrast rules below.

## The five settings

A preset is a saved bundle of these. Each one can also be overridden on its own, so
"Ink with Console's density" is a valid theme.

| Setting | Tokens it drives | Ink | Pine | Console |
|---|---|---|---|---|
| Accent | `accent`, `accent-hover`, `accent-fg`, `accent-subtle`, `accent-text`, `ring` | `#0E1014`, signal `#2440D2` | `#1F6E5A` | `#2A62E0` |
| Neutral tint | `bg` through `text-subtle` | cool grey, hue 225 | green-grey, hue 160 | blue-slate, hue 220 |
| Radius | `--radius-sm` through `--radius-2xl` | base 3px | base 8px | base 4px |
| Density | `--vt-control-*`, `--vt-control-px`, `--vt-text-control` | 32 / 40 / 48px, 14px | 32 / 40 / 48px, 14px | 26 / 32 / 38px, 13px |
| Font | `--font-sans`, `--font-display`, `--font-mono` | Schibsted Grotesk, Spline Sans Mono | Plus Jakarta Sans, JetBrains Mono | IBM Plex Sans, IBM Plex Mono |

`accent-text` and `ring` stay separate from `accent` on purpose. Ink's accent is ink, which
cannot also be the colour of a link or a focus ring, so Ink sends those to signal blue. In Pine
and Console they are the accent hue darkened for text contrast.

## Colors

### Token vocabulary

One vocabulary for components, docs and template. Names live in Tailwind's `--color-*`
namespace, so `text-text-muted`, `bg-muted` and `border-border` keep working.

| Group | Token | Role |
|---|---|---|
| Surfaces | `bg` | Page ground |
| | `surface` | Cards, fields, panels |
| | `surface-raised` | Dialogs, popovers, toasts: one step brighter than `surface` |
| | `muted` | Fills: secondary buttons, neutral badges, code chips, disabled fields |
| | `overlay` | Modal scrim |
| Text | `text` | Body and headings |
| | `text-muted` | Secondary text, help text, table metadata. 4.5:1 or better on `bg` and `muted` |
| | `text-subtle` | Placeholders, disabled labels, captions. 3:1 or better on `bg` |
| Lines | `border` | Dividers, card edges |
| | `border-strong` | Control edges: fields, outline buttons, checkboxes |
| | `ring` | Focus ring |
| Brand | `accent`, `accent-hover`, `accent-fg` | Primary buttons, checked controls |
| | `accent-subtle` | Selected rows, soft accent badges |
| | `accent-text` | Links, accent text on `bg` or `accent-subtle` |
| Status | `success`, `warning`, `danger`, `info` | Solid fills |
| | `*-fg` | Text on the solid fill |
| | `*-subtle` | Tinted background for soft badges and inline alerts |
| | `*-text` | Status text on `bg` or `*-subtle` |
| | `danger-hover` | Hover fill for danger buttons |

### Ink light

No plain white anywhere. The ground is a cool grey and each surface level steps brighter, so
elevation reads without shadows.

| Token | Value | Contrast |
|---|---|---|
| `bg` | `#EDEFF2` | |
| `surface` | `#F6F7F9` | |
| `surface-raised` | `#F9FAFB` | |
| `muted` | `#E3E6EB` | |
| `overlay` | `rgb(12 16 20 / .42)` | |
| `border` | `#D6DAE0` | |
| `border-strong` | `#A9AFBA` | |
| `text` | `#0E1014` | 16.5:1 on `bg` |
| `text-muted` | `#464B56` | 7.6:1 on `bg`, 7.0:1 on `muted` |
| `text-subtle` | `#6A707C` | 4.3:1 on `bg` |
| `accent` / `accent-hover` | `#0E1014` / `#2C3038` | |
| `accent-fg` | `#F6F7F9` | 17.8:1 on `accent` |
| `accent-subtle` | `#DFE4FA` | |
| `accent-text`, `ring` | `#2440D2` | 6.7:1 on `bg`, 6.1:1 on `accent-subtle` |

### Ink dark

| Token | Value | Token | Value |
|---|---|---|---|
| `bg` | `#0C0D10` | `text` | `#F2F3F5` |
| `surface` | `#121418` | `text-muted` | `#A6ACB8` (8.5:1) |
| `surface-raised` | `#16181D` | `text-subtle` | `#7A8190` (5.0:1) |
| `muted` | `#1A1D22` | `accent` / `accent-hover` | `#F2F3F5` / `#D5D8DE` |
| `overlay` | `rgb(0 0 0 / .6)` | `accent-fg` | `#0C0D10` |
| `border` | `#262A31` | `accent-subtle` | `#1A2042` |
| `border-strong` | `#434955` | `accent-text`, `ring` | `#8C9DFF` (7.8:1) |

### Pine overrides

| Token | Light | Dark |
|---|---|---|
| `bg` / `surface` / `surface-raised` / `muted` | `#F5F7F6` / `#FFFFFF` / `#FFFFFF` / `#ECF0EE` | `#0F1513` / `#151D1A` / `#1A2420` / `#1D2723` |
| `border` / `border-strong` | `#DCE3E0` / `#C3CEC9` | `#26322D` / `#3A4842` |
| `text` / `text-muted` / `text-subtle` | `#14201C` / `#4E5D57` / `#75837D` | `#E8EFEC` / `#A3B2AC` / `#7A8983` |
| `accent` / `accent-hover` / `accent-fg` | `#1F6E5A` / `#185A4A` / `#FFFFFF` | `#4FBF98` / `#6BD0AD` / `#06140F` |
| `accent-subtle` / `accent-text` / `ring` | `#E1F0EA` / `#1A6553` / `#2F8F75` | `#17302A` / `#6FD3AE` / `#6FD3AE` |

The plain-white rule is Ink's. Pine keeps white surfaces on a green-grey ground; that soft
contrast is its character.

### Console overrides

| Token | Light | Dark |
|---|---|---|
| `bg` / `surface` / `surface-raised` / `muted` | `#F4F5F8` / `#FFFFFF` / `#FFFFFF` / `#ECEEF3` | `#0F1218` / `#151922` / `#1A1F29` / `#1D222D` |
| `border` / `border-strong` | `#E0E3EA` / `#C3C9D5` | `#262C38` / `#3A4253` |
| `text` / `text-muted` / `text-subtle` | `#161A22` / `#4B5363` / `#737C8D` | `#E6E9EF` / `#A0A8B8` / `#778196` |
| `accent` / `accent-hover` / `accent-fg` | `#2A62E0` / `#1F51C2` / `#FFFFFF` | `#5B8CFF` / `#7AA2FF` / `#08101F` |
| `accent-subtle` / `accent-text` / `ring` | `#E6EDFD` / `#2456C9` / `#2A62E0` | `#18233F` / `#86A8FF` / `#86A8FF` |

### Status, shared by all presets

Semantic colour is separate from the accent and does not change with the preset.

| Tone | Solid | `-fg` | `-text` light / dark | `-subtle` light / dark |
|---|---|---|---|---|
| success | `#1E7F47` | `#FFFFFF` | `#17703E` / `#5FCF8E` | `#E2F3E7` / `rgb(95 207 142 / .14)` |
| warning | `#E0A21B` | `#231800` | `#8A5700` / `#F2BC4B` | `#FBF0D6` / `rgb(242 188 75 / .14)` |
| danger | `#C4321F` (hover `#A82A19`) | `#FFFFFF` | `#B42318` / `#FF8B7B` | `#FCE8E5` / `rgb(255 139 123 / .14)` |
| info | `#2468B8` | `#FFFFFF` | `#1C5CA6` / `#7DB2F2` | `#E3EDF9` / `rgb(125 178 242 / .14)` |

Status is never carried by colour alone: badges carry a word, errors carry an icon and a
sentence.

## Typography

| Role | Ink | Pine | Console |
|---|---|---|---|
| Display (home hero only) | Schibsted Grotesk 700, -0.035em, 1.02 | Plus Jakarta Sans 800, -0.03em | IBM Plex Sans 600, -0.02em |
| Headings | Schibsted Grotesk 700, -0.02em | Plus Jakarta Sans 700 | IBM Plex Sans 600 |
| Body | Schibsted Grotesk 400, 15px / 1.55 | Plus Jakarta Sans 400, 15px | IBM Plex Sans 400, 14px |
| Controls and labels | Schibsted Grotesk 500, 14px | Plus Jakarta Sans 600, 14px | IBM Plex Sans 500, 13px |
| Code and tabular data | Spline Sans Mono 500 | JetBrains Mono | IBM Plex Mono |

- Type scale: 12, 13, 14, 15, 17, 20, 24, 30, 38, then the clamped display size. Stay on it.
- `font-variant-numeric: tabular-nums` on every table column, pager and timer.
- Headings get `text-wrap: balance`. Running text stays near 65 characters wide.
- Labels are sentence case in the body face. Mono is for code and data a reader scans, never for
  decoration.
- Ink ships its two faces. A preset's faces load only when that preset is selected.

## Layout

- 4px spacing unit. Control padding and gaps come from `--vt-control-*`, never from fixed
  Tailwind sizes, so Console's density reaches every component.
- Control heights: sm, md, lg = 32, 40, 48px (Console 26, 32, 38). Console is a desktop preset;
  its controls sit under the 44px touch minimum by design.
- Touch targets stay 44px or larger in Ink and Pine. Icon buttons that are smaller visually
  extend their hit area.

## Elevation & Depth

| Level | Use | Ink | Pine | Console |
|---|---|---|---|---|
| 0 | Page, inline content | none | none | none |
| 1 | Cards, panels | border only | `0 1px 2px / .05, 0 2px 6px / .05` | `0 1px 2px / .05` |
| 2 | Popovers, menus, toasts | `0 8px 24px rgb(14 16 20 / .10)` | `0 2px 4px / .05, 0 10px 24px / .09` | `0 6px 16px / .10` |
| 3 | Dialogs | `0 24px 64px rgb(14 16 20 / .18)` | `0 4px 10px / .06, 0 24px 56px / .16` | `0 16px 40px / .18` |

In Ink, surfaces separate by border and by stepping brighter (`bg`, then `surface`, then
`surface-raised`). Shadows appear only on things that float above the page. In dark mode
every preset leans on borders, because shadows vanish against a dark ground.

## Shapes

| Role | Token | Ink | Pine | Console |
|---|---|---|---|---|
| Badges, checkboxes, code chips | `rounded-sm` | 2px | 6px (badges pill) | 3px |
| Buttons, fields | `rounded-md` | 3px | 8px | 4px |
| Small cards, table shells | `rounded-lg` | 4px | 10px | 5px |
| Cards, dialogs | `rounded-xl` | 6px | 14px | 8px |
| Large sheets | `rounded-2xl` | 8px | 18px | 10px |
| Switches, avatars | `rounded-full` | 3px for Ink switches, otherwise full | full | full |

These redefine Tailwind's own `--radius-*`, so every existing `rounded-lg` follows the preset
with no rewrite.

## Motion

| Token | Ink | Pine | Console |
|---|---|---|---|
| `--vt-duration` (state changes) | 160ms | 160ms | 110ms |
| `--vt-duration-enter` (overlays in) | 200ms | 220ms | 140ms |
| `--vt-duration-exit` (overlays out) | 130ms | 140ms | 90ms |
| `--vt-ease` | `cubic-bezier(.2, 0, 0, 1)` | same | same |
| `--vt-ease-exit` | `cubic-bezier(.4, 0, 1, 1)` | same | same |
| Press | `translateY(1px)` | `scale(.98)` | `scale(.98)` |

Animate `transform`, `opacity` and colours only. Never bounce or overshoot. Under
`prefers-reduced-motion: reduce`, state changes are instant and overlays fade without moving.

## Components

The five reference components. Each one's states are pinned in the look book.

### Button (`AppButton`)

| Variant | Fill | Text | Edge | Use |
|---|---|---|---|---|
| primary | `accent` | `accent-fg` | none | One per view |
| secondary | `muted` | `text` | none | Beside primary |
| outline | `surface` | `text` | `border-strong` | Neutral actions on busy surfaces |
| ghost | transparent | `text` | none | Toolbars, dialog dismiss |
| danger | `danger` | `danger-fg` | none | Only actions that destroy data |

- States: hover darkens the fill (`accent-hover`, `danger-hover`, or `muted` mixed 8% toward
  `text`); focus-visible draws a 2px `ring` outline at 2px offset; pressed applies the preset's
  press transform; disabled is 45% opacity with no hover and `cursor: not-allowed`; loading
  keeps the width, shows a spinner and sets `aria-busy`.
- Sizes sm, md, lg follow `--vt-control-*`. Icon-only buttons are square and always carry an
  `aria-label`.

### Text field (`Fields/InputField`)

- A visible label always, never a placeholder standing in for one. Required fields mark the
  label with `*` in `danger-text`.
- Rest: `surface` fill, `border-strong` edge. Hover: the edge darkens 25% toward `text`.
  Focus: `ring` edge plus a 3px `ring` halo at 24% opacity.
- Error: `danger-text` edge, and the error message replaces the help text with an icon and a
  sentence that says how to fix it. Validate on blur, not on keystroke.
- Disabled: `muted` fill, 60% opacity. Read-only stays at full opacity with no edge change.
- Prefix and suffix text use `text-subtle`.

### Badge (`AppBadge`)

- Tones: neutral, accent, success, warning, danger, info.
- Styles: soft (default, `*-subtle` fill with `*-text`), solid (for the one status that has to
  win attention), outline (metadata).
- 22px tall (Console 20px), 12px semibold text, optional leading dot.

### Checkbox, radio and switch (`AppCheckbox`)

- 18px boxes, `border-strong` edge, `surface` fill. Checked and indeterminate fill with
  `accent` and draw the mark in `accent-fg`.
- Switches apply immediately; checkboxes wait for a Save. Never use a switch inside a form that
  has a Save button.
- Focus, disabled and disabled-checked states are all visible and distinct.

### Dialog (`AppModal`, `ConfirmDangerModal`)

- `surface-raised` fill, `border` edge, `rounded-xl`, level-3 shadow, on an `overlay` scrim.
- The title asks the question; the body says what happens to the user's work; the buttons name
  the outcome ("Discard changes", not "OK").
- Danger confirmation makes the user type the resource name before the danger button enables.
- Enters with `--vt-duration-enter` (fade plus 4px rise), exits faster with
  `--vt-duration-exit`, and returns focus to the trigger.

## Tailwind CSS v4 wiring

1. `tokens.css` becomes a registry item. It declares Ink in an `@theme` block, using the
   `--color-*`, `--radius-*`, `--shadow-*` and `--font-*` namespaces, and the `--vt-*` tokens
   that have no Tailwind namespace.
2. Ink dark, the presets and the preset darks are plain CSS blocks that redefine the same
   variables:
   `[data-theme="dark"]`, `[data-vt-preset="pine"]`, `[data-vt-preset="pine"][data-theme="dark"]`,
   and the same for console.
3. Components use utilities (`bg-surface`, `text-text-muted`, `rounded-md`) and, where Tailwind
   has no namespace, the variable shorthand (`h-(--vt-control-md)`, `px-(--vt-control-px)`).
4. `theme.ts` brand presets (neutral, ocean, sunset, forest, mono) are replaced by `ink`,
   `pine` and `console`. `useTheme` sets `data-vt-preset` and loads that preset's fonts on first
   use.

To verify in Phase 1: whether a named `--spacing-control-md` key yields `h-control-md`
cleanly in Tailwind v4, and which Fontsource packages carry Schibsted Grotesk and Spline Sans
Mono for self-hosting.

## Migration from today's tokens

| Old | New | Notes |
|---|---|---|
| `--color-background` | `bg` | template name |
| `--color-text-secondary` | `text-muted` | 14 `var()` uses and 3 class uses |
| `text-muted` class (13 uses) | `text-text-muted` | `muted` is now a fill, not a text colour |
| `text-secondary` class (16 uses) | `text-text-muted` | |
| `--color-primary` | `accent` | 9 `var()` uses, 15 class uses |
| `--color-secondary` | none | decide per call site: `muted` fill or `text-muted` text |
| `--color-emphasis` | `text` | |
| `--color-link`, `--color-link-hover` | `accent-text` | hover adds an underline, not a new colour |
| `--color-error` | `danger`, `danger-text` | |
| `--color-surface-raised` (docs) | `surface-raised` | unchanged |
| raw hex in 7 components | tokens | AdvancedAppTable, AppButton, AppDock, AppLiquidGlass, AppNavbar, AppTable, RibbonField |

The fallback chains components carry today (`var(--color-text-secondary, var(--color-text-muted))`)
go away once the template and the docs both load `tokens.css`.

## Do's and Don'ts

- Do add a token here before any component uses it.
- Do test every component in all six preset and theme combinations before it ships.
- Do keep focus visible on every interactive element.
- Don't use plain white anywhere in Ink light. Surfaces step from `#EDEFF2` up to `#F9FAFB`.
- Don't put the accent on text in Ink. Use `accent-text`.
- Don't hardcode sizes (`h-10`, `px-4`, `text-sm`) on controls. Density has to reach them.
- Don't change: Ink as the default, Pine and Console as the only presets, Schibsted Grotesk as
  Ink's face. These are the user's decisions.
- Don't use Inter or a system-font-only stack, purple or indigo gradients, cream with
  terracotta (SD1), near-black with one neon accent (SD2), all-caps eyebrow labels (SD4), one
  accented word in a headline (SD5), decorative 01 / 02 / 03 (SD6), arrows stapled to button
  labels (CP3), or glass as the default surface (K3). Liquid Glass stays an opt-in material.

# VueTail design bible

The rules every VueTail component follows, so that a page built from forty of them reads as one
system. [DESIGN.md](DESIGN.md) holds the values (tokens, presets, the five settings). This file
holds the rules for using them. When the two disagree, fix both in the same change.

A component is done when it passes the checklist at the end. A component that breaks a rule
here is a bug, whoever wrote it.

## 1. Principles

1. **One system.** A user who learns one control can predict every other: the same edge, the
   same focus, the same hover, the same corners, the same motion.
2. **Tokens or nothing.** Every colour, radius, shadow, size, duration and easing comes from a
   token. A component never invents a palette, not even a private one.
3. **The preset owns the look.** Ink, Pine and Console must restyle every component, including
   docks, previews and effects. If switching preset leaves a component unchanged, it is wrong.
4. **Quiet by default.** Borders separate, fills step brighter, shadows are for things that
   float. Decoration is never the default; a prop turns it on.
5. **State is always visible.** Hover, focus, selected, disabled, invalid and loading each look
   different, and none of them relies on colour alone.

## 2. Anatomy of a control

Every interactive control is built from the same parts, sized by density tokens.

| Part | Rule |
|---|---|
| Height | `h-control-sm` / `h-control-md` (default) / `h-control-lg`. Never `h-10`, `py-2.5` or a fixed size. |
| Side padding | `px-control-pad`. Icon-only controls are square: `size-control-*`. |
| Text | `text-control` (14px, Console 13px), weight 500. |
| Frame | `rounded-md`, 1px edge. Fields and outline buttons use `border-strong`; cards use `border`. |
| Fill | Fields and outline buttons sit on `surface`. Filled buttons use their variant fill. |
| Label | Above the control, `text-sm font-medium text-text`, sentence case, always visible. |
| Help / error | Below, `text-sm`. Help in `text-text-muted`; error in `text-danger-text` with an icon, linked with `aria-describedby`. |
| Hit area | 44px or larger in Ink and Pine (extend with padding or `::after`). Console may go smaller; it is a desktop preset. |

## 3. Interaction states

One table for every control. Do not add a state that is not here; do not style a state
differently from it.

| State | Fields (input, textarea, select, date, time, phone, search) | Buttons | Choice (checkbox, radio, switch) | Rows, items, tabs |
|---|---|---|---|---|
| Rest | `surface` fill, `border-strong` edge | variant fill (see DESIGN.md) | `surface` box, `border-strong` edge | transparent |
| Hover | edge mixes 25% toward `text`; fill unchanged | fill darkens (`*-hover`, or `muted` 8% toward `text`) | edge mixes 25% toward `text` | `muted` fill |
| Focus | **the focus ring (section 4)** | **the focus ring** | **the focus ring** | **the focus ring** |
| Pressed | none | preset press transform (`--vt-press-y`, `--vt-press-scale`) | none | none |
| Selected / checked | not applicable | not applicable | `accent` fill, `accent-fg` mark | `accent-subtle` fill, `text` label, plus a non-colour cue (check, bar or weight) |
| Invalid | `danger-text` edge, error message below | not applicable | `danger-text` edge | not applicable |
| Disabled | `muted` fill, 60% opacity, `cursor-not-allowed` | 45% opacity, no hover | 45% opacity | 45% opacity |
| Read-only | as rest, no hover change, full opacity | not applicable | not applicable | not applicable |
| Loading | spinner in the trailing slot, `aria-busy` | keep width, spinner replaces the icon, `aria-busy` | not applicable | skeleton rows |

Hover never moves anything and never adds a shadow. Transitions on these states use
`transition-colors duration-(--vt-duration)`; never `transition-all`.

## 4. Focus: one ring, everywhere

The single most visible sign that components belong together. There is exactly one focus
indicator in VueTail.

**The ring.** A 2px solid outline in `--color-ring`, drawn on `:focus-visible`.

| Control | Where the ring goes | Offset |
|---|---|---|
| Standalone controls: buttons, checkboxes, switches, links, tabs, cards, chips, menu items | the control itself | `2px` |
| Boxed fields: input, textarea, select trigger, date and time triggers, phone input, search boxes, any frame that holds a native input plus prefix or suffix | the frame, via `:focus-within` | `-1px`, so the ring replaces the edge instead of doubling it |
| Rows and cells inside a scroller | the row | `-2px`, so `overflow` cannot clip it |

Rules:

- **No halos.** `focus:ring-*`, `ring-3`, `ring-ring/25` and `box-shadow` focus effects are
  banned. They are what made fields look doubled.
- **No edge change on focus.** A field's border does not turn `ring` on focus; the ring covers it.
- **Never remove without replacing.** `outline-none` is allowed only on a native input whose
  frame draws the ring through `:focus-within`.
- **Invalid fields keep the error visible.** A focused invalid field draws the ring in
  `--color-danger-text`.
- **Never obscured.** Sticky headers and docks leave room (`scroll-padding-top`), and overflow
  containers use the negative offset rather than clipping the ring.
- The base rule lives once, in `styles/tokens.css`, at zero specificity so components can adjust
  the offset:

```css
:where(:focus-visible) {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
```

The field frame then needs only:

```html
<div class="rounded-md border border-border-strong bg-surface focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-ring">
  <input class="outline-none ..." />
</div>
```

## 5. Surfaces and elevation

| Level | What | Fill | Edge | Shadow class |
|---|---|---|---|---|
| 0 | Page, inline content | `bg` | none | none |
| 1 | Cards, panels, fields, table shells | `surface` | `border` | `shadow-sm` (none in Ink) |
| 2 | Popovers, menus, toasts, tooltips, docks | `surface-raised` | `border` | `shadow-lg` |
| 3 | Dialogs, sheets | `surface-raised` | `border` | `shadow-xl` |

- These are the only shadow classes. They map to `--vt-shadow-1/2/3`, so each preset decides
  the depth. Arbitrary `shadow-[...]` and hand-written `box-shadow` values are banned (glow on
  a material is the one exception, and it uses `--color-ring` or `--color-accent`).
- A thing that floats always has an edge as well as a shadow, because shadows vanish in dark
  mode.
- Scrims use `bg-overlay`. Nothing else darkens the page.
- Tinted backgrounds (`*-subtle`, `muted`) mark state or category, never decoration.

## 6. Shape

| Role | Class |
|---|---|
| Badges, chips, checkboxes, code chips, kbd | `rounded-sm` |
| Buttons, fields, menu items, tabs | `rounded-md` |
| Small cards, table shells, toasts, popovers | `rounded-lg` |
| Cards, dialogs, docks, panels | `rounded-xl` |
| Sheets, large media | `rounded-2xl` |
| Avatars, switches, dots, pills a preset asks for | `rounded-full` |

- Nested corners shrink: an inner element's radius is the outer radius minus the gap, so pick
  the next step down.
- `rounded-[...]` and raw `border-radius` values are banned outside mockups (section 13).
- Pills are a preset decision (Pine badges), not a component decision.

## 7. Colour

- Use the role, not the hue: `text`, `text-muted`, `text-subtle`, `accent-text`, `*-text` for
  text; `surface`, `surface-raised`, `muted`, `*-subtle` for fills; `border`, `border-strong`,
  `ring` for lines. The vocabulary is in DESIGN.md.
- **Readable text** is `text` or `text-muted` (4.5:1). `text-subtle` (3:1) is for placeholders,
  hints and decorative glyphs only.
- **No alpha on text tokens.** `text-text/50`, `text-text-muted/40` and `opacity-*` on text are
  banned; they fail contrast in at least one preset. `tests/registryContrast.spec.ts` enforces
  this.
- **No raw colour in components.** No hex, no `rgb()`, no Tailwind palette (`bg-zinc-900`,
  `text-white`). A component-private variable is allowed only when it is defined from tokens:
  `--dock-fill: var(--color-surface-raised)`, never `--dock-fill: #12151c`.
- **Colour that the user supplies** (a chip hue, a ribbon colour, a badge tone) is mixed toward
  `--color-text` until it reaches 4.5:1 on its tint, as AdvancedAppTable's `tone()` does.
- Status always carries a word or an icon as well as a colour.
- Light and dark are designed together. A component is reviewed in all six preset × theme
  combinations, not in Ink light alone.

## 8. Typography

| Use | Class |
|---|---|
| Control text, labels | `text-control` / `text-sm` (`font-medium`) |
| Body, descriptions | `text-sm` in dense UI, `text-base` in prose |
| Metadata, captions, counts | `text-xs` (12px is the floor; never 10px or 11px) |
| Section titles inside a component | `text-base font-semibold` |
| Dialog and page titles | `text-lg` to `text-xl`, `font-semibold`, `text-wrap: balance` |
| Code, IDs, numbers a reader compares | `font-mono`, `tabular-nums` |

- The face comes from the preset (`font-sans`, `font-display`, `font-mono`). A component never
  names a font family.
- Only the Tailwind scale. `text-[0.6875rem]` and `font-size: 11px` are banned.
- Sentence case for every label, title and button. No uppercase-with-tracking eyebrow labels.

## 9. Icons

- **One set: Heroicons v2** (`icon-[heroicons--*]`, outline). Its solid form
  (`icon-[heroicons--*-solid]`) is allowed only for a selected or active state of the same glyph.
  Not `heroicons-outline--*`: that is the old v1 set.
- A project may switch every file to Lucide or Phosphor with `pnpm add-component icons <set>`
  (the CLI rewrites from `icons.map.json`). The registry itself stays on Heroicons; a new glyph
  needs a row in `icons.map.json` for each set.
- Brand marks (GitHub and the like) come from `simple-icons` or `mdi` and appear only as logos.
- Sizes follow the text: 16px beside `text-sm`, 18px beside `text-control` at md, 20px at lg.
  Icons take `currentColor`.
- Decorative icons get `aria-hidden="true"`. An icon that is the whole control gets an
  accessible name on the control (AppButton takes it from `label`, then `tooltip`).

## 10. Motion

- Durations: `--vt-duration` for state changes, `--vt-duration-enter` and `--vt-duration-exit`
  for things that appear and leave. Exits are shorter than entrances.
- Easing: `ease-standard` (`--vt-ease`) and `ease-exit` (`--vt-ease-exit`) only. No
  `cubic-bezier` literals, no bounce, no overshoot (any control point above 1 or below 0).
- Animate `transform`, `opacity` and colours. Never width, height, top or left.
- `prefers-reduced-motion: reduce` drops movement and keeps fades. Use `useReducedMotion` or
  `motion-reduce:` variants. Durations shrink through the tokens (80 / 100 / 70ms in every preset).
- Press feedback is the preset's press transform and nothing else.

## 11. Layout and density

- 4px spacing unit; gaps inside a control are `gap-1.5` or `gap-2`, between controls `gap-3`.
- Controls take their size from the density tokens so Console reaches every component.
- Nothing has a fixed width in `px`. Use `rem`, `%`, `ch` or the Tailwind scale; give
  components `max-w-*` and let them shrink.
- Logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`) so RTL
  works without overrides.
- A scroll area that can overflow is focusable and labelled
  (`tabindex="0"`, `role="group"`, `aria-label`).

## 12. Families

### Actions
AppButton variants are the only buttons. Toolbars use `ghost` or `outline`; one `primary` per
view. A button that only opens something says so with a trailing chevron, not a colour.

### Fields
Every field is the same frame (section 2), the same states (section 3) and the same ring
(section 4). Prefix and suffix text use `text-subtle`; prefix and suffix buttons are ghost
icon buttons inside the frame. Dropdown panels are level-2 surfaces.

### Choice controls
18px boxes on `surface` with a `border-strong` edge; checked is `accent` with an `accent-fg`
mark. Switches use `rounded-switch`. Every one is named, by a visible label or `aria-label`.

### Overlays
Popover, menu, tooltip and toast are level 2; dialog and sheet are level 3. They enter with a
4px rise and fade on `--vt-duration-enter`, leave faster, trap focus when modal, and return
focus to the trigger.

### Feedback
Toasts, badges, empty states, skeletons and spinners use status tokens through their roles
(`*-subtle` fill, `*-text` text, an icon or word). Skeletons use `muted` and stop pulsing under
reduced motion.

### Data
Tables are a level-1 shell (`rounded-lg`, `border`). Headers are `text-xs font-medium
text-text-muted` in sentence case; numbers are `tabular-nums` and end-aligned. Selection uses
named checkboxes; empty header cells carry screen-reader text. Row hover is `muted`; a
selected row is `accent-subtle`. Category colours follow section 7.

### Navigation
Navbars, docks and sidebars are level-2 surfaces with the system edge and the system ring.
The active item is `accent-subtle` with `text` plus a non-colour cue, never a private accent.

## 13. Materials, effects and mockups

The three families that drifted. They are allowed to be special in what they do, not in which
system they belong to.

**Materials and effects** (AppLiquidGlass, AppGlassContainer, AppMagnifier, RibbonField):
- Default colours come from tokens: the accent, the surfaces and the text colour of the current
  preset. A prop can override them; the default never hard-codes a hue.
- Glass tints mix `--color-surface` and `--color-border`; glows use `--color-ring` or
  `--color-accent`.
- Their controls (buttons, sliders, captions) are ordinary VueTail controls.

**AppDock and AppNavbar** are navigation (section 12), not decoration:
- The fill is `surface-raised` (glass mode mixes it with transparency), the edge is `border`,
  the shadow is `shadow-lg`, the active indicator is `accent`, badges are `danger` with
  `danger-fg`. No fixed dark chrome; in light mode a dock is light.
- A dark dock is a preset or theme decision, or an explicit `appearance="dark"` prop, never the
  default.

**Mockups** (AppNotificationPreview's phone, the docs' window and screen frames) imitate another
platform on purpose:
- Inside the imitated screen, the platform's own look is allowed: its system font, its radii,
  its colours. That is the content being previewed.
- Everything around it is VueTail: the frame edge, the caption, the cut-off warning, the
  controls, the empty state. Those use tokens, the ring and the type scale.
- The default wallpaper derives from `--color-accent`, so the preview changes with the preset.

## 14. Writing

- Sentence case everywhere. Labels are nouns ("Email"), buttons are verbs that name the outcome
  ("Save changes", "Delete project").
- Errors say what is wrong and how to fix it, next to the field. Empty states say what will
  appear and offer the first action.
- No placeholder text standing in for a label. Placeholders show a format, not an instruction.

## 15. Accessibility baseline

- Every control has a name; every icon-only control has `aria-label`; decorative graphics are
  `aria-hidden`.
- Keyboard: Tab reaches every control in visual order; composite widgets (tabs, menus, listboxes,
  grids) use arrow keys with one tab stop; Escape closes overlays.
- Contrast: text 4.5:1, control edges and the ring 3:1, in all six combinations.
- Live changes that matter (validation, counts, toasts) are announced through one `role="status"`
  or `aria-live="polite"` region, without moving focus.

## 16. Definition of done

A new or changed component ships only when every line holds.

- [ ] Sizes from `h-control-*` / `px-control-pad` / `text-control`; no fixed control sizes.
- [ ] Focus is the one ring (section 4); no halo, no edge change, nothing hidden by overflow.
- [ ] States match the table in section 3, including disabled, invalid and loading.
- [ ] Only token colours; no hex, `rgb()`, Tailwind palette or alpha on text.
- [ ] Only `shadow-sm`, `shadow-lg`, `shadow-xl`; only `rounded-*` steps.
- [ ] Only the Tailwind type scale; 12px minimum; sentence case.
- [ ] Heroicons v2 only (and mapped in `icons.map.json`); decorative icons hidden; icon-only controls named.
- [ ] Motion on duration and easing tokens; no `cubic-bezier` literals; reduced motion handled.
- [ ] Logical properties; no `px` widths.
- [ ] Looks right in all six preset × theme combinations at 375px and 1440px.
- [ ] `node scripts/tokens.mjs check --usage` and the docs tests pass; axe reports nothing
  serious or critical on its docs page.

## Appendix: where the registry breaks the bible today

Measured on 2026-11-08 across `components/ui`. Work top down; each line is one fix.

| Priority | Rule | Components | Fix |
|---|---|---|---|
| 1 | Focus (§4) | InputField, Textarea, Select, DatePicker, TimePickerClock, PhoneInput, AppFilterPanel, AppTable search, AppModal, ThemeToggle, AdvancedAppTable | Drop `focus:ring-*` halos and `focus:border-*`; frames take the ring through `focus-within` at `-1px`; move the global rule into `tokens.css` |
| 2 | Navigation surfaces (§12, §13) | AppDock | Replace the fixed `--dock-*` hex chrome and its teal accent with `surface-raised`, `border`, `text`, `accent`, `danger`; `shadow-lg` |
| 3 | Mockups (§13) | AppNotificationPreview | Keep the OS look inside the screen; move frame, caption, warning and default wallpaper onto tokens and the type scale |
| 4 | Materials (§13) | RibbonField, AppLiquidGlass | Default colours from `accent` and the surfaces instead of hex |
| 5 | Motion (§10) | AdvancedAppTable (overshoot `cubic-bezier(0.22, 1.12, 0.36, 1)`), AppNavbar (8 curves), AppLiquidGlass, AppNotificationPreview | Use `ease-standard` / `ease-exit` and the duration tokens |
| 6 | Shape and type (§6, §8) | AdvancedAppTable (12 raw radii, 13 raw sizes), AppNotificationPreview frame, AppButton (6 raw sizes), AppToast, AppTooltip | `rounded-*` steps and the Tailwind scale |
| 7 | Elevation (§5) | AppDock (12), AppTable (11), AdvancedAppTable, AppNavbar, AppFilterPanel | Only `shadow-sm` / `shadow-lg` / `shadow-xl` |
| 8 | Icons (§9) | Solar, MDI, Phosphor and Heroicons solid uses in components; the docs site chrome uses Solar | Heroicons v2 throughout (`heroicons--*`, solid for active states) |

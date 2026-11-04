# Motion plans (Phase 3b)

From an `improve-animations` audit of `components/` at commit `a4de2de`, against DESIGN.md's
motion tokens. Each plan is self-contained; run them in this order.

| # | Plan | Severity | Depends on | Status |
|---|---|---|---|---|
| 001 | [Exits use the ease-out curve](001-exit-easing-ease-out.md) | HIGH | — | DONE |
| 002 | [Durations come from the motion tokens](002-durations-from-tokens.md) | HIGH | 001 | DONE |
| 006 | [motion-v transform strings](006-motion-v-transform-strings.md) | MEDIUM | — | REVERTED: flashes in motion-v 1.6.1 |
| 003 | [Respect prefers-reduced-motion](003-reduced-motion.md) | MEDIUM | 002, 006 | DONE |
| 004 | [No transition-all](004-no-transition-all.md) | MEDIUM | 001, 002 | DONE |
| 005 | [AppTable entrance and springs](005-apptable-entrance-and-springs.md) | MEDIUM | 006 | DONE |
| 007 | [Tooltip and date picker origin](007-tooltip-datepicker-origin.md) | LOW | — | DONE |

Why this order: 001 and 002 rewrite the same `<Transition>` class strings, so they go first and
together. 006 changes the motion-v states that 003 then branches on. 004 and 005 touch strings the
earlier plans already settled.

Not planned yet (additive, from the audit's missed opportunities):

- Tooltips in a toolbar: after the first opens, later ones should appear without delay or animation.
- AppCheckbox: the tick snaps in; a 120ms scale from 0.9 with `ease-standard` would show the change.

Every plan's feel check runs in vuetail-docs, which renders these components from source
(`pnpm dev` with `../vuetail-components` checked out beside it).

import { ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

/**
 * Arrow-key navigation through a set of items: tabs, radio-style segmented controls, toolbars,
 * menus, listboxes. Implements the WAI-ARIA keyboard pattern once: the arrows of the
 * orientation, Home and End, optional wrap and type-ahead, disabled items skipped.
 *
 * Two ways to use it:
 * - **Roving tabindex** (tabs, toolbars): pass `container`. The active item gets
 *   `tabindex="0"` (bind `tabindex(i)`), the rest `-1`, and moving focuses the item, so the
 *   group is one Tab stop.
 * - **Active descendant** (combobox, listbox with a text input): omit `container`. Focus stays in
 *   the input; bind `aria-activedescendant` to the active option's id and scroll it into view.
 */

export interface RovingFocusOptions {
  /** How many items there are. The index is pulled back when it shrinks. */
  count: MaybeRefOrGetter<number>;
  /** Which arrows move: left/right, up/down, or both. Default `'vertical'`. */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** Wrap from the last item to the first and back. Default true. */
  loop?: boolean;
  /** Items to skip (disabled options, separators). */
  disabled?: (index: number) => boolean;
  /** Turns on type-ahead: typing jumps to the next item whose label starts with the typed text. */
  label?: (index: number) => string;
  /** Starting index. Default 0. */
  initial?: number;
  /** Roving-tabindex mode: the element holding the items. Moving focuses the item. */
  container?: Ref<HTMLElement | null | undefined>;
  /** How items are found in `container`, in DOM order. Default: elements with an ARIA item role. */
  itemSelector?: string;
  /** Called after the index changes from a key (automatic tab activation, select on move). */
  onChange?: (index: number) => void;
}

const ITEM_ROLES = '[role="tab"],[role="radio"],[role="option"],[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"],[role="treeitem"],[role="gridcell"]';

const KEYS: Record<string, { axis: 'horizontal' | 'vertical'; step: 1 | -1 }> = {
  ArrowRight: { axis: 'horizontal', step: 1 },
  ArrowLeft: { axis: 'horizontal', step: -1 },
  ArrowDown: { axis: 'vertical', step: 1 },
  ArrowUp: { axis: 'vertical', step: -1 },
};

const TYPEAHEAD_RESET_MS = 500;

export function useRovingFocus(options: RovingFocusOptions) {
  const count = () => Math.max(0, toValue(options.count));
  const enabled = (i: number) => !options.disabled?.(i);
  const active: Ref<number> = ref(count() > 0 ? Math.min(options.initial ?? 0, count() - 1) : -1);

  // Synchronous, so a filtered list never points past its end for a render.
  watch(
    count,
    (n) => {
      if (n === 0) active.value = -1;
      else if (active.value >= n) active.value = n - 1;
      else if (active.value < 0) active.value = 0;
    },
    { flush: 'sync' },
  );

  const firstEnabled = (from: number, step: 1 | -1): number => {
    const n = count();
    for (let k = 0, i = from; k < n; k++, i += step) {
      if (i < 0 || i >= n) return -1;
      if (enabled(i)) return i;
    }
    return -1;
  };

  /** The next enabled index from `from` in direction `step`, or -1 at an end without loop. */
  const step = (from: number, dir: 1 | -1): number => {
    const n = count();
    for (let k = 1; k <= n; k++) {
      let i = from + dir * k;
      if (options.loop === false) {
        if (i < 0 || i >= n) return -1;
      } else {
        i = ((i % n) + n) % n;
      }
      if (enabled(i)) return i;
    }
    return -1;
  };

  const items = (): HTMLElement[] =>
    options.container?.value ? [...options.container.value.querySelectorAll<HTMLElement>(options.itemSelector ?? ITEM_ROLES)] : [];

  /** Make `index` active (and, in roving mode, focus it). */
  const set = (index: number, { focus = true } = {}) => {
    if (index < 0 || index >= count()) return;
    active.value = index;
    if (focus && options.container) items()[index]?.focus();
  };

  let typed = '';
  let typedAt = 0;
  const typeahead = (char: string): number => {
    const now = Date.now();
    typed = now - typedAt > TYPEAHEAD_RESET_MS ? char : typed + char;
    typedAt = now;
    const needle = typed.toLowerCase();
    const n = count();
    // A longer prefix may still match the current item; a single letter moves on to the next.
    const start = typed.length > 1 ? active.value : active.value + 1;
    for (let k = 0; k < n; k++) {
      const i = (((start + k) % n) + n) % n;
      if (enabled(i) && options.label!(i).toLowerCase().startsWith(needle)) return i;
    }
    return -1;
  };

  /** Bind on the container (or the combobox input). Returns whether it handled the key. */
  const onKeydown = (e: KeyboardEvent): boolean => {
    if (count() === 0 || e.altKey || e.ctrlKey || e.metaKey) return false;
    const orientation = options.orientation ?? 'vertical';
    const move = KEYS[e.key];
    let next = -1;

    if (move && (orientation === 'both' || orientation === move.axis)) {
      next = active.value < 0 ? firstEnabled(move.step === 1 ? 0 : count() - 1, move.step) : step(active.value, move.step);
    } else if (e.key === 'Home') {
      next = firstEnabled(0, 1);
    } else if (e.key === 'End') {
      next = firstEnabled(count() - 1, -1);
    } else if (options.label && e.key.length === 1 && e.key !== ' ') {
      next = typeahead(e.key);
    } else {
      return false;
    }

    if (next < 0) return false;
    e.preventDefault();
    if (next !== active.value) {
      set(next);
      options.onChange?.(next);
    } else if (options.container) {
      items()[next]?.focus();
    }
    return true;
  };

  return {
    /** The active index, -1 when there are no items. */
    active,
    onKeydown,
    set,
    /** Roving tabindex: 0 for the active item, -1 for the rest. */
    tabindex: (index: number) => (index === Math.max(active.value, 0) ? 0 : -1),
  };
}

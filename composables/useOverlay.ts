import { nextTick, onScopeDispose, toValue, unref, watch, type ComponentPublicInstance, type MaybeRefOrGetter, type Ref } from 'vue';

/**
 * Focus, scroll and Escape for anything that sits over the page: dialogs, sheets, lightboxes,
 * command palettes.
 *
 * Overlays form one app-wide stack. Only the top one traps Tab, pulls stray focus back and hears
 * Escape; the page scroll is locked once for the whole stack and restored when the last overlay
 * closes. Closing a nested overlay hands focus back into the one beneath it.
 */

export interface OverlayOptions {
  /** Where focus goes on open: the first focusable element (default), the panel itself, or yours. */
  initialFocus?: 'first' | 'panel' | (() => HTMLElement | null | undefined);
  /** Give focus back to whatever had it before opening. Default true. */
  returnFocus?: boolean;
  /** Lock page scroll while open. Default true. */
  lockScroll?: boolean;
  /** Called on Escape while this overlay is on top, unless something inside already handled it. */
  onEscape?: () => void;
}

type PanelRef = Ref<HTMLElement | ComponentPublicInstance | null | undefined>;

interface Entry {
  el: () => HTMLElement | null;
  options: OverlayOptions;
}

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Tabbable elements inside `root`, in DOM order, skipping hidden and inert ones. */
export const focusableIn = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !el.closest('[hidden], [inert], [aria-hidden="true"]') &&
      (typeof el.checkVisibility !== 'function' || el.checkVisibility()),
  );

const stack: Entry[] = [];
const top = () => stack[stack.length - 1];

let locks = 0;
let savedOverflow = '';

const lockScroll = () => {
  if (locks++ === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
};

const unlockScroll = () => {
  if (locks > 0 && --locks === 0) document.body.style.overflow = savedOverflow;
};

const focusInto = (el: HTMLElement, initial: OverlayOptions['initialFocus'] = 'first') => {
  const chosen = typeof initial === 'function' ? initial() : initial === 'panel' ? null : focusableIn(el)[0];
  const target = chosen ?? el;
  // A panel needs tabindex="-1" to take focus itself; give it one rather than lose focus.
  if (target === el && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  target.focus();
};

const onKeydown = (e: KeyboardEvent) => {
  const entry = top();
  const el = entry?.el();
  if (!entry || !el) return;

  if (e.key === 'Escape') {
    // A menu or select inside the dialog closes first; it marks the event handled.
    if (e.defaultPrevented || !entry.options.onEscape) return;
    e.preventDefault();
    entry.options.onEscape();
    return;
  }

  if (e.key !== 'Tab') return;
  const items = focusableIn(el);
  if (items.length === 0) {
    e.preventDefault();
    el.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const current = document.activeElement as HTMLElement | null;
  const inside = !!current && el.contains(current);
  if (e.shiftKey && (current === first || !inside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (current === last || !inside)) {
    e.preventDefault();
    first.focus();
  }
};

// A click on the page behind, or a script, can still move focus out: bring it back.
const onFocusIn = (e: FocusEvent) => {
  const entry = top();
  const el = entry?.el();
  const target = e.target as Node | null;
  if (!entry || !el || !target || el.contains(target)) return;
  focusInto(el, entry.options.initialFocus);
};

let listening = false;
const listen = () => {
  if (listening) return;
  listening = true;
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('focusin', onFocusIn);
};
const unlisten = () => {
  if (!listening) return;
  listening = false;
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('focusin', onFocusIn);
};

const resolve = (panel: PanelRef): HTMLElement | null => {
  const value = unref(panel);
  if (!value) return null;
  return value instanceof HTMLElement ? value : ((value as ComponentPublicInstance).$el as HTMLElement | null);
};

/**
 * ```ts
 * const panel = ref<HTMLElement | null>(null);
 * useOverlay(panel, () => props.open, { onEscape: () => emit('close') });
 * ```
 * `panel` may be an element or a component ref (its `$el` is used), and may only exist while open.
 */
export function useOverlay(panel: PanelRef, open: MaybeRefOrGetter<boolean>, options: OverlayOptions = {}) {
  let entry: Entry | null = null;
  let returnTo: HTMLElement | null = null;

  const activate = async () => {
    if (entry || typeof document === 'undefined') return;
    returnTo = document.activeElement as HTMLElement | null;
    const mine: Entry = { el: () => resolve(panel), options };
    entry = mine;
    stack.push(mine);
    listen();
    if (options.lockScroll !== false) lockScroll();
    // The panel usually renders in the same tick as `open` flips; focus once it exists.
    await nextTick();
    const el = mine.el();
    if (entry === mine && el && top() === mine) focusInto(el, options.initialFocus);
  };

  const deactivate = () => {
    if (!entry) return;
    const wasTop = top() === entry;
    stack.splice(stack.indexOf(entry), 1);
    entry = null;
    if (options.lockScroll !== false) unlockScroll();
    if (stack.length === 0) unlisten();
    if (options.returnFocus !== false && wasTop && returnTo?.isConnected) returnTo.focus();
    returnTo = null;
  };

  watch(
    () => toValue(open),
    (isOpen) => (isOpen ? void activate() : deactivate()),
    { immediate: true },
  );

  onScopeDispose(deactivate);

  return {
    /** Move focus into the panel again, e.g. after its content changed. */
    focus: () => {
      const el = resolve(panel);
      if (el) focusInto(el, options.initialFocus);
    },
  };
}

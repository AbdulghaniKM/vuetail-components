import { onMounted, onUnmounted, toValue, watch, type MaybeRefOrGetter } from 'vue';

type ShortcutHandler = (e: KeyboardEvent) => void | boolean;
type ShortcutMap = Record<string, ShortcutHandler>;

export interface KeyboardOptions {
  /**
   * Fire single-key shortcuts (`/`, `j`, `enter`) while focus is in a text field. Off by default:
   * the user is typing. Combos with ctrl, alt or meta, and Escape, always fire.
   */
  allowInInputs?: boolean;
  /** Fire again on auto-repeat while the key is held. On by default. */
  repeat?: boolean;
}

const MODIFIERS = ['control', 'meta', 'alt', 'shift'];

function normalizeKey(combo: string): string {
  return combo
    .toLowerCase()
    .split('+')
    .map((k) => k.trim())
    .map((k) => (k === 'esc' ? 'escape' : k === 'space' ? ' ' : k))
    .sort()
    .join('+');
}

const combo = (parts: string[]) => [...parts].sort().join('+');

/**
 * Every spelling a press can match. Shift turns `/` into `?`, so `shift+/` and `?` both mean the
 * same press; the unshifted key comes from `e.code` (`Slash`, `Digit1`). Letters keep their shift,
 * so `shift+a` and `a` stay different shortcuts.
 */
function candidates(e: KeyboardEvent): string[] {
  const mods: string[] = [];
  if (e.ctrlKey || e.metaKey) mods.push('ctrl');
  if (e.altKey) mods.push('alt');

  const key = e.key.toLowerCase();
  if (MODIFIERS.includes(key)) return [combo(mods)];
  if (!e.shiftKey) return [combo([...mods, key])];

  const out = [combo([...mods, 'shift', key])];
  const symbol = key.length === 1 && !/[a-z]/.test(key);
  if (symbol) {
    out.push(combo([...mods, key]));
    const base = codeToKey(e.code);
    if (base && base !== key) out.push(combo([...mods, 'shift', base]));
  }
  return out;
}

const CODE_KEYS: Record<string, string> = {
  Slash: '/', Backslash: '\\', Period: '.', Comma: ',', Semicolon: ';', Quote: "'",
  BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`',
};

const codeToKey = (code: string | undefined): string | null => {
  if (!code) return null;
  if (code.startsWith('Digit')) return code.slice(5);
  return CODE_KEYS[code] ?? null;
};

const isEditable = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  if (el.isContentEditable || el.closest('[contenteditable=""], [contenteditable="true"]')) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName !== 'INPUT') return false;
  const type = (el as HTMLInputElement).type;
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(type);
};

/**
 * Register keyboard shortcuts with automatic cleanup.
 *
 * Basic usage (always active while component is mounted):
 *   useKeyboard({ 'ctrl+k': () => openSearch() })
 *
 * Conditional usage (active only when `enabled` is true):
 *   useKeyboard({ 'escape': () => close(), 'enter': () => confirm() }, isOpen)
 *
 * `ctrl` matches Ctrl on Windows and Linux and ⌘ on macOS. A handler returns `true` to
 * prevent the browser's default.
 */
export function useKeyboard(shortcuts: ShortcutMap, enabled?: MaybeRefOrGetter<boolean>, options: KeyboardOptions = {}) {
  const normalizedMap = new Map<string, ShortcutHandler>();
  for (const [keys, handler] of Object.entries(shortcuts)) normalizedMap.set(normalizeKey(keys), handler);

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.repeat && options.repeat === false) return;

    const pressed = candidates(e);
    const hit = pressed.find((k) => normalizedMap.has(k));
    if (!hit) return;

    const modified = e.ctrlKey || e.metaKey || e.altKey;
    if (!options.allowInInputs && !modified && hit !== 'escape' && isEditable(e.target)) return;

    // Default: don't swallow the event (Enter-in-input inside modals stays intact).
    if (normalizedMap.get(hit)!(e) === true) e.preventDefault();
  };

  const bind = () => document.addEventListener('keydown', handleKeydown);
  const unbind = () => document.removeEventListener('keydown', handleKeydown);

  if (enabled !== undefined) {
    watch(
      () => toValue(enabled),
      (active) => (active ? bind() : unbind()),
      { immediate: true },
    );
  } else {
    onMounted(bind);
  }

  onUnmounted(unbind);

  return { bind, unbind };
}

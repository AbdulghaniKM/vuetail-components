import { getCurrentScope, onScopeDispose, ref } from 'vue';
import { useToast } from './useToast';

export interface ClipboardOptions {
  /** How long `copied` stays true, in ms. */
  resetAfter?: number;
  /** Message for `copy(text, true)`. */
  toastMessage?: string;
}

/**
 * `navigator.clipboard` needs a secure context (https or localhost), so plain-http previews and
 * some WebViews lack it. Selecting a hidden textarea and running the legacy copy command covers
 * those.
 */
const legacyCopy = (text: string): boolean => {
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  const focused = document.activeElement as HTMLElement | null;
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    focused?.focus?.();
  }
};

export const useClipboard = (options?: ClipboardOptions) => {
  const resetAfter = options?.resetAfter ?? 2000;
  const copied = ref(false);
  const hasApi = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;
  const isSupported = hasApi || (typeof document !== 'undefined' && typeof document.execCommand === 'function');

  let timer: ReturnType<typeof setTimeout> | null = null;
  if (getCurrentScope()) onScopeDispose(() => timer && clearTimeout(timer));

  const copy = async (text: string, showToast = false): Promise<boolean> => {
    let ok = false;
    if (hasApi) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = legacyCopy(text);
      }
    } else {
      ok = legacyCopy(text);
    }

    copied.value = ok;
    if (!ok) return false;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      copied.value = false;
    }, resetAfter);

    if (showToast) useToast().success(options?.toastMessage ?? 'Copied to clipboard');
    return true;
  };

  return { copy, copied, isSupported };
};

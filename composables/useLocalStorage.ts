import { getCurrentScope, onScopeDispose, ref, watch, type Ref } from 'vue';
import type { ZodType } from 'zod';

/**
 * A ref mirrored to `localStorage[key]` as JSON. With a schema, anything that does not parse
 * (an old shape, a value edited by hand) falls back to `defaultValue`. A change made in another
 * tab reaches this one through the `storage` event, checked against the same schema.
 */
export function useLocalStorage<T>(key: string, defaultValue: T, schema?: ZodType<T>): Ref<T> {
  const parse = (raw: string | null): T => {
    if (raw === null) return defaultValue;
    try {
      const parsed = JSON.parse(raw);
      if (!schema) return parsed as T;
      const result = schema.safeParse(parsed);
      return result.success ? result.data : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const read = (): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      return parse(localStorage.getItem(key));
    } catch {
      return defaultValue;
    }
  };

  const data = ref<T>(read()) as Ref<T>;
  // Set while applying another tab's value, so it is not written straight back.
  let syncing = false;

  watch(
    data,
    (value) => {
      if (syncing) return;
      try {
        if (value === null || value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage full or unavailable
      }
    },
    { deep: true, flush: 'sync' },
  );

  if (typeof window !== 'undefined') {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      // `key === null` is localStorage.clear() in the other tab.
      if (event.key !== key && event.key !== null) return;
      syncing = true;
      data.value = parse(event.key === null ? null : event.newValue);
      syncing = false;
    };
    window.addEventListener('storage', onStorage);
    if (getCurrentScope()) onScopeDispose(() => window.removeEventListener('storage', onStorage));
  }

  return data;
}

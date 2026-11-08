import { getCurrentScope, onScopeDispose, ref, watch, type Ref } from 'vue';

export type DebouncedRef<T> = Readonly<Ref<T>> & {
  /** Apply the pending value now. */
  flush: () => void;
  /** Drop the pending value. */
  cancel: () => void;
};

/** Timers die with the component (or effect scope) that made them: no write after unmount. */
const disposeWith = (stop: () => void) => {
  if (getCurrentScope()) onScopeDispose(stop);
};

/**
 * Returns a debounced ref that updates `delay` ms after the source stops changing.
 */
export function useDebounce<T>(source: Ref<T>, delay = 300): DebouncedRef<T> {
  const debounced = ref(source.value) as Ref<T>;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { value: T } | null = null;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
  };

  const flush = () => {
    const next = pending;
    cancel();
    if (next) debounced.value = next.value;
  };

  watch(source, (val) => {
    if (timer) clearTimeout(timer);
    pending = { value: val };
    timer = setTimeout(flush, delay);
  });

  disposeWith(cancel);

  return Object.assign(debounced, { flush, cancel }) as DebouncedRef<T>;
}

/**
 * Returns a throttled ref that updates at most once every `interval` ms.
 */
export function useThrottle<T>(source: Ref<T>, interval = 300): Readonly<Ref<T>> {
  const throttled = ref(source.value) as Ref<T>;
  let lastUpdate = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  watch(source, (val) => {
    const now = Date.now();
    const remaining = interval - (now - lastUpdate);

    if (remaining <= 0) {
      throttled.value = val;
      lastUpdate = now;
    } else {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        throttled.value = val;
        lastUpdate = Date.now();
      }, remaining);
    }
  });

  disposeWith(() => {
    if (timer) clearTimeout(timer);
  });

  return throttled;
}

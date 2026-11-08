import { ref, watch, nextTick, onScopeDispose, type Ref } from 'vue';

export interface InfiniteScrollContext {
  /** Aborted when `reset()` runs or the owner unmounts, so a fetch can cancel its request. */
  signal: AbortSignal;
}

export interface UseInfiniteScrollOptions<T> {
  /** Fetch function — receives the page number (1-based), returns an array of items */
  fetch: (page: number, context: InfiniteScrollContext) => Promise<T[]>;
  /** Number of items per page (used to detect "no more data") */
  pageSize?: number;
  /** Pixel threshold before the bottom to trigger the next fetch */
  threshold?: number;
  /** Measure against the window instead of `containerRef`, for a list the page itself scrolls. */
  window?: boolean;
}

export function useInfiniteScroll<T>(options: UseInfiniteScrollOptions<T>) {
  const { fetch, pageSize = 20, threshold = 200 } = options;

  const items: Ref<T[]> = ref([]) as Ref<T[]>;
  const loading = ref(false);
  const done = ref(false);
  const error = ref<string | null>(null);
  /** The list. With `window: false` (the default) it is also the scroller. */
  const containerRef = ref<HTMLElement | null>(null);
  /** Optional: an element the template places after the items. Without one, a 1px div is added. */
  const sentinelRef = ref<HTMLElement | null>(null);

  let lastPage = 0;
  // Bumped by reset() and unmount, so a fetch that lands afterwards is dropped instead of
  // appended to the new list (and the page counter is not left one ahead or behind).
  let generation = 0;
  let controller: AbortController | null = null;
  let observer: IntersectionObserver | null = null;
  let ownSentinel: HTMLElement | null = null;
  let watched: HTMLElement | null = null;

  /**
   * An observer reports on observe() and then only when the answer changes. A page too short
   * to push the sentinel out of view changes nothing, so the list would stall with room left
   * on screen. Re-observing asks again.
   */
  const recheck = () => {
    if (!observer || !watched) return;
    observer.unobserve(watched);
    observer.observe(watched);
  };

  const loadMore = async (): Promise<void> => {
    if (loading.value || done.value) return;

    const mine = generation;
    const page = lastPage + 1;
    controller = new AbortController();
    loading.value = true;
    error.value = null;

    try {
      const result = await fetch(page, { signal: controller.signal });
      if (mine !== generation) return;
      items.value = [...items.value, ...result] as T[];
      lastPage = page;
      if (result.length < pageSize) done.value = true;
    } catch (e) {
      if (mine !== generation) return;
      error.value = (e as { message?: string })?.message || 'Failed to load more items';
    } finally {
      if (mine === generation) loading.value = false;
    }

    if (mine !== generation || done.value || error.value) return;
    await nextTick();
    // Vue renders the new items where its own anchors are; the added sentinel has to stay last.
    if (ownSentinel && containerRef.value && containerRef.value.lastElementChild !== ownSentinel) {
      containerRef.value.appendChild(ownSentinel);
    }
    recheck();
  };

  const cancel = () => {
    generation++;
    controller?.abort();
    controller = null;
    loading.value = false;
  };

  const teardown = () => {
    observer?.disconnect();
    observer = null;
    ownSentinel?.remove();
    ownSentinel = null;
    watched = null;
  };

  const reset = () => {
    cancel();
    items.value = [];
    lastPage = 0;
    done.value = false;
    error.value = null;
    void loadMore();
  };

  const observe = (container: HTMLElement, sentinel: HTMLElement | null) => {
    teardown();

    if (!sentinel) {
      ownSentinel = document.createElement('div');
      ownSentinel.style.height = '1px';
      ownSentinel.setAttribute('aria-hidden', 'true');
      container.appendChild(ownSentinel);
    }
    watched = sentinel ?? ownSentinel;

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { root: options.window ? null : container, rootMargin: `0px 0px ${threshold}px 0px` },
    );

    observer.observe(watched!);
    // A list always needs its first page, in view or not; later pages wait for the sentinel.
    if (lastPage === 0) void loadMore();
  };

  // `flush: 'post'` so both template refs are attached before anything is observed.
  watch(
    [containerRef, sentinelRef],
    ([container, sentinel]) => {
      if (!container) return teardown();
      observe(container, sentinel);
    },
    { immediate: true, flush: 'post' },
  );

  onScopeDispose(() => {
    cancel();
    teardown();
  });

  return { items, loading, done, error, containerRef, sentinelRef, reset, loadMore };
}

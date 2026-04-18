import { ref, watch, onUnmounted, type Ref } from 'vue';

interface UseInfiniteScrollOptions<T> {
  /** Fetch function — receives the page number (1-based), returns an array of items */
  fetch: (page: number) => Promise<T[]>;
  /** Number of items per page (used to detect "no more data") */
  pageSize?: number;
  /** Pixel threshold before the bottom to trigger the next fetch */
  threshold?: number;
}

export function useInfiniteScroll<T>(options: UseInfiniteScrollOptions<T>) {
  const { fetch, pageSize = 20, threshold = 200 } = options;

  const items: Ref<T[]> = ref([]) as Ref<T[]>;
  const loading = ref(false);
  const done = ref(false);
  const error = ref<string | null>(null);
  const containerRef = ref<HTMLElement | null>(null);

  let currentPage = 0;
  let observer: IntersectionObserver | null = null;
  let sentinel: HTMLElement | null = null;

  const loadMore = async () => {
    if (loading.value || done.value) return;

    loading.value = true;
    error.value = null;

    try {
      currentPage++;
      const result = await fetch(currentPage);
      items.value = [...items.value, ...result] as T[];

      if (result.length < pageSize) {
        done.value = true;
      }
    } catch (e) {
      error.value = (e as { message?: string })?.message || 'Failed to load more items';
      currentPage--;
    } finally {
      loading.value = false;
    }
  };

  const teardown = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (sentinel) {
      sentinel.remove();
      sentinel = null;
    }
  };

  const reset = () => {
    items.value = [];
    currentPage = 0;
    done.value = false;
    error.value = null;
    loadMore();
  };

  const observe = (el: HTMLElement) => {
    teardown();

    sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    el.appendChild(sentinel);

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: el, rootMargin: `0px 0px ${threshold}px 0px` },
    );

    observer.observe(sentinel);
  };

  // React to containerRef being attached by the consumer's template.
  // `flush: 'post'` ensures the DOM node is mounted before we observe.
  watch(
    containerRef,
    (el) => {
      teardown();
      if (!el) return;
      observe(el);
      loadMore();
    },
    { immediate: true, flush: 'post' },
  );

  onUnmounted(teardown);

  return { items, loading, done, error, containerRef, reset, loadMore };
}

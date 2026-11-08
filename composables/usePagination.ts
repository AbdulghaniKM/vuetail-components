import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

export interface UsePaginationOptions {
  /** Total number of items. A getter (`() => rows.value.length`) follows a filtered list. */
  total: MaybeRefOrGetter<number>;
  /** Items per page. Changing it goes back to page 1. */
  pageSize?: MaybeRefOrGetter<number>;
  /** Initial page (1-based), clamped to the pages that exist. */
  initialPage?: number;
  /** Max visible page buttons */
  maxVisiblePages?: MaybeRefOrGetter<number>;
}

export function usePagination(options: UsePaginationOptions) {
  const totalRef = computed(() => Math.max(0, toValue(options.total)));
  const pageSizeRef = computed(() => Math.max(1, toValue(options.pageSize ?? 10)));
  const maxVisible = computed(() => Math.max(1, toValue(options.maxVisiblePages ?? 5)));

  const totalPages = computed(() => Math.max(1, Math.ceil(totalRef.value / pageSizeRef.value)));

  const clamp = (p: number) => Math.max(1, Math.min(Math.trunc(p) || 1, totalPages.value));

  const page = ref(clamp(options.initialPage ?? 1));

  // Synchronous, so no render ever sees page 5 of 2 and an empty slice: filtering a list
  // down shrinks `total` under the current page all the time.
  watch(totalPages, () => (page.value = clamp(page.value)), { flush: 'sync' });
  // A new page size reshuffles every page, so "page 4" would show unrelated rows.
  watch(pageSizeRef, () => (page.value = 1), { flush: 'sync' });

  const startIndex = computed(() => (page.value - 1) * pageSizeRef.value);
  const endIndex = computed(() => Math.min(startIndex.value + pageSizeRef.value, totalRef.value));

  const isFirst = computed(() => page.value <= 1);
  const isLast = computed(() => page.value >= totalPages.value);

  const range = computed(() => ({
    start: totalRef.value === 0 ? 0 : startIndex.value + 1,
    end: endIndex.value,
    total: totalRef.value,
  }));

  /** Visible page numbers for a pagination bar, centred on the current page. */
  const visiblePages = computed(() => {
    const pages: number[] = [];
    const total = totalPages.value;
    const max = maxVisible.value;
    let start = Math.max(1, page.value - Math.floor(max / 2));
    const end = Math.min(total, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  const goTo = (p: number) => {
    page.value = clamp(p);
  };

  const next = () => {
    if (!isLast.value) page.value++;
  };

  const prev = () => {
    if (!isFirst.value) page.value--;
  };

  const first = () => {
    page.value = 1;
  };

  const last = () => {
    page.value = totalPages.value;
  };

  /** Slice an array according to the current page */
  function paginate<T>(items: readonly T[]): T[] {
    return items.slice(startIndex.value, endIndex.value);
  }

  return {
    page,
    pageSize: pageSizeRef,
    totalPages,
    startIndex,
    endIndex,
    isFirst,
    isLast,
    range,
    visiblePages,
    goTo,
    next,
    prev,
    first,
    last,
    paginate,
  };
}

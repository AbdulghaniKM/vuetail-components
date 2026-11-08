import { computed, type ComputedRef } from 'vue';
import { useMediaQuery } from '@vueuse/core';

/** Tailwind's breakpoints, in px. */
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

// One set of media queries for the whole app, made on first use: a list of 200 rows that each
// call useBreakpoint() would otherwise hold 1000 matchMedia listeners.
let shared: ReturnType<typeof create> | null = null;

const create = () => {
  const at = Object.fromEntries(
    (Object.keys(BREAKPOINTS) as Breakpoint[]).map((bp) => [bp, useMediaQuery(`(min-width: ${BREAKPOINTS[bp]}px)`)]),
  ) as unknown as Record<Breakpoint, ComputedRef<boolean>>;

  const current = computed<Breakpoint | 'xs'>(() => {
    if (at['2xl'].value) return '2xl';
    if (at.xl.value) return 'xl';
    if (at.lg.value) return 'lg';
    if (at.md.value) return 'md';
    if (at.sm.value) return 'sm';
    return 'xs';
  });

  const below = Object.fromEntries(
    (Object.keys(BREAKPOINTS) as Breakpoint[]).map((bp) => [bp, computed(() => !at[bp].value)]),
  ) as unknown as Record<Breakpoint, ComputedRef<boolean>>;

  return {
    current,
    isMobile: computed(() => !at.md.value),
    isTablet: computed(() => at.md.value && !at.lg.value),
    isDesktop: computed(() => at.lg.value),
    /** Viewport is at least this wide (`min-width`), like Tailwind's `md:`. */
    atLeast: (bp: Breakpoint) => at[bp],
    /** Viewport is narrower than this breakpoint, like Tailwind's `max-md:`. */
    smallerThan: (bp: Breakpoint) => below[bp],
    breakpoints: BREAKPOINTS,
  };
};

export const useBreakpoint = () => {
  shared ??= create();
  return {
    ...shared,
    /** @deprecated Same as `atLeast`: a `min-width` query, so the breakpoint itself counts. */
    greaterThan: shared.atLeast,
  };
};

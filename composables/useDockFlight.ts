import { watch, type Ref } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import type { DockPosition } from './useDockPosition';

export const FLIGHT_MS = 420;

const FALLBACK_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Samples an under-damped spring into a CSS `linear()` easing, so the dock
 * settles with a real overshoot instead of a generic ease-out. Browsers without
 * `linear()` fall back to a bezier that approximates the same arrival.
 */
function springEasing(durationMs: number, stiffness = 220, damping = 22): string {
  const angularFrequency = Math.sqrt(stiffness);
  const dampingRatio = damping / (2 * angularFrequency);
  if (dampingRatio >= 1) return FALLBACK_EASING;

  const dampedFrequency = angularFrequency * Math.sqrt(1 - dampingRatio ** 2);
  const sampleCount = 24;
  const samples = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const seconds = (index / sampleCount) * (durationMs / 1000);
    const envelope = Math.exp(-dampingRatio * angularFrequency * seconds);
    const oscillation =
      Math.cos(dampedFrequency * seconds) +
      ((dampingRatio * angularFrequency) / dampedFrequency) * Math.sin(dampedFrequency * seconds);
    return (1 - envelope * oscillation).toFixed(4);
  });

  return `linear(${samples.join(',')})`;
}

function supportsLinearEasing(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  return CSS.supports('transition-timing-function', 'linear(0, 1)');
}

let cachedEasing: string | null = null;

function flightEasing(): string {
  cachedEasing ??= supportsLinearEasing() ? springEasing(FLIGHT_MS) : FALLBACK_EASING;
  return cachedEasing;
}

/**
 * Animates `element` from a visual displacement back to its laid-out position.
 * Distances are measured from the DOM, so they are unavoidably in pixels.
 */
export function flyHome(element: HTMLElement, deltaX: number, deltaY: number, liftScale = 1): void {
  if (Math.hypot(deltaX, deltaY) < 1) return;
  element.animate(
    [
      { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${liftScale})` },
      { transform: 'translate3d(0, 0, 0) scale(1)' },
    ],
    { duration: FLIGHT_MS, easing: flightEasing() },
  );
}

/**
 * FLIPs the dock whenever it changes edge — from a drag, a grip click, or a
 * settings menu alike. The pre-flush pass reads the old box while the DOM is
 * still untouched; the post-flush pass reads the new one and animates the gap.
 *
 * ```ts
 * useDockFlight(barRef, position, takeLiftScale);
 * ```
 */
export function useDockFlight(
  barRef: Ref<HTMLElement | null>,
  position: Ref<DockPosition>,
  /** Scale the bar was wearing when it left, so a lifted drag lands seamlessly. */
  takeLiftScale: () => number = () => 1,
): void {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  let boxBeforeMove: DOMRect | null = null;

  watch(
    position,
    () => {
      boxBeforeMove = barRef.value?.getBoundingClientRect() ?? null;
    },
    { flush: 'pre' },
  );

  watch(
    position,
    () => {
      const from = boxBeforeMove;
      boxBeforeMove = null;
      const lift = takeLiftScale();
      const element = barRef.value;
      if (!element || !from || prefersReducedMotion.value) return;

      // Compare centres, not edges: a scaled box grows about its centre, so only
      // the centre delta is independent of the lift the bar was carrying.
      const to = element.getBoundingClientRect();
      const deltaX = from.left + from.width / 2 - (to.left + to.width / 2);
      const deltaY = from.top + from.height / 2 - (to.top + to.height / 2);
      flyHome(element, deltaX, deltaY, lift);
    },
    { flush: 'post' },
  );
}

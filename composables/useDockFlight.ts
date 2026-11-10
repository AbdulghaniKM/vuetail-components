import { watch, type Ref } from 'vue';
import { useMotionTokens } from './useMotionTokens';
import { useReducedMotion } from './useReducedMotion';
import type { DockPosition } from './useDockPosition';

/**
 * Flights run on the motion tokens like every other movement (bible §10): `--vt-duration-enter`
 * and `--vt-ease`, read live so the preset and reduced motion reach them. No spring: it
 * overshot, and the bible allows no overshoot.
 */
const FALLBACK_EASING = 'ease-out';

/** The flight duration in milliseconds, from `--vt-duration-enter`. */
export const flightDuration = (): number => useMotionTokens().enter().duration * 1000;

const flightEasing = (): string => {
  if (typeof document === 'undefined') return FALLBACK_EASING;
  return getComputedStyle(document.documentElement).getPropertyValue('--vt-ease').trim() || FALLBACK_EASING;
};

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
    { duration: flightDuration(), easing: flightEasing() },
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
  const prefersReducedMotion = useReducedMotion();
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

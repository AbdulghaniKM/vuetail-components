import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { BlobShape } from '@/components/ui/AppBlob.vue';
import { useBlob, type BlobSpring, type UseBlob } from '@/composables/useBlob';

/**
 * The sliding indicator of a segmented control or a tab list, as two blob shapes. Each item in
 * `container` carries `data-indicator="<key>"`; the one whose key is `activeKey` is measured
 * (relative to the container, in physical px, so RTL needs nothing extra). The head moves first
 * and the tail follows, so in one AppBlob the pill stretches from the old item to the new one and
 * then contracts onto it. Under reduced motion both jump.
 *
 * ```vue
 * const { canvas, shapes } = useIndicator(list, active);
 * <AppBlob v-bind="canvas" :shapes="shapes" fill="var(--color-surface-raised)" class="absolute inset-0" />
 * ```
 */

export interface IndicatorBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseIndicatorOptions {
  /** Shrink the measured box by this much on every side (a pill inside a padded track). */
  inset?: number;
  /** The blob numbers to share; defaults to a new `useBlob()`. */
  blob?: UseBlob;
  /** True while the move follows the pointer (hover): a short tween, no spring, no stretch. */
  quick?: Ref<boolean>;
}

export interface UseIndicator {
  /** Canvas size for AppBlob: the container's box. */
  canvas: ComputedRef<{ width: number; height: number }>;
  /** Head and tail, for AppBlob's `shapes`. Empty until the active item is measured. */
  shapes: ComputedRef<BlobShape[]>;
  /** The active item's box, for HTML laid over the blob. */
  box: Ref<IndicatorBox | null>;
  /** Measure again (after items are added or their text changes). */
  measure: () => void;
}

export function useIndicator(
  container: Ref<HTMLElement | null | undefined>,
  activeKey: Ref<string | number | null | undefined>,
  options: UseIndicatorOptions = {},
): UseIndicator {
  const { inset = 0 } = options;
  const blob = options.blob ?? useBlob();
  const size = ref({ width: 0, height: 0 });
  const box = ref<IndicatorBox | null>(null);

  const measure = () => {
    const root = container.value;
    if (!root || !root.isConnected) return;
    const outer = root.getBoundingClientRect();
    size.value = { width: Math.round(outer.width), height: Math.round(outer.height) };
    const key = activeKey.value;
    const item =
      key === null || key === undefined
        ? null
        : [...root.querySelectorAll<HTMLElement>('[data-indicator]')].find((el) => el.dataset.indicator === String(key));
    if (!item) {
      box.value = null;
      return;
    }
    const r = item.getBoundingClientRect();
    box.value = {
      x: r.left - outer.left + inset,
      y: r.top - outer.top + inset,
      width: Math.max(0, r.width - inset * 2),
      height: Math.max(0, r.height - inset * 2),
    };
  };

  let observer: ResizeObserver | null = null;
  const observe = (el: HTMLElement | null | undefined) => {
    observer?.disconnect();
    if (!el || typeof ResizeObserver === 'undefined') return;
    observer ??= new ResizeObserver(() => measure());
    observer.observe(el);
    el.querySelectorAll('[data-indicator]').forEach((item) => observer?.observe(item));
  };

  watch(activeKey, () => nextTick(measure));
  watch(container, (el) => {
    observe(el);
    nextTick(measure);
  });
  onMounted(() => {
    observe(container.value);
    measure();
    window.addEventListener('resize', measure);
  });
  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    window.removeEventListener('resize', measure);
  });

  // A selection change is a state change, not a toast opening: the full morph spring (500–600ms,
  // plus the tail's wait) left the pill creeping for most of a second after the label had changed,
  // which reads as a low frame rate. The head leads on 45% of the morph duration and the tail
  // follows a beat later on the same, so the whole move lands in about 300ms.
  const transitions = computed((): [BlobSpring | Record<string, unknown>, BlobSpring | Record<string, unknown>] => {
    if (options.quick?.value) {
      const q = blob.quick();
      return [q, q];
    }
    const s = blob.spring(true);
    if (!s.duration) return [s, s];
    const duration = s.duration * 0.45;
    return [
      { ...s, duration },
      { ...s, duration, delay: s.duration * 0.08 },
    ];
  });

  const shapes = computed<BlobShape[]>(() => {
    const b = box.value;
    if (!b) return [];
    const [head, tail] = transitions.value;
    const radius = Math.min(blob.roundness.value, b.height / 2, b.width / 2);
    return [
      { key: 'head', ...b, radius, transition: head },
      { key: 'tail', ...b, radius, transition: tail },
    ];
  });

  return { canvas: computed(() => size.value), shapes, box, measure };
}

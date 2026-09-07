import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import {
  useDockPosition,
  DOCK_POSITIONS,
  type DockPosition,
  type DockPositionApi,
} from './useDockPosition';
import { useKeyboard } from './useKeyboard';
import { flyHome } from './useDockFlight';

const DRAG_THRESHOLD = 4; // device px — pointer coords are px, not a styling value
const LIFT_SCALE = 1.04;

type Offset = { x: number; y: number };

// Module scope, like the shared position: the page layout outside a viewport
// dock has to reflow toward the edge being hovered, so this cannot be
// per-instance. A container-scoped dock opts out and keeps its own (see below).
const sharedOffset = ref<Offset | null>(null);
const sharedPreview = ref<DockPosition | null>(null);
const sharedIsDragging = computed(() => sharedOffset.value !== null);

/**
 * Read-only view of an in-flight drag on the viewport dock, for layout chrome
 * that has to preview the move without owning it.
 *
 * ```ts
 * const { isDragging, previewPosition } = useDockDragState();
 * ```
 */
export function useDockDragState() {
  return { isDragging: sharedIsDragging, previewPosition: sharedPreview };
}

export interface DockDragOptions {
  /** Where the edge is read and written. Defaults to the shared viewport singleton. */
  position?: DockPositionApi;
  /**
   * Element whose box defines the edges. Defaults to the viewport. Pass the
   * dock's containing block to scope a drag to it.
   */
  bounds?: Ref<HTMLElement | null>;
  /**
   * Keep drag state out of the module-scope singletons, so several docks can be
   * dragged independently. Set this whenever `bounds` is set.
   */
  local?: boolean;
  /** Edges the dock may land on. Defaults to all four. */
  edges?: readonly DockPosition[];
}

export interface DockDragApi {
  isDragging: ComputedRef<boolean>;
  previewPosition: Ref<DockPosition | null>;
  dragStyle: ComputedRef<{ transform: string; willChange: string } | undefined>;
  takeLiftScale: () => number;
  onGripPointerdown: (event: PointerEvent) => void;
  onGripPointermove: (event: PointerEvent) => void;
  onGripPointerup: (event: PointerEvent) => void;
  onGripPointercancel: () => void;
  onGripClick: () => void;
}

/**
 * Lifts the dock off its edge and lets it track the pointer, then hands the
 * landing to `useDockFlight`. Nothing re-docks mid-drag — the bar stays under
 * the cursor while the preview and the page layout show where it will settle.
 */
export function useDockDrag(
  barRef: Ref<HTMLElement | null>,
  options: DockDragOptions = {},
): DockDragApi {
  const { dockPosition, setDockPosition, cycleDockPosition } =
    options.position ?? useDockPosition();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const offset = options.local ? ref<Offset | null>(null) : sharedOffset;
  const previewPosition = options.local ? ref<DockPosition | null>(null) : sharedPreview;
  const isDragging = options.local ? computed(() => offset.value !== null) : sharedIsDragging;

  let grabPoint = { x: 0, y: 0 };
  let didDrag = false;
  let pendingLift = 1;

  /**
   * The box the edges are measured against — the bounding element when the dock
   * is scoped to one, the viewport otherwise. Returned in client coordinates so
   * pointer positions can be compared against it directly.
   */
  const edgeBox = () => {
    const element = options.bounds?.value;
    if (element) return element.getBoundingClientRect();
    return {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight,
    } as DOMRect;
  };

  const allowedEdges = () => {
    const edges = options.edges ?? DOCK_POSITIONS;
    return edges.length > 0 ? edges : DOCK_POSITIONS;
  };

  /**
   * Distances are normalised against the box's own width and height before they
   * are compared, so "nearest" means nearest as a fraction of the space
   * available on that axis. Comparing raw pixels would make the long edges of a
   * wide box unreachable — the top and bottom would win almost everywhere.
   */
  const nearestEdge = (x: number, y: number): DockPosition => {
    const box = edgeBox();
    if (box.width <= 0 || box.height <= 0) return dockPosition.value;

    const distance: Record<DockPosition, number> = {
      left: (x - box.left) / box.width,
      right: (box.right - x) / box.width,
      top: (y - box.top) / box.height,
      bottom: (box.bottom - y) / box.height,
    };

    const edges = allowedEdges();
    let best: DockPosition = edges[0];
    for (const edge of edges) {
      if (distance[edge] < distance[best]) best = edge;
    }
    return best;
  };

  /** Read once by the flight so a lifted landing starts at the size it left at. */
  const takeLiftScale = (): number => {
    const lift = pendingLift;
    pendingLift = 1;
    return lift;
  };

  /** Inline so the bar tracks the pointer every frame without a transition. */
  const dragStyle = computed(() =>
    offset.value
      ? {
          transform: `translate3d(${offset.value.x}px, ${offset.value.y}px, 0) scale(${LIFT_SCALE})`,
          willChange: 'transform',
        }
      : undefined,
  );

  /** Drops the lift and glides the bar back to wherever it is laid out now. */
  function releaseLift() {
    const element = barRef.value;
    const from = offset.value;
    offset.value = null;
    previewPosition.value = null;
    if (!element || !from || prefersReducedMotion.value) return;
    flyHome(element, from.x, from.y, LIFT_SCALE);
  }

  const cancelDrag = (): void => {
    if (!offset.value) return;
    releaseLift();
  };

  useKeyboard({ escape: cancelDrag }, isDragging);

  const onGripPointerdown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    grabPoint = { x: event.clientX, y: event.clientY };
    didDrag = false;
  };

  const onGripPointermove = (event: PointerEvent): void => {
    if (!(event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) return;
    const deltaX = event.clientX - grabPoint.x;
    const deltaY = event.clientY - grabPoint.y;
    if (!didDrag && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
    didDrag = true;
    offset.value = { x: deltaX, y: deltaY };
    previewPosition.value = nearestEdge(event.clientX, event.clientY);
  };

  const onGripPointerup = (event: PointerEvent): void => {
    const handle = event.currentTarget as HTMLElement;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    if (!didDrag) return;

    const target = previewPosition.value;
    if (target === null || target === dockPosition.value) {
      releaseLift();
      return;
    }

    // Commit while the lift is still applied: the flight watcher's pre-flush pass
    // measures the bar where the cursor left it, then glides it to the new edge.
    pendingLift = LIFT_SCALE;
    setDockPosition(target);
    offset.value = null;
    previewPosition.value = null;
  };

  const onGripClick = (): void => {
    if (didDrag) {
      didDrag = false;
      return;
    }
    cycleDockPosition(allowedEdges());
  };

  return {
    isDragging,
    previewPosition,
    dragStyle,
    takeLiftScale,
    onGripPointerdown,
    onGripPointermove,
    onGripPointerup,
    onGripPointercancel: cancelDrag,
    onGripClick,
  };
}

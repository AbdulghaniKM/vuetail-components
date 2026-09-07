import { ref, type Ref } from 'vue';

/** Screen edge the dock is pinned to. Physical, not logical — it does not flip under RTL. */
export type DockPosition = 'bottom' | 'left' | 'right' | 'top';

/**
 * Cycle order — around the screen rather than alphabetical, so clicking the grip
 * walks the dock somewhere predictable instead of hopping across it.
 */
export const DOCK_POSITIONS: readonly DockPosition[] = ['bottom', 'left', 'top', 'right'] as const;

const DEFAULT_KEY = 'app-dock-position';
const DEFAULT_POSITION: DockPosition = 'bottom';

export interface DockPositionApi {
  dockPosition: Ref<DockPosition>;
  dockPositions: readonly DockPosition[];
  setDockPosition: (value: DockPosition) => void;
  /** Walks to the next allowed edge, skipping any the caller has ruled out. */
  cycleDockPosition: (allowed?: readonly DockPosition[]) => void;
  resetDockPosition: () => void;
}

const isDockPosition = (v: string | null): v is DockPosition =>
  v !== null && (DOCK_POSITIONS as readonly string[]).includes(v);

const readStored = (key: string): DockPosition | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return isDockPosition(raw) ? raw : null;
  } catch {
    return null;
  }
};

const writeStored = (key: string, value: string | null): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode, quota, disabled storage — the preference is not worth throwing over */
  }
};

const makeApi = (position: Ref<DockPosition>, storageKey: string | null): DockPositionApi => {
  const setDockPosition = (value: DockPosition) => {
    position.value = value;
    // The default is written as a removal rather than a value, so an app that
    // later changes its default is not overridden by a stored copy of the old one.
    if (storageKey) writeStored(storageKey, value === DEFAULT_POSITION ? null : value);
  };

  const cycleDockPosition = (allowed: readonly DockPosition[] = DOCK_POSITIONS) => {
    const ring = DOCK_POSITIONS.filter((p) => allowed.includes(p));
    if (ring.length === 0) return;
    const at = ring.indexOf(position.value);
    setDockPosition(ring[(at + 1) % ring.length]);
  };

  return {
    dockPosition: position,
    dockPositions: DOCK_POSITIONS,
    setDockPosition,
    cycleDockPosition,
    resetDockPosition: () => setDockPosition(DEFAULT_POSITION),
  };
};

/**
 * One singleton per storage key. A dock pinned to the viewport shares its edge
 * with the page layout, which has to reserve space on the same side, so both
 * have to read one value — hence module scope rather than per-instance state.
 * The consequence: only one viewport dock per key may be mounted at a time.
 */
const shared = new Map<string, DockPositionApi>();

/**
 * The viewport dock's edge, persisted to `localStorage`.
 *
 * ```ts
 * const { dockPosition, setDockPosition, cycleDockPosition } = useDockPosition();
 * ```
 */
export const useDockPosition = (storageKey: string = DEFAULT_KEY): DockPositionApi => {
  let api = shared.get(storageKey);
  if (!api) {
    api = makeApi(ref(readStored(storageKey) ?? DEFAULT_POSITION), storageKey);
    shared.set(storageKey, api);
  }
  return api;
};

/**
 * An independent, unpersisted edge — for a dock scoped to a container rather
 * than the viewport. Several of these can coexist on one page, each minding its
 * own box, which a shared singleton cannot do.
 */
export const createDockPosition = (initial: DockPosition = DEFAULT_POSITION): DockPositionApi =>
  makeApi(ref(initial), null);

import { computed, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';

/**
 * App-wide list display preferences, shared by every AdvancedAppTable on the page.
 *
 * Two knobs live here — how records are drawn (`table` rows vs record `cards`) and how
 * tightly they're packed (`relaxed` vs `compact`). Both are module-level refs, so a
 * change in one table's display menu retunes every list in the app at once, and both
 * are mirrored onto `<html>` as `data-view` / `data-density` so app-level CSS can react
 * without a single component knowing about it.
 *
 * Hidden columns are per-table instead: keyed by the table's `id`, kept in one storage
 * key so clearing preferences is one removal however many tables the app grows.
 */

export type TableView = 'table' | 'cards';
export type TableDensity = 'relaxed' | 'compact';

export const TABLE_VIEWS = ['table', 'cards'] as const satisfies readonly TableView[];
export const TABLE_DENSITIES = ['relaxed', 'compact'] as const satisfies readonly TableDensity[];

export const DEFAULT_TABLE_VIEW: TableView = 'table';
export const DEFAULT_TABLE_DENSITY: TableDensity = 'relaxed';

const VIEW_KEY = 'app-table-view';
const DENSITY_KEY = 'app-table-density';
const HIDDEN_KEY = 'app-table-hidden-columns';

const isView = (v: string | null): v is TableView =>
  v !== null && (TABLE_VIEWS as readonly string[]).includes(v);
const isDensity = (v: string | null): v is TableDensity =>
  v !== null && (TABLE_DENSITIES as readonly string[]).includes(v);

const readStored = (key: string): string | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
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
    /* private mode, quota — the preference just doesn't survive the session */
  }
};

const applyAttr = (attr: string, value: string): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute(attr, value);
};

// ── Global display state ──────────────────────────────────────────────────────

const storedView = readStored(VIEW_KEY);
const storedDensity = readStored(DENSITY_KEY);

const view: Ref<TableView> = ref(isView(storedView) ? storedView : DEFAULT_TABLE_VIEW);
const density: Ref<TableDensity> = ref(
  isDensity(storedDensity) ? storedDensity : DEFAULT_TABLE_DENSITY,
);

applyAttr('data-view', view.value);
applyAttr('data-density', density.value);

// The default is stored as "absent" so a reset is one removal, not a written-out default.
watch(view, (v) => {
  applyAttr('data-view', v);
  writeStored(VIEW_KEY, v === DEFAULT_TABLE_VIEW ? null : v);
});

watch(density, (v) => {
  applyAttr('data-density', v);
  writeStored(DENSITY_KEY, v === DEFAULT_TABLE_DENSITY ? null : v);
});

export const useTableDisplay = () => {
  const setView = (value: TableView) => {
    view.value = value;
  };
  const setDensity = (value: TableDensity) => {
    density.value = value;
  };
  const reset = () => {
    view.value = DEFAULT_TABLE_VIEW;
    density.value = DEFAULT_TABLE_DENSITY;
  };

  return {
    view,
    density,
    views: TABLE_VIEWS,
    densities: TABLE_DENSITIES,
    setView,
    setDensity,
    reset,
  };
};

// ── Per-table hidden columns ──────────────────────────────────────────────────

const readHidden = (): Record<string, string[]> => {
  const raw = readStored(HIDDEN_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].every((v) => typeof v === 'string'),
      ),
    );
  } catch {
    return {};
  }
};

const hiddenColumns = ref<Record<string, string[]>>(readHidden());

watch(
  hiddenColumns,
  (map) => {
    const entries = Object.entries(map).filter(([, list]) => list.length > 0);
    writeStored(HIDDEN_KEY, entries.length > 0 ? JSON.stringify(Object.fromEntries(entries)) : null);
  },
  { deep: true },
);

export interface UseHiddenColumns {
  /** Column keys currently hidden for this table. */
  hidden: ComputedRef<string[]>;
  isHidden: (key: string) => boolean;
  toggle: (key: string) => void;
  hide: (key: string) => void;
  show: (key: string) => void;
  showAll: () => void;
  /** Replace the whole list — used to seed `defaultHidden` columns on first mount. */
  set: (keys: string[]) => void;
  /** Whether this table has ever been touched, so defaults only seed once. */
  isSeeded: ComputedRef<boolean>;
}

/**
 * Which columns a table hides, by column `key`. Every table needs a unique, stable id:
 * two tables sharing one share their column preferences.
 */
export const useHiddenColumns = (tableId: MaybeRefOrGetter<string>): UseHiddenColumns => {
  const id = computed(() => toValue(tableId));
  const hidden = computed(() => hiddenColumns.value[id.value] ?? []);

  const set = (keys: string[]) => {
    hiddenColumns.value = { ...hiddenColumns.value, [id.value]: keys };
  };

  return {
    hidden,
    isHidden: (key: string) => hidden.value.includes(key),
    toggle: (key: string) =>
      set(hidden.value.includes(key) ? hidden.value.filter((k) => k !== key) : [...hidden.value, key]),
    hide: (key: string) => {
      if (!hidden.value.includes(key)) set([...hidden.value, key]);
    },
    show: (key: string) => set(hidden.value.filter((k) => k !== key)),
    showAll: () => set([]),
    set,
    isSeeded: computed(() => id.value in hiddenColumns.value),
  };
};

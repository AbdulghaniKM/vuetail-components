<template>
  <div class="advanced-table w-full" :data-view="activeView" :data-density="activeDensity">
    <!-- Toolbar -->
    <div v-if="hasToolbar" class="mb-3 flex w-full min-w-0 flex-wrap items-center gap-2">
      <slot name="toolbar-start" />

      <div v-if="searchable" class="relative min-w-0 flex-1 sm:max-w-sm">
        <AppIcon
          name="icon-[heroicons-outline--magnifying-glass]"
          :size="1.125"
          class="at-muted-fg pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
        />
        <input
          ref="searchInputRef"
          :value="inputValue"
          type="text"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
          class="at-search w-full rounded-xl border border-border bg-surface py-2 pe-9 ps-9 text-sm text-text transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          @input="onSearchInput"
        />
        <button
          v-if="inputValue"
          type="button"
          class="at-muted-fg absolute end-2.5 top-1/2 -translate-y-1/2 transition-colors hover:text-text"
          aria-label="Clear search"
          @click="clearSearch"
        >
          <AppIcon name="icon-[heroicons-outline--x-mark]" :size="1" />
        </button>
      </div>

      <slot name="toolbar-end" />

      <AppButton
        v-if="exportable"
        :label="exportLabel"
        icon="icon-[heroicons-outline--arrow-down-tray]"
        variant="outline"
        size="sm"
        :loading="isExporting"
        :disabled="totalRows === 0"
        @click="exportCsv"
      />

      <span
        v-if="showCount && !loading"
        class="at-muted-fg ms-auto whitespace-nowrap font-mono text-xs tracking-wide"
      >
        {{ totalRows.toLocaleString() }} {{ countLabel }}
      </span>
    </div>

    <!-- Display menu — layout, density and columns in one control -->
    <div v-if="showDisplayMenu" class="mb-2 flex items-center justify-end gap-2">
      <slot name="surface-bar" />
      <AppPopover
        placement="bottom-end"
        :close-on-content-click="false"
        panel-class="w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
      >
        <template #trigger="{ toggle, isOpen }">
          <button
            type="button"
            class="at-chrome-trigger"
            :class="{ 'is-open': isOpen }"
            aria-haspopup="menu"
            :aria-expanded="isOpen"
            :title="displayMenuTitle"
            @click="toggle"
          >
            <AppIcon name="icon-[heroicons-outline--view-columns]" :size="1" />
            <span>{{
              hiddenCount > 0 ? `${visibleHideableCount}/${hideableColumns.length} ${columnsLabel}` : columnsLabel
            }}</span>
          </button>
        </template>

        <template #default>
          <template v-if="!view">
            <div class="at-menu-title">{{ layoutLabel }}</div>
            <button
              v-for="option in TABLE_VIEWS"
              :key="option"
              type="button"
              role="menuitemradio"
              :aria-checked="activeView === option"
              class="at-menu-item"
              :class="{ 'is-active': activeView === option }"
              @click="setView(option)"
            >
              <AppIcon :name="VIEW_ICONS[option]" :size="1" />
              {{ VIEW_LABELS[option] }}
            </button>
          </template>

          <template v-if="!density">
            <div class="at-menu-title">{{ densityLabel }}</div>
            <button
              v-for="option in TABLE_DENSITIES"
              :key="option"
              type="button"
              role="menuitemradio"
              :aria-checked="activeDensity === option"
              class="at-menu-item"
              :class="{ 'is-active': activeDensity === option }"
              @click="setDensity(option)"
            >
              <AppIcon :name="DENSITY_ICONS[option]" :size="1" />
              {{ DENSITY_LABELS[option] }}
            </button>
          </template>

          <template v-if="hideableColumns.length > 0">
            <div class="at-menu-title">{{ columnsLabel }}</div>
            <!-- Switch rows, not selected-row fills: hiding columns is a set of
                 independent on/off choices, not "pick one of these". -->
            <button
              v-for="col in hideableColumns"
              :key="col.key"
              type="button"
              role="menuitemcheckbox"
              :aria-checked="!isHidden(col.key)"
              class="at-menu-item at-switch-item"
              :class="{ 'is-on': !isHidden(col.key) }"
              :disabled="!isHidden(col.key) && visibleHideableCount === 1"
              @click="toggleColumn(col.key)"
            >
              <span class="at-switch-label">{{ col.label }}</span>
              <span class="at-switch" :data-on="!isHidden(col.key)" />
            </button>

            <button v-if="hiddenCount > 0" type="button" class="at-menu-item" @click="showAllColumns">
              <AppIcon name="icon-[heroicons-outline--check]" :size="1" class="text-accent" />
              {{ showAllLabel }}
            </button>
          </template>
        </template>
      </AppPopover>
    </div>

    <div class="at-surface">
      <!-- Background refetch: a sweep along the top edge, so stale rows stay
           readable underneath instead of flashing away. -->
      <span v-if="refreshing" class="at-sweep-track" aria-hidden="true"><span class="at-sweep" /></span>

      <!-- The table scrolls inside its own box rather than pushing the page down,
           so the header can pin and the pager stays put on a long list. -->
      <div ref="wrapRef" class="at-wrap" :class="{ 'is-plain': plainLastColumn || !hasActions }" :style="wrapStyle">
        <table class="at-table">
          <thead>
            <tr>
              <th v-if="selectable" scope="col" class="at-check">
                <AppCheckbox
                  :model-value="allOnPage"
                  :indeterminate="someOnPage && !allOnPage"
                  aria-label="Select all rows on this page"
                  @update:model-value="toggleAllOnPage"
                />
              </th>

              <th
                v-for="col in visibleColumns"
                :key="col.key"
                scope="col"
                :class="[alignClass(col), col.headerClass]"
                :style="col.width ? { width: col.width } : undefined"
              >
                <button
                  v-if="col.sortable"
                  type="button"
                  class="at-sort"
                  :data-on="sortedKey === sortFieldOf(col) || undefined"
                  :aria-label="sortAriaLabel(col)"
                  @click="cycleSort(col)"
                >
                  <span>{{ col.label }}</span>
                  <AppIcon :name="sortIcon(col)" :size="0.75" class="at-sort-icon" />
                </button>
                <slot v-else :name="`header-${col.key}`" :column="col">{{ col.label }}</slot>
              </th>

              <th v-if="hasActions" scope="col" class="at-actions-col">{{ actionsLabel }}</th>
            </tr>
          </thead>

          <tbody>
            <!-- First load: skeletons, so nothing jumps when the rows land -->
            <template v-if="loading">
              <tr v-for="n in skeletonRows" :key="`at-skeleton-${n}`" class="at-skeleton-row">
                <td v-for="c in columnCount" :key="c">
                  <span
                    class="at-skeleton"
                    :style="{ width: `${SKELETON_WIDTHS[(c - 1) % SKELETON_WIDTHS.length]}%` }"
                  />
                </td>
              </tr>
            </template>

            <tr v-else-if="pagedRows.length === 0">
              <td :colspan="columnCount" class="at-empty-cell">
                <slot name="empty">
                  <div class="at-empty">{{ emptyMessage }}</div>
                </slot>
              </td>
            </tr>

            <template v-else>
              <tr
                v-for="(row, index) in pagedRows"
                :key="rowKeyOf(row, index)"
                class="at-row"
                :class="[
                  { 'is-clickable': rowClickable, 'is-selected': selectable && isSelected(row, index) },
                  rowClass?.(row, index),
                ]"
                :title="rowClickable ? rowTitle : undefined"
                @click="onRowClick($event, row, index)"
              >
                <td v-if="selectable" class="at-check">
                  <AppCheckbox
                    :model-value="isSelected(row, index)"
                    :aria-label="`Select row ${index + 1}`"
                    @click="onSelectClick($event, row, index)"
                  />
                </td>

                <td
                  v-for="col in visibleColumns"
                  :key="col.key"
                  :class="[alignClass(col), cellClass(col), col.class]"
                  :title="col.title?.(row)"
                >
                  <span class="at-cell-label" aria-hidden="true">{{ col.label }}</span>
                  <span class="at-cell-body" :class="{ 'at-truncate': col.truncate }">
                    <slot
                      :name="`cell-${col.key}`"
                      :row="row"
                      :value="rawValue(col, row)"
                      :index="index"
                      :column="col"
                    >
                      <!-- Identity: avatar + name + secondary lines, tinted by a stable hue -->
                      <span
                        v-if="col.type === 'identity' && col.identity"
                        class="at-identity"
                        :class="hueClass(identityHue(col, row, index))"
                      >
                        <img
                          v-if="identityImage(col, row)"
                          class="at-avatar"
                          :src="identityImage(col, row)"
                          alt=""
                          loading="lazy"
                        />
                        <span v-else class="at-avatar is-placeholder">{{ initialOf(col, row) }}</span>
                        <span class="at-identity-main">
                          <span class="at-identity-title">{{ identityTitle(col, row) }}</span>
                          <span v-if="identitySubtitle(col, row)" class="at-identity-sub">
                            {{ identitySubtitle(col, row) }}
                            <button
                              v-if="col.copy"
                              type="button"
                              class="at-copy"
                              :class="{ 'is-ok': copiedCell === copyKeyOf(col, row, index) }"
                              :title="copiedCell === copyKeyOf(col, row, index) ? copiedLabel : copyLabel"
                              :aria-label="copyLabel"
                              @click.stop.prevent="copyCell(col, row, index)"
                            >
                              <AppIcon
                                :name="
                                  copiedCell === copyKeyOf(col, row, index)
                                    ? 'icon-[heroicons-outline--check]'
                                    : 'icon-[heroicons-outline--clipboard-document]'
                                "
                                :size="0.875"
                              />
                            </button>
                          </span>
                          <span v-if="identityCode(col, row)" class="at-identity-code">
                            {{ identityCode(col, row) }}
                          </span>
                        </span>
                      </span>

                      <!-- Enum badge: a fixed tone map for known values, a stable hash for the rest -->
                      <span
                        v-else-if="col.type === 'badge'"
                        :class="isBlank(rawValue(col, row)) ? 'at-muted' : 'at-badge'"
                        :style="badgeStyle(col, row)"
                      >
                        {{ badgeText(col, row) }}
                      </span>

                      <!-- Hue chip: a category that carries its own colour -->
                      <span v-else-if="col.type === 'chip'" class="at-chip" :class="hueClass(chipHue(col, row))">
                        {{ formatCell(col, row) }}
                      </span>

                      <template v-else>
                        <span :class="{ 'at-muted': isBlank(rawValue(col, row)) }">{{ formatCell(col, row) }}</span>
                        <button
                          v-if="col.copy && !isBlank(rawValue(col, row))"
                          type="button"
                          class="at-copy"
                          :class="{ 'is-ok': copiedCell === copyKeyOf(col, row, index) }"
                          :title="copiedCell === copyKeyOf(col, row, index) ? copiedLabel : copyLabel"
                          :aria-label="copyLabel"
                          @click.stop.prevent="copyCell(col, row, index)"
                        >
                          <AppIcon
                            :name="
                              copiedCell === copyKeyOf(col, row, index)
                                ? 'icon-[heroicons-outline--check]'
                                : 'icon-[heroicons-outline--clipboard-document]'
                            "
                            :size="0.875"
                          />
                        </button>
                      </template>
                    </slot>
                  </span>
                </td>

                <td v-if="hasActions" class="at-actions-col">
                  <span class="at-cell-label" aria-hidden="true">{{ actionsLabel }}</span>
                  <div class="at-actions">
                    <slot name="actions" :row="row" :index="index">
                      <AppButton
                        v-for="action in rowActionsFor(row)"
                        :key="action.key ?? action.label"
                        :label="action.label"
                        :icon="action.icon"
                        :variant="action.danger ? 'danger' : (action.variant ?? 'ghost')"
                        :disabled="action.disabled?.(row)"
                        size="xs"
                        @click.stop="runRowAction(action, row)"
                      />
                    </slot>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Bulk bar: stacks above the docked pager rather than over it -->
    <Transition
      enter-active-class="at-bulkbar-in"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div v-if="selectable && selectedCount > 0" class="at-bulkbar" :class="{ 'is-above-pager': pagerIsDocked }">
        <span class="at-bulkbar-count">{{ selectedCount }} {{ selectedLabel }}</span>
        <slot name="bulk-actions" :keys="selectedKeys" :rows="selectedRows" :clear="clearSelection">
          <AppButton
            v-for="action in bulkActions"
            :key="action.key ?? action.label"
            :label="action.label"
            :icon="action.icon"
            :variant="action.danger ? 'danger' : (action.variant ?? 'ghost')"
            :disabled="action.disabled?.(selectedRows)"
            size="xs"
            @click="runBulkAction(action)"
          />
        </slot>
        <AppButton size="xs" variant="ghost" :label="clearLabel" @click="clearSelection" />
      </div>
    </Transition>

    <!-- Pager: a solid bar docked to the bottom, not a pill floating over the rows -->
    <div
      v-if="paginated && (totalRows > 0 || loading)"
      class="at-pagination"
      :class="{ 'is-docked': stickyPagination }"
    >
      <AppPopover
        v-if="showLimit && pageSizes.length > 1"
        placement="top-start"
        panel-class="min-w-20 rounded-xl border border-border bg-surface p-1 shadow-lg"
      >
        <template #trigger="{ toggle, isOpen }">
          <button
            type="button"
            class="at-page-size"
            :aria-expanded="isOpen"
            aria-label="Rows per page"
            @click="toggle"
          >
            {{ limitValue }} / {{ pageLabel }}
            <AppIcon name="icon-[heroicons-outline--selector]" :size="0.75" />
          </button>
        </template>
        <template #default>
          <button
            v-for="size in pageSizes"
            :key="size"
            type="button"
            class="at-menu-item justify-center"
            :class="{ 'is-active': size === limitValue }"
            @click="setLimit(size)"
          >
            {{ size }}
          </button>
        </template>
      </AppPopover>

      <span class="at-range">
        {{ rangeFrom.toLocaleString() }}&ndash;{{ rangeTo.toLocaleString() }} {{ ofLabel }}
        {{ totalRows.toLocaleString() }}
      </span>

      <button type="button" class="at-page-btn" :disabled="pageValue <= 1" @click="goToPage(pageValue - 1)">
        {{ prevLabel }}
      </button>

      <template v-if="pageCount > 1">
        <template v-for="(entry, i) in pageWindow" :key="typeof entry === 'number' ? `p${entry}` : `gap-${i}`">
          <span v-if="entry === GAP" class="at-gap">&hellip;</span>
          <button
            v-else
            type="button"
            class="at-page-btn"
            :class="{ 'is-current': entry === pageValue }"
            :disabled="entry === pageValue"
            :aria-current="entry === pageValue ? 'page' : undefined"
            @click="goToPage(entry)"
          >
            {{ entry }}
          </button>
        </template>
      </template>

      <button
        type="button"
        class="at-page-btn"
        :disabled="pageValue >= pageCount"
        @click="goToPage(pageValue + 1)"
      >
        {{ nextLabel }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import type { TableDensity, TableView } from '@/composables/useTableDisplay';

export type { TableView, TableDensity };

// ── Public types and helpers ──────────────────────────────────────────────────

export type TableHue = 'lime' | 'mint' | 'aqua' | 'sky' | 'violet' | 'rose' | 'peach' | 'amber';

export const TABLE_HUES = [
  'lime',
  'mint',
  'aqua',
  'sky',
  'violet',
  'rose',
  'peach',
  'amber',
] as const satisfies readonly TableHue[];

/**
 * Stable hue for an arbitrary key — the same id, tag or name always lands on the same
 * colour, on every page and across sessions. Use it to give identity to things that
 * have no category of their own (avatars, author chips).
 */
export const hueFor = (seed: string): TableHue => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TABLE_HUES[hash % TABLE_HUES.length];
};

/** Coloured text on a faint same-hue fill with a soft border — one badge language everywhere. */
export const tone = (hex: string) => ({ color: hex, background: `${hex}17`, borderColor: `${hex}55` });

/** Distinguishable hues that read on both a light and a dark surface. */
const TONE_PALETTE = [
  '#3b82f6',
  '#db2777',
  '#7c3aed',
  '#16a34a',
  '#ca8a04',
  '#0d9488',
  '#ea580c',
  '#0284c7',
  '#e11d48',
  '#65a30d',
  '#c026d3',
  '#64748b',
] as const;

/** Stable colour for a categorised string, so free-form values stay consistent across pages. */
export const autoTone = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return TONE_PALETTE[hash % TONE_PALETTE.length];
};

export interface IdentityConfig<T = any> {
  /** The primary line — a name, a title. */
  title: (row: T) => string;
  /** Avatar URL. Falls back to an initial on a hue-tinted disc. */
  image?: (row: T) => string | null | undefined;
  /** Secondary line — an email, a handle. Carries the copy button when `copy` is set. */
  subtitle?: (row: T) => string | null | undefined;
  /** Third line, rendered in mono — a code, a short id. */
  code?: (row: T) => string | null | undefined;
  /** What the stable hue is derived from. Defaults to the row key. */
  seed?: (row: T) => string;
}

export interface AdvancedTableColumn<T = any> {
  /** Column identity: scopes the persisted hidden state and reads `row[key]` by default (dot paths allowed). */
  key: string;
  /** Header text, the label in the display menu, and the field label in card mode. */
  label: string;
  sortable?: boolean;
  /** Sort token sent upstream. Defaults to `key`. */
  sortField?: string;
  /** Default `true`. A structural column (a thumbnail, a control) should set `false`. */
  hideable?: boolean;
  /** Hidden until the user turns it on — only honoured before this table's prefs are saved. */
  defaultHidden?: boolean;
  align?: 'start' | 'center' | 'end';
  width?: string;
  class?: string;
  headerClass?: string;
  /** Metadata (dates, counts, ids) renders in mono and never wraps. */
  mono?: boolean;
  nowrap?: boolean;
  truncate?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'chip' | 'identity';
  /** Custom accessor. Defaults to the dot path in `key`. */
  value?: (row: T) => unknown;
  format?: (value: unknown, row: T) => string;
  /** `type: 'badge'` — fixed value → hex map. Unknown values fall back to `autoTone`. */
  tones?: Record<string, string>;
  /** `type: 'chip'` — a fixed hue, or one derived from the row. Defaults to hashing the value. */
  hue?: TableHue | ((row: T) => TableHue);
  identity?: IdentityConfig<T>;
  /** Show a copy button beside the value. Pass a function to copy something other than the text. */
  copy?: boolean | ((row: T) => string);
  /** Per-cell tooltip. */
  title?: (row: T) => string | undefined;
  /** Leave this column out of the CSV export. */
  noExport?: boolean;
}

type ActionVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'muted' | 'danger' | 'success' | 'surface' | 'outline';

export interface TableRowAction<T = any> {
  key?: string;
  label: string;
  icon?: string;
  variant?: ActionVariant;
  danger?: boolean;
  onClick: (row: T) => void | Promise<void>;
  hidden?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

export interface TableBulkAction<T = any> {
  key?: string;
  label: string;
  icon?: string;
  variant?: ActionVariant;
  danger?: boolean;
  onClick: (rows: T[], keys: (string | number)[]) => void | Promise<void>;
  disabled?: (rows: T[]) => boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useSlots, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import AppButton from './AppButton.vue';
import AppCheckbox from './AppCheckbox.vue';
import AppPopover from './AppPopover.vue';
import { useDebounce } from '@/composables/useDebounce';
import { TABLE_DENSITIES, TABLE_VIEWS, useHiddenColumns, useTableDisplay } from '@/composables/useTableDisplay';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /**
   * Unique, stable id. Scopes the persisted hidden-column list — two tables sharing an
   * id share their column preferences.
   */
  id: string;
  columns: AdvancedTableColumn[];
  rows: any[];
  rowKey?: string | ((row: any) => string | number);
  /** First load — skeleton rows. */
  loading?: boolean;
  /** Background refetch (`isFetching && !isLoading`) — the sweep, with stale rows left visible. */
  refreshing?: boolean;

  /** Search, sort and paging are handled upstream; the component renders `rows` as given. */
  serverSide?: boolean;
  /** Row count behind the filters — required in `serverSide` mode. */
  total?: number;

  searchable?: boolean;
  searchPlaceholder?: string;
  /** `v-model:search`. Emitted debounced, so it is safe to send straight to an API. */
  search?: string;
  searchDebounce?: number;

  /** `v-model:sort` — `field`, `field:desc`, or `''`. Clicking cycles asc → desc → unsorted. */
  sort?: string;

  paginated?: boolean;
  /** `v-model:page` (1-based). */
  page?: number;
  /** `v-model:limit`. */
  limit?: number;
  pageSizes?: number[];
  showLimit?: boolean;
  stickyPagination?: boolean;

  selectable?: boolean;
  /** `v-model:selected`. Survives page changes, so a selection can accumulate. */
  selected?: (string | number)[];
  bulkActions?: TableBulkAction[];

  actions?: TableRowAction[];
  /** The last column is a pinned action rail. Set this when your last column is real data. */
  plainLastColumn?: boolean;

  rowClickable?: boolean;
  rowClass?: (row: any, index: number) => string | undefined;

  exportable?: boolean;
  exportFileName?: string;
  /** Fetch every matching row for the export instead of exporting the current page. */
  exportRows?: () => Promise<any[]>;

  /** Pin this table to one layout, hiding the layout rows in its menu. */
  view?: TableView;
  /** Pin this table to one density, hiding the density rows in its menu. */
  density?: TableDensity;
  showDisplayMenu?: boolean;
  showCount?: boolean;
  maxHeight?: string;
  skeletonRows?: number;

  emptyMessage?: string;
  actionsLabel?: string;
  columnsLabel?: string;
  layoutLabel?: string;
  densityLabel?: string;
  showAllLabel?: string;
  displayMenuTitle?: string;
  selectedLabel?: string;
  clearLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
  pageLabel?: string;
  ofLabel?: string;
  countLabel?: string;
  exportLabel?: string;
  copyLabel?: string;
  copiedLabel?: string;
  rowTitle?: string;
  blankLabel?: string;
  trueLabel?: string;
  falseLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  columns: () => [],
  rows: () => [],
  rowKey: 'id',
  loading: false,
  refreshing: false,
  serverSide: false,
  total: undefined,
  searchable: false,
  searchPlaceholder: 'Search…',
  search: undefined,
  searchDebounce: 300,
  sort: undefined,
  paginated: false,
  page: undefined,
  limit: undefined,
  pageSizes: () => [25, 50, 100],
  showLimit: true,
  stickyPagination: true,
  selectable: false,
  selected: undefined,
  bulkActions: () => [],
  actions: () => [],
  plainLastColumn: false,
  rowClickable: false,
  rowClass: undefined,
  exportable: false,
  exportFileName: 'export',
  exportRows: undefined,
  view: undefined,
  density: undefined,
  showDisplayMenu: true,
  showCount: false,
  maxHeight: '70vh',
  skeletonRows: 5,
  emptyMessage: 'No records found.',
  actionsLabel: 'Actions',
  columnsLabel: 'Columns',
  layoutLabel: 'Data display',
  densityLabel: 'Row density',
  showAllLabel: 'Show all columns',
  displayMenuTitle: 'Choose layout, density and columns',
  selectedLabel: 'selected',
  clearLabel: 'Clear',
  prevLabel: 'Prev',
  nextLabel: 'Next',
  pageLabel: 'page',
  ofLabel: 'of',
  countLabel: 'results',
  exportLabel: 'Export CSV',
  copyLabel: 'Copy',
  copiedLabel: 'Copied!',
  rowTitle: 'Click for details',
  blankLabel: '—',
  trueLabel: 'Yes',
  falseLabel: 'No',
});

const emit = defineEmits<{
  'update:search': [value: string];
  'update:sort': [value: string];
  'update:page': [value: number];
  'update:limit': [value: number];
  'update:selected': [keys: (string | number)[]];
  search: [value: string];
  sortChange: [value: string];
  pageChange: [payload: { page: number; limit: number; offset: number }];
  selectionChange: [payload: { keys: (string | number)[]; rows: any[] }];
  rowClick: [payload: { row: any; index: number; event: MouseEvent }];
}>();

const slots = useSlots();

const SKELETON_WIDTHS = [85, 55, 70, 45, 60, 50];
const GAP = '…' as const;

const VIEW_LABELS: Record<TableView, string> = { table: 'Table rows', cards: 'Record cards' };
const DENSITY_LABELS: Record<TableDensity, string> = { relaxed: 'Relaxed', compact: 'Compact' };
const VIEW_ICONS: Record<TableView, string> = {
  table: 'icon-[heroicons-outline--table-cells]',
  cards: 'icon-[heroicons-outline--squares-2x2]',
};
const DENSITY_ICONS: Record<TableDensity, string> = {
  relaxed: 'icon-[heroicons-outline--bars-2]',
  compact: 'icon-[heroicons-outline--bars-3]',
};

const wrapRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);

// ── Display: global unless this table pins its own ────────────────────────────

const { view: globalView, density: globalDensity, setView: setGlobalView, setDensity: setGlobalDensity } =
  useTableDisplay();

const activeView = computed(() => props.view ?? globalView.value);
const activeDensity = computed(() => props.density ?? globalDensity.value);

const setView = (value: TableView) => setGlobalView(value);
const setDensity = (value: TableDensity) => setGlobalDensity(value);

// A capped box would clip cards, which reflow to the page instead of scrolling.
const wrapStyle = computed(() =>
  activeView.value === 'cards' ? undefined : { maxHeight: props.maxHeight },
);

// ── Columns ───────────────────────────────────────────────────────────────────

const { hidden: storedHidden, set: setHidden, isSeeded } = useHiddenColumns(() => props.id);

const columnByKey = computed(() => new Map(props.columns.map((col) => [col.key, col])));

const hideableColumns = computed(() => props.columns.filter((col) => col.hideable !== false));

/** Before a table's prefs are saved, `defaultHidden` decides; after that, the user does. */
const hiddenKeys = computed(() =>
  isSeeded.value
    ? storedHidden.value
    : hideableColumns.value.filter((col) => col.defaultHidden).map((col) => col.key),
);

const isHidden = (key: string): boolean => {
  const col = columnByKey.value.get(key);
  if (!col || col.hideable === false) return false;
  return hiddenKeys.value.includes(key);
};

const toggleColumn = (key: string) => {
  const current = hiddenKeys.value;
  setHidden(current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
};
const showAllColumns = () => setHidden([]);

const visibleColumns = computed(() => props.columns.filter((col) => !isHidden(col.key)));
const visibleHideableCount = computed(() => hideableColumns.value.filter((col) => !isHidden(col.key)).length);
const hiddenCount = computed(() => hideableColumns.value.length - visibleHideableCount.value);

const hasActions = computed(() => props.actions.length > 0 || !!slots.actions);
const columnCount = computed(
  () => visibleColumns.value.length + (props.selectable ? 1 : 0) + (hasActions.value ? 1 : 0),
);

const hasToolbar = computed(
  () =>
    props.searchable ||
    props.exportable ||
    props.showCount ||
    !!slots['toolbar-start'] ||
    !!slots['toolbar-end'],
);

// ── Values ────────────────────────────────────────────────────────────────────

const getPath = (row: any, path: string): unknown =>
  path.split('.').reduce<any>((acc, part) => (acc == null ? acc : acc[part]), row);

const rawValue = (col: AdvancedTableColumn, row: any): unknown =>
  col.value ? col.value(row) : getPath(row, col.key);

const isBlank = (value: unknown): boolean => value === null || value === undefined || value === '';

const displayValue = (value: unknown, type?: AdvancedTableColumn['type']): string => {
  if (isBlank(value)) return props.blankLabel;
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'boolean') return value ? props.trueLabel : props.falseLabel;
  if (type === 'date') return new Date(value as string).toLocaleDateString();
  if (type === 'boolean') return value ? props.trueLabel : props.falseLabel;
  if (type === 'number') return Number(value).toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatCell = (col: AdvancedTableColumn, row: any): string => {
  const value = rawValue(col, row);
  return col.format ? col.format(value, row) : displayValue(value, col.type);
};

const searchText = (col: AdvancedTableColumn, row: any): string => {
  if (col.type === 'identity' && col.identity) {
    return [col.identity.title(row), col.identity.subtitle?.(row), col.identity.code?.(row)]
      .filter(Boolean)
      .join(' ');
  }
  return formatCell(col, row);
};

// ── Cell presentation ─────────────────────────────────────────────────────────

const hueClass = (hue: TableHue) => `hue-${hue}`;

const identityHue = (col: AdvancedTableColumn, row: any, index: number): TableHue =>
  hueFor(col.identity?.seed?.(row) ?? String(rowKeyOf(row, index)));

const chipHue = (col: AdvancedTableColumn, row: any): TableHue => {
  if (typeof col.hue === 'function') return col.hue(row);
  if (col.hue) return col.hue;
  return hueFor(String(rawValue(col, row) ?? ''));
};

const identityImage = (col: AdvancedTableColumn, row: any): string => col.identity?.image?.(row) ?? '';
const identityTitle = (col: AdvancedTableColumn, row: any): string => col.identity?.title(row) ?? '';
const identitySubtitle = (col: AdvancedTableColumn, row: any): string => col.identity?.subtitle?.(row) ?? '';
const identityCode = (col: AdvancedTableColumn, row: any): string => col.identity?.code?.(row) ?? '';

const initialOf = (col: AdvancedTableColumn, row: any): string => {
  const title = identityTitle(col, row).trim();
  const subtitle = identitySubtitle(col, row).trim();
  return (title[0] ?? subtitle[0] ?? '?').toUpperCase();
};

const badgeStyle = (col: AdvancedTableColumn, row: any) => {
  const value = rawValue(col, row);
  if (isBlank(value)) return undefined;
  const key = String(value);
  return tone(col.tones?.[key] ?? autoTone(key));
};

const badgeText = (col: AdvancedTableColumn, row: any): string => {
  const value = rawValue(col, row);
  if (isBlank(value)) return props.blankLabel;
  return col.format ? col.format(value, row) : String(value).replace(/_/g, ' ');
};

const alignClass = (col: AdvancedTableColumn) =>
  col.align === 'end' ? 'at-align-end' : col.align === 'center' ? 'at-align-center' : '';

const cellClass = (col: AdvancedTableColumn) => ({ 'at-mono': !!col.mono, 'at-nowrap': !!col.nowrap });

// ── Copy ──────────────────────────────────────────────────────────────────────

const copiedCell = ref<string | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

const copyKeyOf = (col: AdvancedTableColumn, row: any, index: number) => `${rowKeyOf(row, index)}:${col.key}`;

const copyText = (col: AdvancedTableColumn, row: any): string => {
  if (typeof col.copy === 'function') return col.copy(row);
  if (col.type === 'identity' && col.identity) return col.identity.subtitle?.(row) ?? col.identity.title(row);
  return formatCell(col, row);
};

const copyCell = async (col: AdvancedTableColumn, row: any, index: number) => {
  try {
    await navigator.clipboard.writeText(copyText(col, row));
    copiedCell.value = copyKeyOf(col, row, index);
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copiedCell.value = null;
    }, 1200);
  } catch {
    /* clipboard unavailable (http, old browser) — the tooltip already says what it does */
  }
};

onBeforeUnmount(() => clearTimeout(copiedTimer));

// ── Search ────────────────────────────────────────────────────────────────────

// The input stays live; only the debounced value is emitted, so what a parent
// forwards to an API is never the half-typed string.
const inputValue = ref(props.search ?? '');
const debouncedSearch = useDebounce(inputValue, props.searchDebounce);

watch(
  () => props.search,
  (value) => {
    if (value !== undefined && value !== debouncedSearch.value) inputValue.value = value;
  },
);

watch(debouncedSearch, (value) => {
  emit('update:search', value);
  emit('search', value);
  resetPage();
});

const onSearchInput = (event: Event) => {
  inputValue.value = (event.target as HTMLInputElement).value;
};

const clearSearch = () => {
  inputValue.value = '';
  searchInputRef.value?.focus();
};

// ── Sort ──────────────────────────────────────────────────────────────────────

const internalSort = ref('');
const sortValue = computed(() => props.sort ?? internalSort.value);
const sortedKey = computed(() => sortValue.value.split(':')[0] ?? '');
const sortDesc = computed(() => sortValue.value.split(':')[1] === 'desc');

const sortFieldOf = (col: AdvancedTableColumn) => col.sortField ?? col.key;

const sortIcon = (col: AdvancedTableColumn) => {
  if (sortedKey.value !== sortFieldOf(col)) return 'icon-[heroicons-outline--selector]';
  return sortDesc.value ? 'icon-[heroicons-outline--sort-descending]' : 'icon-[heroicons-outline--sort-ascending]';
};

const sortAriaLabel = (col: AdvancedTableColumn) => {
  if (sortedKey.value !== sortFieldOf(col)) return `Sort by ${col.label}`;
  return `Sort by ${col.label}, ${sortDesc.value ? 'descending' : 'ascending'}`;
};

const cycleSort = (col: AdvancedTableColumn) => {
  const field = sortFieldOf(col);
  const next = sortedKey.value !== field ? field : sortDesc.value ? '' : `${field}:desc`;
  if (props.sort === undefined) internalSort.value = next;
  emit('update:sort', next);
  emit('sortChange', next);
  resetPage();
};

const compareValues = (a: unknown, b: unknown): number => {
  if (isBlank(a) && isBlank(b)) return 0;
  if (isBlank(a)) return 1;
  if (isBlank(b)) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

// ── Rows ──────────────────────────────────────────────────────────────────────

const rowKeyOf = (row: any, index: number): string | number => {
  const key = typeof props.rowKey === 'function' ? props.rowKey(row) : getPath(row, props.rowKey);
  return (key as string | number | undefined) ?? index;
};

const filteredRows = computed(() => {
  if (props.serverSide) return props.rows;
  const needle = debouncedSearch.value.trim().toLowerCase();
  if (!needle) return props.rows;
  return props.rows.filter((row) =>
    visibleColumns.value.some((col) => searchText(col, row).toLowerCase().includes(needle)),
  );
});

const processedRows = computed(() => {
  if (props.serverSide || !sortedKey.value) return filteredRows.value;
  const col = props.columns.find((c) => sortFieldOf(c) === sortedKey.value);
  if (!col) return filteredRows.value;
  const direction = sortDesc.value ? -1 : 1;
  return [...filteredRows.value].sort(
    (a, b) => compareValues(rawValue(col, a), rawValue(col, b)) * direction,
  );
});

const totalRows = computed(() =>
  props.serverSide ? (props.total ?? props.rows.length) : processedRows.value.length,
);

// ── Pagination ────────────────────────────────────────────────────────────────

const internalPage = ref(1);
const internalLimit = ref(props.pageSizes[0] ?? 25);

const limitValue = computed(() => props.limit ?? internalLimit.value);
const pageCount = computed(() => Math.max(1, Math.ceil(totalRows.value / limitValue.value)));
const pageValue = computed(() => Math.min(Math.max(1, props.page ?? internalPage.value), pageCount.value));
const offset = computed(() => (pageValue.value - 1) * limitValue.value);

const pagedRows = computed(() => {
  if (!props.paginated || props.serverSide) return processedRows.value;
  return processedRows.value.slice(offset.value, offset.value + limitValue.value);
});

const rangeFrom = computed(() => (totalRows.value === 0 ? 0 : offset.value + 1));
const rangeTo = computed(() =>
  props.paginated ? Math.min(offset.value + limitValue.value, totalRows.value) : totalRows.value,
);

/** Always the first, last and current ±1 page, with a gap marker for the rest. */
const pageWindow = computed<(number | typeof GAP)[]>(() => {
  const keep = new Set<number>([1, pageCount.value]);
  for (let p = pageValue.value - 1; p <= pageValue.value + 1; p++) {
    if (p >= 1 && p <= pageCount.value) keep.add(p);
  }
  const out: (number | typeof GAP)[] = [];
  let previous = 0;
  for (const p of [...keep].sort((a, b) => a - b)) {
    if (previous && p - previous > 1) out.push(GAP);
    out.push(p);
    previous = p;
  }
  return out;
});

const pagerIsDocked = computed(() => props.paginated && props.stickyPagination);

const goToPage = (next: number) => {
  const clamped = Math.min(Math.max(1, next), pageCount.value);
  if (clamped === pageValue.value) return;
  if (props.page === undefined) internalPage.value = clamped;
  emit('update:page', clamped);
  emit('pageChange', {
    page: clamped,
    limit: limitValue.value,
    offset: (clamped - 1) * limitValue.value,
  });
};

const resetPage = () => {
  if (pageValue.value === 1) return;
  if (props.page === undefined) internalPage.value = 1;
  emit('update:page', 1);
  emit('pageChange', { page: 1, limit: limitValue.value, offset: 0 });
};

const setLimit = (size: number) => {
  if (size === limitValue.value) return;
  if (props.limit === undefined) internalLimit.value = size;
  emit('update:limit', size);
  if (props.page === undefined) internalPage.value = 1;
  emit('update:page', 1);
  emit('pageChange', { page: 1, limit: size, offset: 0 });
};

// The table scrolls inside itself — without this, paging from halfway down a list
// would drop you halfway down the next one, looking at strangers.
watch(pageValue, () => wrapRef.value?.scrollTo({ top: 0 }));

// ── Selection ─────────────────────────────────────────────────────────────────

const selectedSet = ref<Set<string | number>>(new Set(props.selected ?? []));
let anchorIndex: number | null = null;

watch(
  () => props.selected,
  (value) => {
    if (value) selectedSet.value = new Set(value);
  },
  { deep: true },
);

const selectedKeys = computed(() => [...selectedSet.value]);
const selectedCount = computed(() => selectedSet.value.size);

/** Only rows currently loaded can be handed back — a selection may span pages. */
const selectedRows = computed(() =>
  processedRows.value.filter((row, index) => selectedSet.value.has(rowKeyOf(row, index))),
);

const pageKeys = computed(() => pagedRows.value.map((row, index) => rowKeyOf(row, index)));
const allOnPage = computed(
  () => pageKeys.value.length > 0 && pageKeys.value.every((key) => selectedSet.value.has(key)),
);
const someOnPage = computed(() => pageKeys.value.some((key) => selectedSet.value.has(key)));

const commitSelection = () => {
  selectedSet.value = new Set(selectedSet.value);
  emit('update:selected', selectedKeys.value);
  emit('selectionChange', { keys: selectedKeys.value, rows: selectedRows.value });
};

const isSelected = (row: any, index: number) => selectedSet.value.has(rowKeyOf(row, index));

const onSelectClick = (event: MouseEvent, row: any, index: number) => {
  // Own the state outright: let the input toggle itself and the DOM can drift out of
  // step with the model on a shift-range.
  event.preventDefault();
  event.stopPropagation();

  const key = rowKeyOf(row, index);
  if (event.shiftKey && anchorIndex !== null) {
    const [from, to] = [Math.min(anchorIndex, index), Math.max(anchorIndex, index)];
    const turnOn = !selectedSet.value.has(key);
    for (let i = from; i <= to; i++) {
      const rangeKey = pageKeys.value[i];
      if (rangeKey === undefined) continue;
      if (turnOn) selectedSet.value.add(rangeKey);
      else selectedSet.value.delete(rangeKey);
    }
  } else if (selectedSet.value.has(key)) {
    selectedSet.value.delete(key);
  } else {
    selectedSet.value.add(key);
  }
  anchorIndex = index;
  commitSelection();
};

const toggleAllOnPage = () => {
  const turnOff = allOnPage.value;
  for (const key of pageKeys.value) {
    if (turnOff) selectedSet.value.delete(key);
    else selectedSet.value.add(key);
  }
  anchorIndex = null;
  commitSelection();
};

const clearSelection = () => {
  selectedSet.value.clear();
  anchorIndex = null;
  commitSelection();
};

// ── Actions ───────────────────────────────────────────────────────────────────

const rowActionsFor = (row: any) => props.actions.filter((action) => !action.hidden?.(row));

const runRowAction = (action: TableRowAction, row: any) => {
  void action.onClick(row);
};

const runBulkAction = (action: TableBulkAction) => {
  void action.onClick(selectedRows.value, selectedKeys.value);
};

// Real controls inside a row must keep working, so a click that landed on one is
// never a row click.
const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [contenteditable="true"]';

const onRowClick = (event: MouseEvent, row: any, index: number) => {
  if (!props.rowClickable) return;
  if ((event.target as HTMLElement | null)?.closest(INTERACTIVE)) return;
  if (window.getSelection()?.toString()) return;
  emit('rowClick', { row, index, event });
};

// ── CSV export ────────────────────────────────────────────────────────────────

const isExporting = ref(false);

/** Excel needs a byte-order mark to read the file back as UTF-8 (Arabic names, accents). */
const BOM = String.fromCharCode(0xfeff);

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const exportCsv = async () => {
  isExporting.value = true;
  try {
    const rows = props.exportRows ? await props.exportRows() : processedRows.value;
    const cols = visibleColumns.value.filter((col) => !col.noExport);
    const lines = [
      cols.map((col) => csvCell(col.label)).join(','),
      ...rows.map((row) =>
        cols
          .map((col) =>
            csvCell(col.type === 'identity' && col.identity ? col.identity.title(row) : formatCell(col, row)),
          )
          .join(','),
      ),
    ];
    const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${props.exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } finally {
    isExporting.value = false;
  }
};

defineExpose({ clearSelection, showAllColumns, exportCsv, selectedKeys, selectedRows });
</script>

<style scoped>
.advanced-table {
  /* The row rhythm lives here and nowhere else — retune it and every measurement follows. */
  --at-pad-y: 0.6875rem;
  --at-pad-x: 0.875rem;
  --at-card-pad: 1rem;
  --at-card-gap: 0.75rem;
  --at-ease: cubic-bezier(0.16, 0.84, 0.24, 1);
  --at-dock: cubic-bezier(0.22, 1.12, 0.36, 1);
  --at-rail: color-mix(in srgb, var(--color-text, #111827) 4%, var(--color-surface, #ffffff));

  /* Eight equally-weighted hues. Identity and categories pick from these rather than
     inventing one-off colours. */
  --hue-lime: #7cb305;
  --hue-mint: #10b981;
  --hue-aqua: #06b6d4;
  --hue-sky: #3b82f6;
  --hue-violet: #8b5cf6;
  --hue-rose: #ec4899;
  --hue-peach: #f97316;
  --hue-amber: #d97706;
}

/* Compact: the same information, more of it on screen. */
.advanced-table[data-density='compact'] {
  --at-pad-y: 0.3125rem;
  --at-pad-x: 0.625rem;
  --at-card-pad: 0.75rem;
}

/* ── Hue mechanics ──────────────────────────────────────────────────────────── */

.hue-lime {
  --hue: var(--hue-lime);
}
.hue-mint {
  --hue: var(--hue-mint);
}
.hue-aqua {
  --hue: var(--hue-aqua);
}
.hue-sky {
  --hue: var(--hue-sky);
}
.hue-violet {
  --hue: var(--hue-violet);
}
.hue-rose {
  --hue: var(--hue-rose);
}
.hue-peach {
  --hue: var(--hue-peach);
}
.hue-amber {
  --hue: var(--hue-amber);
}

.hue-lime,
.hue-mint,
.hue-aqua,
.hue-sky,
.hue-violet,
.hue-rose,
.hue-peach,
.hue-amber {
  --hue-fill: color-mix(in srgb, var(--hue) 12%, transparent);
  --hue-edge: color-mix(in srgb, var(--hue) 38%, transparent);
  --hue-glow: color-mix(in srgb, var(--hue) 60%, transparent);
}

/* ── The surface ────────────────────────────────────────────────────────────── */

.at-surface {
  position: relative;
}

.at-wrap {
  position: relative;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 1rem;
  overflow: auto;
  overscroll-behavior: contain;
}

.at-sweep-track {
  position: absolute;
  top: 0;
  inset-inline: 0;
  height: 0.125rem;
  overflow: hidden;
  border-start-start-radius: 1rem;
  border-start-end-radius: 1rem;
  pointer-events: none;
  z-index: 5;
}

.at-sweep {
  display: block;
  width: 25%;
  height: 100%;
  background: var(--color-accent, #f59e0b);
  animation: at-sweep-run 1s ease-in-out infinite;
}

@keyframes at-sweep-run {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(400%);
  }
}

.at-table {
  width: 100%;
  border-collapse: collapse;
}

.at-table th,
.at-table td {
  text-align: start;
  padding: var(--at-pad-y) var(--at-pad-x);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

/* Pinned header: the column you are reading stays named however far down you are.
   It needs an opaque background so rows slide under it, and the inset rule survives
   where a plain border-bottom on a sticky cell does not. */
.at-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--color-surface, #ffffff);
  box-shadow: inset 0 -1px 0 var(--color-border, #e5e7eb);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-secondary, var(--color-text-muted, #6b7280));
  white-space: nowrap;
}

.at-table tbody tr:last-child td {
  border-bottom: none;
}

.at-align-end {
  text-align: end;
}

.at-align-center {
  text-align: center;
}

.at-mono {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  letter-spacing: 0.02em;
}

.at-nowrap,
.at-mono {
  white-space: nowrap;
}

.at-truncate {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.at-muted,
.at-muted-fg {
  color: var(--color-text-secondary, var(--color-text-muted, #6b7280));
}

.at-search::placeholder {
  color: color-mix(
    in srgb,
    var(--color-text-secondary, var(--color-text-muted, #6b7280)) 70%,
    transparent
  );
}

.at-cell-body {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

/* The header name doubles as the field label once a row becomes a card. */
.at-cell-label {
  display: none;
}

/* ── Rows ───────────────────────────────────────────────────────────────────── */

.at-row {
  transition: background-color 0.2s var(--at-ease);
}

.at-row > td:first-child {
  position: relative;
}

.at-row:hover {
  background: color-mix(in srgb, var(--color-accent, #f59e0b) 5%, var(--color-surface, #ffffff));
}

.at-row.is-selected {
  background: color-mix(in srgb, var(--color-accent, #f59e0b) 9%, var(--color-surface, #ffffff));
}

.at-row.is-clickable {
  cursor: pointer;
}

/* Kinetic marker: the hovered row takes an accent edge, like an active nav link. */
.at-row:hover > td:first-child::before {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 0.125rem;
  background: var(--color-accent, #f59e0b);
}

.at-check {
  width: 2.5rem;
  padding-inline-end: 0;
}

/* Pinned actions: the last column stays reachable while a wide table scrolls
   sideways. `plainLastColumn` opts out, for tables whose last column is data. */
.at-wrap:not(.is-plain) .at-actions-col {
  position: sticky;
  inset-inline-end: 0;
  background: var(--at-rail);
}

.at-wrap:not(.is-plain) thead th.at-actions-col {
  z-index: 3;
}

.at-wrap:not(.is-plain) .at-row:hover > .at-actions-col {
  background: color-mix(in srgb, var(--color-accent, #f59e0b) 5%, var(--at-rail));
}

/* The seam that marks content sliding under the rail. */
.at-wrap:not(.is-plain) .at-actions-col::after {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: -0.75rem;
  width: 0.75rem;
  pointer-events: none;
  background: linear-gradient(to right, transparent, rgb(0 0 0 / 0.12));
}

[dir='rtl'] .at-wrap:not(.is-plain) .at-actions-col::after {
  background: linear-gradient(to left, transparent, rgb(0 0 0 / 0.12));
}

.at-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Row actions stay quiet until the row is engaged — still reachable by keyboard. */
.at-actions :deep(button) {
  opacity: 0.55;
  transition: opacity 0.12s ease;
}

.at-row:hover .at-actions :deep(button),
.at-actions :deep(button:focus-visible) {
  opacity: 1;
}

/* ── Sortable headers ───────────────────────────────────────────────────────── */

.at-sort {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
  transition: color 0.2s var(--at-ease);
}

.at-sort:hover {
  color: var(--color-text, #111827);
}

.at-sort[data-on] {
  color: var(--color-accent, #f59e0b);
}

.at-sort-icon {
  opacity: 0.4;
  transition: opacity 0.2s var(--at-ease);
}

.at-sort:hover .at-sort-icon {
  opacity: 0.75;
}

.at-sort[data-on] .at-sort-icon {
  opacity: 1;
}

/* ── Status rows ────────────────────────────────────────────────────────────── */

.at-skeleton {
  display: block;
  height: 0.875rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-text, #111827) 9%, transparent);
  animation: at-skeleton-pulse 1.4s ease-in-out infinite;
}

@keyframes at-skeleton-pulse {
  50% {
    opacity: 0.4;
  }
}

.at-empty {
  padding: 2.5rem;
  text-align: center;
  color: var(--color-text-secondary, var(--color-text-muted, #6b7280));
}

/* ── Cell vocabulary ────────────────────────────────────────────────────────── */

.at-badge {
  display: inline-block;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.at-chip {
  display: inline-block;
  padding: 0.0625rem 0.5rem;
  border-radius: 9999px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
  color: var(--hue);
  background: var(--hue-fill);
  border: 1px solid var(--hue-edge);
}

.at-identity {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.at-avatar {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  background: var(--hue-fill);
  border: 1px solid var(--hue-edge);
  transition:
    border-color 0.24s var(--at-ease),
    box-shadow 0.3s var(--at-ease);
}

.at-avatar.is-placeholder {
  display: grid;
  place-items: center;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--hue);
}

.at-row:hover .at-avatar {
  border-color: var(--hue);
  box-shadow: 0 0 0.85rem -0.15rem var(--hue-glow);
}

.at-identity-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.at-identity-title {
  font-weight: 600;
  color: var(--color-text, #111827);
}

.at-identity-sub {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary, var(--color-text-muted, #6b7280));
  white-space: nowrap;
}

.at-identity-code {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary, var(--color-text-muted, #6b7280));
  opacity: 0.75;
  white-space: nowrap;
}

.at-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-secondary, var(--color-text-muted, #6b7280));
  opacity: 0.7;
  cursor: pointer;
  transition:
    opacity 0.15s ease,
    color 0.15s ease;
}

.at-copy:hover,
.at-copy.is-ok {
  opacity: 1;
  color: var(--color-accent, #f59e0b);
}

/* ── Display menu ───────────────────────────────────────────────────────────── */

.at-chrome-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  height: 2rem;
  padding: 0 0.625rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-surface, #ffffff);
  color: var(--color-text-secondary, var(--color-text-muted, #6b7280));
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    color 0.18s ease,
    border-color 0.18s ease;
}

.at-chrome-trigger:hover {
  color: var(--color-text, #111827);
  border-color: color-mix(in srgb, var(--color-text, #111827) 25%, transparent);
}

.at-chrome-trigger.is-open {
  color: var(--color-accent, #f59e0b);
  border-color: var(--color-accent, #f59e0b);
}

.at-menu-title {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-secondary, var(--color-text-muted, #6b7280));
  padding: 0.5rem 0.5rem 0.25rem;
}

.at-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.5rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--color-text-secondary, var(--color-text-muted, #6b7280));
  font: inherit;
  font-size: 0.8125rem;
  text-align: start;
  cursor: pointer;
}

.at-menu-item:hover:not(:disabled) {
  background: var(--color-muted, #f3f4f6);
  color: var(--color-text, #111827);
}

.at-menu-item.is-active {
  background: color-mix(in srgb, var(--color-accent, #f59e0b) 12%, transparent);
  color: var(--color-accent, #f59e0b);
}

.at-menu-item:disabled {
  opacity: 0.45;
  cursor: default;
}

/* Independent on/off choices, so the control carries the state instead of a
   selected-row fill — that reads as "one of these", which columns are not. */
.at-switch-item {
  justify-content: space-between;
  gap: 0.75rem;
}

.at-switch-item.is-on {
  color: var(--color-text, #111827);
}

.at-switch-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.at-switch {
  position: relative;
  flex: 0 0 auto;
  width: 1.75rem;
  height: 1rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-text, #111827) 10%, transparent);
  border: 1px solid var(--color-border, #e5e7eb);
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.at-switch::after {
  content: '';
  position: absolute;
  top: 0.125rem;
  inset-inline-start: 0.125rem;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 9999px;
  background: var(--color-text-secondary, var(--color-text-muted, #6b7280));
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}

.at-switch[data-on='true'] {
  background: color-mix(in srgb, var(--color-accent, #f59e0b) 14%, transparent);
  border-color: var(--color-accent, #f59e0b);
}

.at-switch[data-on='true']::after {
  background: var(--color-accent, #f59e0b);
  transform: translateX(0.75rem);
}

[dir='rtl'] .at-switch[data-on='true']::after {
  transform: translateX(-0.75rem);
}

/* ── Bulk bar ───────────────────────────────────────────────────────────────── */

.at-bulkbar {
  position: sticky;
  bottom: 0.75rem;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: fit-content;
  margin: 0.875rem auto 0;
  padding: 0.5rem 0.625rem;
  padding-inline-start: 1rem;
  background: color-mix(in srgb, var(--color-surface, #ffffff) 92%, transparent);
  backdrop-filter: blur(0.75rem) saturate(140%);
  border: 1px solid color-mix(in srgb, var(--color-accent, #f59e0b) 22%, var(--color-border, #e5e7eb));
  border-radius: 9999px;
  box-shadow:
    0 0.5rem 1.5rem rgb(0 0 0 / 0.18),
    0 0 1.5rem -0.7rem color-mix(in srgb, var(--color-accent, #f59e0b) 65%, transparent);
}

/* Stack above the docked pager rather than over it. */
.at-bulkbar.is-above-pager {
  bottom: 3.75rem;
}

.at-bulkbar-count {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: var(--color-accent, #f59e0b);
  white-space: nowrap;
}

.at-bulkbar-in {
  animation: at-bulkbar-in 0.32s var(--at-dock);
}

@keyframes at-bulkbar-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ── Pager ──────────────────────────────────────────────────────────────────── */

.at-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.625rem;
  flex-wrap: wrap;
  margin-top: 0.875rem;
  padding: 0.625rem 0.875rem;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary, var(--color-text-muted, #6b7280));
}

/* Paging is the control you reach for most on a long list, so it gets a fixed place
   to live rather than hovering over the rows it pages through. */
.at-pagination.is-docked {
  position: sticky;
  bottom: 0;
  z-index: 9;
}

.at-range {
  margin-inline-end: auto;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.at-page-btn,
.at-page-size {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 2rem;
  height: 1.875rem;
  justify-content: center;
  padding: 0 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border, #e5e7eb);
  background: transparent;
  color: var(--color-text, #111827);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    opacity 0.18s ease;
}

.at-page-btn:hover:not(:disabled),
.at-page-size:hover {
  background: var(--color-muted, #f3f4f6);
}

.at-page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* The current page is "disabled" so it isn't clickable — but it's the one thing here
   that should read at full strength. */
.at-page-btn.is-current {
  background: var(--color-accent, #f59e0b);
  border-color: var(--color-accent, #f59e0b);
  color: var(--color-accent-fg, var(--color-background, #ffffff));
  opacity: 1;
  cursor: default;
}

.at-gap {
  padding: 0 0.25rem;
}

/* ── Cards: the same markup, a different layout ─────────────────────────────── */

.advanced-table[data-view='cards'] .at-wrap {
  background: transparent;
  border: 0;
  border-radius: 0;
  overflow: visible;
}

.advanced-table[data-view='cards'] .at-table {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
  gap: var(--at-card-gap);
}

.advanced-table[data-view='cards'] thead {
  display: none;
}

.advanced-table[data-view='cards'] tbody {
  display: contents;
}

.advanced-table[data-view='cards'] tbody tr {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
  padding: var(--at-card-pad);
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.875rem;
}

.advanced-table[data-view='cards'] tbody tr:hover {
  border-color: var(--color-accent, #f59e0b);
}

.advanced-table[data-view='cards'] .at-row:hover > td:first-child::before {
  content: none;
}

.advanced-table[data-view='cards'] td {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  padding: 0;
  border-bottom: 0;
}

.advanced-table[data-view='cards'] .at-cell-label {
  display: block;
  flex: 0 0 auto;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary, var(--color-text-muted, #6b7280));
}

/* A pinned rail is a horizontal-scroll affordance, and a card has no sideways. */
.advanced-table[data-view='cards'] .at-actions-col {
  position: static;
  background: transparent;
}

.advanced-table[data-view='cards'] .at-actions-col::after {
  content: none;
}

.advanced-table[data-view='cards'] .at-actions :deep(button) {
  opacity: 1;
}

.advanced-table[data-view='cards'] .at-check {
  width: auto;
  justify-content: flex-start;
}

/* Whole-width rows: empty states and skeleton spans. */
.advanced-table[data-view='cards'] tr:has(> td[colspan]) {
  grid-column: 1 / -1;
}

.advanced-table[data-view='cards'] td[colspan] {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .at-sweep,
  .at-skeleton,
  .at-bulkbar-in {
    animation: none;
  }

  .at-switch,
  .at-switch::after {
    transition: none;
  }
}
</style>

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/ui/AppTable.vue');
let content = fs.readFileSync(file, 'utf8');

// 1. Add types
content = content.replace(
  'export interface TableColumn {',
  `export interface TableFilter {
  key: string;
  label: string;
  type: 'select' | 'text';
  options?: string[];
}

export interface TableRowAction {
  label: string;
  icon?: string;
  danger?: boolean;
  onClick: (row: any) => void;
}

export interface TableBulkAction {
  label: string;
  danger?: boolean;
  onClick: (selectedRows: any[]) => void;
}

export interface TableColumn {`
);

// 2. Add Props
content = content.replace(
  '  pageSizeOptions?: number[];\n}',
  `  pageSizeOptions?: number[];
  filters?: TableFilter[];
  rowActions?: TableRowAction[];
  selectable?: boolean;
  bulkActions?: TableBulkAction[];
}`
);

// 3. Add Defaults
content = content.replace(
  '  pageSizeOptions: () => [10, 15, 25, 50],\n});',
  `  pageSizeOptions: () => [10, 15, 25, 50],
  filters: () => [],
  rowActions: () => [],
  selectable: false,
  bulkActions: () => [],
});`
);

// 4. Add Imports
content = content.replace(
  'import AppModal from "./AppModal.vue";',
  'import AppModal from "./AppModal.vue";\nimport AppPopover from "./AppPopover.vue";'
);

// 5. Add Emits
content = content.replace(
  '  search: [query: string];\n}>();',
  `  search: [query: string];
  filterChange: [filters: Record<string, string>];
  selectionChange: [selectedRows: any[]];
}>();`
);

// 6. Add State & Filter/Selection Methods
content = content.replace(
  '// Column toggle',
  `// ÔöÇÔöÇ Selection & Filters ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
const selectedRowKeys = ref<Set<string | number>>(new Set());
const activeFilters = ref<Record<string, string>>({});

function getSelectedRows() {
  if (!Array.isArray(props.data)) return [];
  return props.data.filter((row, i) => selectedRowKeys.value.has(getRowKey(row, i)));
}

const isAllSelected = computed(() => {
  if (displayData.value.length === 0) return false;
  return displayData.value.every((row, i) => selectedRowKeys.value.has(getRowKey(row, i)));
});

function toggleAll() {
  if (isAllSelected.value) {
    for (let i = 0; i < displayData.value.length; i++) {
      selectedRowKeys.value.delete(getRowKey(displayData.value[i], i));
    }
  } else {
    for (let i = 0; i < displayData.value.length; i++) {
      selectedRowKeys.value.add(getRowKey(displayData.value[i], i));
    }
  }
  emit('selectionChange', getSelectedRows());
}

function toggleRow(row: any, i: number) {
  const k = getRowKey(row, i);
  if (selectedRowKeys.value.has(k)) {
    selectedRowKeys.value.delete(k);
  } else {
    selectedRowKeys.value.add(k);
  }
  emit('selectionChange', getSelectedRows());
}

function onFilterChange() {
  clientPag.first();
  if (props.serverPaginated) emit('filterChange', { ...activeFilters.value });
}

watch(activeFilters, () => {
  onFilterChange();
}, { deep: true });

// Column toggle`
);

// 7. Update Filter Logic
content = content.replace(
  '  if (props.searchable && searchQuery.value) {',
  `  if (props.filters && props.filters.length > 0) {
    result = result.filter(row => {
      for (const filter of props.filters!) {
        const val = activeFilters.value[filter.key];
        if (val) {
          const rowVal = String(getValue(row, filter.key)).toLowerCase();
          if (!rowVal.includes(val.toLowerCase())) return false;
        }
      }
      return true;
    });
  }
  if (props.searchable && searchQuery.value) {`
);

// 8. Toolbar UI
const oldToolbar = `<div
      v-if="searchable || $slots['toolbar-end']"
      class="mb-3 flex w-full min-w-0 items-center gap-2"
    >
      <div v-if="searchable" class="relative min-w-0 flex-1 sm:max-w-sm">
        <AppIcon
          name="icon-[heroicons-outline--magnifying-glass]"
          :size="1.125"
          class="text-text-muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
        />
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          :placeholder="searchPlaceholder"
          class="border-border bg-surface text-text placeholder:text-text-muted/60 w-full rounded-xl border py-2 pe-9 ps-9 text-sm transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="text-text-muted hover:text-text absolute end-2.5 top-1/2 -translate-y-1/2 transition-colors"
          aria-label="Clear search"
          @click="
            searchQuery = '';
            searchInputRef?.focus();
          "
        >
          <AppIcon name="icon-[heroicons-outline--x-mark]" :size="1" />
        </button>
      </div>
      <div class="flex items-center gap-2">
        <slot name="toolbar-end" />
      </div>
    </div>`;

const newToolbar = `<div
      v-if="searchable || $slots['toolbar-end'] || filters?.length || bulkActions?.length"
      class="mb-3 flex flex-wrap w-full min-w-0 items-center justify-between gap-3"
    >
      <div class="flex flex-wrap items-center gap-2 flex-1">
        <div v-if="searchable" class="relative min-w-0 max-w-xs flex-1">
          <AppIcon
            name="icon-[heroicons-outline--magnifying-glass]"
            :size="1.125"
            class="text-text-muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
          />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="border-border bg-surface text-text placeholder:text-text-muted/60 w-full rounded-xl border py-2 pe-9 ps-9 text-sm transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="text-text-muted hover:text-text absolute end-2.5 top-1/2 -translate-y-1/2 transition-colors"
            aria-label="Clear search"
            @click="
              searchQuery = '';
              searchInputRef?.focus();
            "
          >
            <AppIcon name="icon-[heroicons-outline--x-mark]" :size="1" />
          </button>
        </div>

        <template v-if="filters?.length">
          <div v-for="filter in filters" :key="filter.key" class="relative">
            <select
              v-if="filter.type === 'select'"
              v-model="activeFilters[filter.key]"
              class="h-9 rounded-xl border border-border bg-surface px-3 py-1.5 pe-8 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 appearance-none cursor-pointer"
            >
              <option value="">{{ filter.label }}</option>
              <option v-for="opt in filter.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <AppIcon v-if="filter.type === 'select'" name="icon-[heroicons-outline--chevron-down]" :size="0.875" class="absolute end-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              v-else-if="filter.type === 'text'"
              v-model="activeFilters[filter.key]"
              type="text"
              :placeholder="filter.label"
              class="h-9 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 placeholder:text-text-muted/60"
            />
          </div>
        </template>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <div v-if="selectable && selectedRowKeys.size > 0 && bulkActions?.length" class="flex items-center gap-2">
          <span class="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-md">{{ selectedRowKeys.size }} selected</span>
          <AppButton 
            v-for="(action, idx) in bulkActions" 
            :key="idx"
            size="sm"
            :variant="action.danger ? 'danger' : 'surface'"
            @click="action.onClick(getSelectedRows())"
          >
            {{ action.label }}
          </AppButton>
        </div>
        <slot name="toolbar-end" />
      </div>
    </div>`;

content = content.replace(oldToolbar, newToolbar);

// 9. Table Header Checkbox & Actions Header
content = content.replace(
  '<tr class="bg-muted/60">',
  `<tr class="bg-muted/60">
              <th v-if="selectable" class="w-[3rem] px-4 py-3 text-start sticky-actions-th" style="inset-inline-start: 0; inset-inline-end: auto; z-index: 12">
                <input type="checkbox" :checked="isAllSelected" @change="toggleAll" class="rounded border-border text-accent focus:ring-accent focus:ring-2 bg-surface cursor-pointer w-4 h-4" />
              </th>`
);

content = content.replace(
  '</tr>\n          </thead>',
  `  <th v-if="rowActions?.length" class="px-4 py-3 text-end sticky-actions-th w-[0.0625rem]"></th>
            </tr>
          </thead>`
);

// 10. Table Row Checkbox & Actions Cell
content = content.replace(
  /class="table-row-data border-border\/40 border-b transition-all duration-300 ease-out last:border-b-0 hover:bg-accent\/\[0.04\] hover:shadow-\[inset_0.125rem_0_0_0_var\(--color-accent\)\].*"/,
  `class="table-row-data border-border/40 border-b transition-all duration-300 ease-out last:border-b-0 hover:bg-accent/[0.04] hover:shadow-[inset_0.125rem_0_0_0_var(--color-accent)]"
              :class="selectedRowKeys.has(getRowKey(row, index)) ? 'bg-accent/[0.03]' : ''"`
);

content = content.replace(
  ':class="selectedRowKeys.has(getRowKey(row, index)) ? \'bg-accent/[0.03]\' : \'\'"\n            >',
  `:class="selectedRowKeys.has(getRowKey(row, index)) ? 'bg-accent/[0.03]' : ''"\n            >
              <td v-if="selectable" class="w-[3rem] px-4 py-3 text-start sticky-actions-td" style="inset-inline-start: 0; inset-inline-end: auto; z-index: 11">
                <input type="checkbox" :checked="selectedRowKeys.has(getRowKey(row, index))" @change="toggleRow(row, index)" class="rounded border-border text-accent focus:ring-accent focus:ring-2 bg-surface cursor-pointer w-4 h-4" />
              </td>`
);

content = content.replace(
  '</tr>\n          </tbody>',
  `  <td v-if="rowActions?.length" class="px-4 py-3 text-end sticky-actions-td w-[0.0625rem]">
                <AppPopover placement="bottom-end">
                  <template #trigger="{ toggle }">
                    <button type="button" @click.stop="toggle" class="rounded p-1 text-text-muted hover:bg-muted hover:text-text transition-colors cursor-pointer">
                      <AppIcon name="icon-[heroicons-outline--ellipsis-horizontal]" :size="1.25" />
                    </button>
                  </template>
                  <template #default="{ close }">
                    <div class="flex flex-col min-w-[8rem] bg-surface rounded-lg shadow-lg border border-border p-1">
                      <button 
                        v-for="(action, idx) in rowActions" 
                        :key="idx"
                        type="button"
                        class="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-muted text-start transition-colors cursor-pointer"
                        :class="action.danger ? 'text-error hover:bg-error/10' : 'text-text'"
                        @click.stop="() => { action.onClick(row); close(); }"
                      >
                        <AppIcon v-if="action.icon" :name="action.icon" :size="1" />
                        {{ action.label }}
                      </button>
                    </div>
                  </template>
                </AppPopover>
              </td>
            </tr>
          </tbody>`
);

// 11. Skeleton rows adjustment
content = content.replace(
  '<tr\n                v-for="i in skeletonRows"',
  `<tr
                v-for="i in skeletonRows"`
);
// We need to add the TD to skeleton rows too
content = content.replace(
  'v-for="i in skeletonRows"\n                :key="`skeleton-${i}`"\n                class="border-border/40 border-b"\n              >',
  `v-for="i in skeletonRows"
                :key="\`skeleton-\${i}\`"
                class="border-border/40 border-b"
              >
                <td v-if="selectable" class="px-4 py-3.5"><div class="bg-muted h-4 w-4 animate-pulse rounded" /></td>`
);
content = content.replace(
  '</template>\n\n            <tr v-else-if="displayData.length === 0">',
  `  <td v-if="rowActions?.length" class="px-4 py-3.5"><div class="bg-muted h-4 w-4 ms-auto animate-pulse rounded" /></td>
              </tr>
            </template>

            <tr v-else-if="displayData.length === 0">`
);

fs.writeFileSync(file, content);
console.log('AppTable updated!');

// Copy files to docs
const docsUi = path.join(__dirname, '../../vuetail-docs/src/components/ui');
if (!fs.existsSync(docsUi)) fs.mkdirSync(docsUi, { recursive: true });

fs.copyFileSync(file, path.join(docsUi, 'AppTable.vue'));
fs.copyFileSync(path.join(__dirname, '../components/ui/AppPopover.vue'), path.join(docsUi, 'AppPopover.vue'));
fs.copyFileSync(path.join(__dirname, '../components/ui/AppBadge.vue'), path.join(docsUi, 'AppBadge.vue'));
console.log('Files copied to vuetail-docs!');


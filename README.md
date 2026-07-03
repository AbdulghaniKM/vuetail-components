# vuetail-components

Personal component registry for [vuetail-template](https://github.com/AbdulghaniKM/vuetail-template).

Components and composables are fetched on demand via the CLI built into the template — no npm install, no lock files, full ownership of every file.

## Structure

```
/components
  /ui
    AppButton.vue
    AppModal.vue
    AppToast.vue
    ThemeToggle.vue
    ... (all UI components)
    /Fields
      AppForm.vue
      InputField.vue
      Select.vue
      DatePicker.vue
      ... (form fields)
/composables
  useToast.ts
  useTheme.ts
  useAppUi.ts
  ... (all composables)
registry.json   ← index for the `list` command
```

## Usage

From any project cloned from `vuetail-template`:

```bash
# Add a component
pnpm add-component AppButton
pnpm add-component AppModal

# Add a composable
pnpm add-composable useToast
pnpm add-composable useTheme
pnpm add-composable useAppUi

# See what's available
pnpm add-component list
pnpm add-composable list
```

Files are dropped directly into `src/components/ui/` or `src/composables/` — you own the code from that point on.

Some components depend on template libs (`FormModel`, `ThemePersistence`, config/utils). Check `registry.json` → `requires` before fetching.

---

## Component Reference

---

### AppCheckbox

A styled checkbox with indeterminate state support. Uses a real `<input type="checkbox">` so it works correctly with forms and assistive technologies.

```bash
pnpm add-component AppCheckbox
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `boolean` | `false` | Checked state (v-model) |
| `indeterminate` | `boolean` | `false` | Shows a dash instead of a checkmark — used for "select all / partial" headers |
| `disabled` | `boolean` | `false` | Disables interaction |
| `label` | `string` | — | Inline label text rendered next to the checkbox |

#### Emits

| Event | Payload | Description |
|---|---|---|
| `update:modelValue` | `boolean` | Fired on every change |

#### Examples

```vue
<!-- Basic -->
<AppCheckbox v-model="checked" label="Accept terms" />

<!-- Indeterminate (header "select all" pattern) -->
<AppCheckbox
  :model-value="isAllSelected"
  :indeterminate="isPartialSelected"
  label="Select all"
  @update:model-value="toggleAll"
/>

<!-- Disabled -->
<AppCheckbox v-model="checked" label="Read-only option" disabled />

<!-- No label — use inside a <label> or provide aria-label via $attrs -->
<AppCheckbox v-model="rowSelected" aria-label="Select row" />
```

---

### AppFilterPanel

The single, schema-driven filtering component — a standalone collapsible card that owns **all** filtering logic (UI, value shapes, and the client-side predicate engine). It reuses AppForm's `FormFieldRow[]` schema and extends it with filter-only field types, so the same field definitions can drive a form and a filter bar. The parent binds `v-model`, passes the schema, and reacts to `@apply`; nothing fetches per keystroke. `AppTable` embeds it via its `filterFields` config, and it also works standalone.

```bash
pnpm add-component AppFilterPanel
```

Field types: `text`, `email`, `number`, `select`, `phone`, `date`, `datetime` (scalar) **plus** `multiselect`, `boolean`, `dateRange`, `numberRange` (array/object value shapes ported from the old built-in table filter). Rows auto-compute a responsive grid from field count (a 3-field row → `grid-cols-1 sm:grid-cols-3`). A badge counts fields differing from `defaultValues`, and removable chips summarize each active filter.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `FilterState` | yes | Live filter state (v-model) |
| `fields` | `FilterFieldRow[]` | `[]` | Row/field schema — superset of `AppForm`'s `FormFieldRow[]` |
| `defaultValues` | `FilterState` | `{}` | Baseline that **Clear** resets to and the badge/chips diff against |
| `title` | `string` | `'Filter Panel'` | Title shown in the block header, beside the funnel icon |
| `subtitle` | `string` | `'No filters applied'` | Sub-line under the title when no filters are active |
| `loading` | `boolean` | `false` | Disables controls and shows a spinner on Apply |
| `defaultOpen` | `boolean` | `false` | Start with the panel expanded |
| `chips` | `boolean` | `true` | Show removable active-filter chips inside the block |
| `showLabel` / `hideLabel` | `string` | `'Show'` / `'Hide'` | Header toggle-button labels for collapsed / expanded |
| `applyLabel` / `clearLabel` / `clearAllLabel` / `anyLabel` | `string` | `'Apply'` / `'Clear'` / `'Clear all'` / `'Any'` | Localizable labels |
| `rowClass` | `string` | `''` | Override the auto-computed grid class for every row |

Each `FilterField` extends `FormField` with: `type` (adds `multiselect`/`boolean`/`dateRange`/`numberRange`), `options` (multiselect items, alias of `items`), `min`/`max` (numberRange hints or date bounds), and `trueLabel`/`falseLabel` (boolean toggle labels).

#### Emits

| Event | Payload | Description |
|---|---|---|
| `update:modelValue` | `FilterState` | Fired live as fields change, and on Clear |
| `apply` | `FilterState` | User pressed **Apply** (or **Clear**, or removed a chip) — fetch now |
| `clear` | `FilterState` | Fields were reset to `defaultValues` |

#### Exported helper — `filterRows`

The panel is the single home of all filtering logic. Its predicate engine is exported as a pure function so any parent (and `AppTable`) can filter an array client-side:

```ts
import { filterRows, type FilterFieldRow } from '@/components/ui/AppFilterPanel.vue'

const visible = filterRows(rows, fields, filterState)
```

Value shapes handled: scalar (substring/equality), `(string|number)[]` (multiselect), `boolean` (tri-state), `{ from, to }` (dateRange), `{ min, max }` (numberRange). Dot-notation keys are supported.

#### Examples

```vue
<script setup lang="ts">
import { filterRows, type FilterFieldRow } from '@/components/ui/AppFilterPanel.vue'

const schema: FilterFieldRow[] = [
  [
    { key: 'name',   type: 'text',   label: 'Name' },
    { key: 'dept',   type: 'select', label: 'Department',
      items: ['Engineering', 'Design', 'Sales'] },
    { key: 'skills', type: 'multiselect', label: 'Skills',
      options: ['Vue', 'TypeScript', 'SQL'] },
  ],
  [
    { key: 'remote',    type: 'boolean',     label: 'Remote' },
    { key: 'years',     type: 'numberRange', label: 'Experience' },
    { key: 'joinedAt',  type: 'dateRange',   label: 'Joined' },
  ],
]

const defaults = { name: '', dept: '', skills: [], remote: null, years: { min: null, max: null }, joinedAt: { from: null, to: null } }
const filterState = ref({ ...defaults })
const rows = ref([/* … */])

// client-side: derive visible rows from the panel state
const visible = computed(() => filterRows(rows.value, schema, filterState.value))
</script>

<template>
  <AppFilterPanel v-model="filterState" :fields="schema" :default-values="defaults" @apply="() => {}" />
  <AppTable :data="visible" :columns="columns" />
</template>
```

For the common case, skip the manual wiring and let `AppTable` render the panel and filter itself — see **AppTable → Filtering** below.

---

### AppTable — new features

Row actions, selection, bulk actions, inline-editable cells, styled Excel export, and **filtering via `AppFilterPanel`**. All new props are optional — existing usage is unchanged.

```bash
pnpm add-component AppTable
```

#### New props

| Prop | Type | Default | Description |
|---|---|---|---|
| `filterFields` | `FilterFieldRow[]` | `[]` | Filter schema. When set, the table renders an `AppFilterPanel` above itself and filters via the panel's `filterRows` (no filtering logic lives in the table) |
| `filters` | `FilterState` | `{}` | Filter state (`v-model:filters`) |
| `filterDefaults` | `FilterState` | `{}` | Baseline the panel's **Clear** resets to |
| `filterTitle` | `string` | `'Filters'` | Panel trigger label |
| `actions` | `RowAction[]` | `[]` | Declarative per-row actions |
| `maxInlineActions` | `number` | `2` | How many actions render as buttons before collapsing into a kebab menu |
| `actionsLabel` | `string` | `''` | Header label for the auto-added actions column |
| `selectable` | `boolean` | `false` | Prepend a checkbox column for row selection |
| `selected` | `(string\|number)[]` | — | v-model for selected row keys |
| `selectionMode` | `'page' \| 'all'` | `'page'` | `'page'` — header checkbox toggles current page only. `'all'` — toggles all filtered rows; the bulk bar also gains an audit popover (on-page vs. total selected, with per-row removal) |
| `bulkActions` | `BulkAction[]` | `[]` | Actions shown in the bulk bar when rows are selected |
| `columns[].editable` | `EditableCellConfig` | — | Renders the cell as a clickable status badge. Clicking opens a popover to change its value; selecting a value calls `onChange(row, value)` |
| `columns[].truncate` | `boolean` | `false` | Truncates long text with a hover tooltip (desktop) and a tap-to-expand modal (touch) |
| `exportable` | `boolean` | `false` | Show a styled-Excel export button in the toolbar (`xlsx-js-style`) |
| `exportFileName` | `string` | `'export'` | File name (without extension) for the download |
| `exportLabel` | `string` | `'Export'` | Label on the export button |
| `exportMappers` | `Record<string, Record<string\|number, string>>` | `{}` | Per-column value→label maps so coded fields export as human text |
| `exportRtl` | `boolean` | doc `dir` | Force RTL sheet direction (defaults to the document direction at export time) |

> **Export scope:** exports the currently *filtered & sorted* dataset (all pages, not just the visible one) using only the visible data columns — booleans become `Yes`/`No`, and `exportMappers` translate coded values. The sheet gets a bold header band, zebra striping, thin borders, and auto-fitted column widths. Also exposed as a `exportToExcel()` method via template ref. Requires the `xlsx-js-style` package. Toolbar, empty state, and pagination footer now animate in with `motion-v` springs (requires `motion-v`).

#### New emits

| Event | Payload | Description |
|---|---|---|
| `update:selected` | `(string\|number)[]` | v-model for selected keys |
| `update:filters` | `FilterState` | v-model for the panel's live filter state |
| `filterApply` | `FilterState` | Fires when the panel's **Apply**/**Clear** commits — use it to refetch in server mode |
| `selectionChange` | `{ keys, rows }` | Fires whenever the selection set changes |

#### New / changed slots

| Slot | Props | Description |
|---|---|---|
| `#filter-bar` | `{ apply }` | Override the entire filter area (default renders `AppFilterPanel` from `filterFields`) |
| `#cell-actions` | `{ row }` | Override the actions cell — wins over declarative `actions` prop |
| `#bulk-actions` | `{ selectedKeys, selectedRows, clear }` | Override the bulk bar content |

#### Exported types

```ts
interface RowAction {
  key?: string
  label: string
  icon?: string
  variant?: AppButtonVariant
  danger?: boolean
  onClick: (row: any) => void | Promise<void>
  hidden?: (row: any) => boolean      // hide for specific rows
  disabled?: (row: any) => boolean    // disable for specific rows
  confirm?: boolean | {               // show confirmation dialog before firing
    title?: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
  }
}

interface BulkAction {
  key?: string
  label: string
  icon?: string
  variant?: AppButtonVariant
  danger?: boolean
  onClick: (rows: any[], keys: (string | number)[]) => void | Promise<void>
  disabled?: (rows: any[]) => boolean
  confirm?: boolean | { title?; message?; confirmLabel?; cancelLabel? }
}

// same variant union as AppBadge's `variant` prop
type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'surface' | 'outline' | 'muted'

interface EditableCellConfig {
  type: 'boolean' | 'select'
  // 'boolean' — clicking opens a "Change status to X?" Yes/No popover
  trueLabel?: string    // default 'Active'
  falseLabel?: string   // default 'Inactive'
  trueVariant?: BadgeVariant   // default 'success'
  falseVariant?: BadgeVariant  // default 'muted'
  // 'select' — clicking opens a list of options
  options?: { label: string; value: any; variant?: BadgeVariant }[]
  onChange: (row: any, value: any) => void | Promise<void>
  disabled?: (row: any) => boolean
}
```

---

#### Filtering

Pass a `filterFields` schema and the table renders an `AppFilterPanel` above itself, filtering client-side via the panel's `filterRows` (all filtering logic lives in the panel).

##### Client-side (all field types)

```vue
<script setup lang="ts">
import type { FilterFieldRow, FilterState } from '@/components/ui/AppTable.vue'

const columns = [
  { key: 'name',      label: 'Name',    sortable: true },
  { key: 'status',    label: 'Status' },
  { key: 'amount',    label: 'Amount',  sortable: true },
  { key: 'createdAt', label: 'Created', sortable: true },
  { key: 'verified',  label: 'Verified' },
]

const filterFields: FilterFieldRow[] = [
  [
    { key: 'name',   type: 'text',        label: 'Name' },
    { key: 'status', type: 'select',      label: 'Status', items: ['Active', 'Inactive', 'Pending'] },
    { key: 'tags',   type: 'multiselect', label: 'Tags',   options: ['vip', 'new', 'churned'] },
  ],
  [
    { key: 'amount',    type: 'numberRange', label: 'Amount' },
    { key: 'createdAt', type: 'dateRange',   label: 'Created' },
    { key: 'verified',  type: 'boolean',     label: 'Verified' },
  ],
]

const filters = ref<FilterState>({})
const data = ref([/* … */])
</script>

<template>
  <AppTable
    :columns="columns"
    :data="data"
    :filter-fields="filterFields"
    v-model:filters="filters"
    searchable
  />
</template>
```

##### Server-side (emit only, no client filtering)

```vue
<script setup lang="ts">
import type { FilterState } from '@/components/ui/AppTable.vue'

const page = ref(1)
const filters = ref<FilterState>({})

async function load() {
  const res = await api.getUsers({ page: page.value, filters: filters.value })
  data.value = res.items
  total.value = res.total
}

function onFilterApply(f: FilterState) {
  page.value = 1
  load()   // filters.value already synced via v-model:filters
}
</script>

<template>
  <AppTable
    :columns="columns"
    :data="data"
    :filter-fields="filterFields"
    v-model:filters="filters"
    server-paginated
    :page-number="page"
    :total-count="total"
    :total-pages="totalPages"
    @filter-apply="onFilterApply"
    @page-change="({ pageNumber }) => { page = pageNumber; load() }"
  />
</template>
```

##### Row actions — inline + kebab + confirm

```vue
<script setup lang="ts">
import type { RowAction } from '@/components/ui/AppTable.vue'

const actions: RowAction[] = [
  {
    label: 'Edit',
    icon: 'icon-[heroicons-outline--pencil]',
    onClick: (row) => router.push(`/users/${row.id}/edit`),
  },
  {
    label: 'View',
    icon: 'icon-[heroicons-outline--eye]',
    onClick: (row) => openDrawer(row),
  },
  {
    label: 'Suspend',
    danger: true,
    hidden: (row) => row.status === 'suspended',
    confirm: {
      title: 'Suspend user?',
      message: 'The user will lose access immediately.',
      confirmLabel: 'Yes, suspend',
    },
    onClick: async (row) => {
      await api.suspendUser(row.id)
      toast.success('User suspended')
    },
  },
  {
    label: 'Delete',
    danger: true,
    disabled: (row) => row.role === 'owner',
    confirm: true,   // uses default "Are you sure?" dialog
    onClick: async (row) => {
      await api.deleteUser(row.id)
      await refresh()
    },
  },
]
</script>

<template>
  <!-- Edit + View inline, Suspend + Delete in kebab -->
  <AppTable :columns="columns" :data="data" :actions="actions" :max-inline-actions="2" />
</template>
```

Actions that are slow (async) automatically show a loading spinner on the button and prevent double-fire until the promise resolves.

##### Editable status cells — click to change in place

```vue
<script setup lang="ts">
import type { TableColumn } from '@/components/ui/AppTable.vue'

const columns: TableColumn[] = [
  { key: 'name', label: 'Name' },
  {
    key: 'isActive',
    label: 'Status',
    editable: {
      type: 'boolean', // click → "Change status to Inactive?" Yes / No
      trueLabel: 'Active',
      falseLabel: 'Inactive',
      onChange: async (row, value) => {
        await api.setActive(row.id, value)
        row.isActive = value // mutate a reactive row so the badge updates immediately
      },
    },
  },
  {
    key: 'employmentStatus',
    label: 'Employment',
    editable: {
      type: 'select', // click → list of options, current one checked
      options: [
        { label: 'Active', value: 'active', variant: 'success' },
        { label: 'Terminated', value: 'terminated', variant: 'error' },
        { label: 'Deactivated', value: 'deactivated', variant: 'muted' },
      ],
      onChange: async (row, value) => {
        await api.setEmploymentStatus(row.id, value)
        row.employmentStatus = value
      },
    },
  },
]
</script>

<template>
  <AppTable :columns="columns" :data="data" />
</template>
```

The cell shows a spinner while `onChange` is pending and re-disables itself during that time, so a slow request can't be double-fired. `data` should be a `reactive()`/`ref()`-backed array (or a fresh array assigned after refetch) — mutating a plain object in place won't trigger a re-render.

##### Actions column — escape hatch via slot

```vue
<!-- Use #cell-actions to take full control of the actions cell -->
<AppTable :columns="columns" :data="data">
  <template #cell-actions="{ row }">
    <RouterLink :to="`/orders/${row.id}`" class="text-accent text-xs hover:underline">
      Open
    </RouterLink>
  </template>
</AppTable>
```

##### Row selection — page mode (default)

```vue
<script setup lang="ts">
const selected = ref<(string | number)[]>([])

function onSelectionChange({ keys, rows }) {
  console.log('selected keys:', keys)
  console.log('selected rows:', rows)
}
</script>

<template>
  <AppTable
    v-model:selected="selected"
    :columns="columns"
    :data="data"
    selectable
    selection-mode="page"
    @selection-change="onSelectionChange"
  />
  <p>{{ selected.length }} rows selected</p>
</template>
```

##### Row selection — select all filtered rows

```vue
<template>
  <!-- selection-mode="all" makes the header checkbox select every filtered row,
       not just the current page -->
  <AppTable
    v-model:selected="selected"
    :columns="columns"
    :data="data"
    :filter-fields="filterFields"
    selectable
    selection-mode="all"
    paginated
    :items-per-page="25"
  />
</template>
```

##### Bulk actions with confirm

```vue
<script setup lang="ts">
import type { BulkAction } from '@/components/ui/AppTable.vue'

const bulkActions: BulkAction[] = [
  {
    label: 'Export',
    icon: 'icon-[heroicons-outline--arrow-down-tray]',
    onClick: async (rows) => {
      await exportToCsv(rows)
      toast.success(`Exported ${rows.length} rows`)
    },
  },
  {
    label: 'Archive',
    danger: true,
    disabled: (rows) => rows.every((r) => r.archived),
    confirm: {
      title: 'Archive selected?',
      message: 'Archived items are hidden from the default view.',
      confirmLabel: 'Archive',
    },
    onClick: async (rows, keys) => {
      await api.archiveMany(keys)
      await refresh()
    },
  },
  {
    label: 'Delete',
    danger: true,
    confirm: true,
    onClick: async (rows, keys) => {
      await api.deleteMany(keys)
      await refresh()
    },
  },
]
</script>

<template>
  <AppTable
    v-model:selected="selected"
    :columns="columns"
    :data="data"
    selectable
    :bulk-actions="bulkActions"
  />
</template>
```

##### Custom bulk bar via slot

```vue
<template>
  <AppTable v-model:selected="selected" :columns="columns" :data="data" selectable>
    <template #bulk-actions="{ selectedKeys, selectedRows, clear }">
      <span class="text-sm font-medium">{{ selectedKeys.length }} selected</span>
      <AppButton label="Send email" icon="icon-[heroicons-outline--envelope]" size="sm"
        @click="sendEmail(selectedRows)" />
      <AppButton label="Clear" variant="ghost" size="sm" @click="clear" />
    </template>
  </AppTable>
</template>
```

##### Custom filter area via slot

```vue
<!-- #filter-bar overrides the default AppFilterPanel entirely -->
<template>
  <AppTable :columns="columns" :data="data">
    <template #filter-bar="{ apply }">
      <div class="my-4 rounded-xl border border-border p-3">
        <AppFilterPanel v-model="filters" :fields="filterFields" @apply="apply" />
      </div>
    </template>
  </AppTable>
</template>
```

##### Full example — selection + actions + filters

```vue
<script setup lang="ts">
import type { FilterFieldRow, RowAction, BulkAction } from '@/components/ui/AppTable.vue'

const columns = [
  { key: 'name',   label: 'Name',   sortable: true },
  { key: 'email',  label: 'Email',  truncate: true },
  { key: 'role',   label: 'Role' },
  { key: 'status', label: 'Status' },
]

const filterFields: FilterFieldRow[] = [
  [
    { key: 'role',   type: 'select', label: 'Role',   items: ['admin', 'editor', 'viewer'] },
    { key: 'status', type: 'select', label: 'Status', items: ['active', 'inactive'] },
    { key: 'name',   type: 'text',   label: 'Name' },
  ],
]

const actions: RowAction[] = [
  {
    label: 'Edit',
    icon: 'icon-[heroicons-outline--pencil]',
    onClick: (row) => openEditModal(row),
  },
  {
    label: 'Delete',
    danger: true,
    confirm: true,
    onClick: async (row) => { await api.delete(row.id); await refresh() },
  },
]

const bulkActions: BulkAction[] = [
  {
    label: 'Delete selected',
    danger: true,
    confirm: { title: 'Delete users?', message: 'This cannot be undone.' },
    onClick: async (rows, keys) => { await api.deleteMany(keys); await refresh() },
  },
]

const selected = ref<(string | number)[]>([])
const filters = ref({})
const { data, refresh } = await useUsers()
</script>

<template>
  <AppTable
    v-model:selected="selected"
    v-model:filters="filters"
    :columns="columns"
    :data="data"
    :filter-fields="filterFields"
    :actions="actions"
    :bulk-actions="bulkActions"
    :max-inline-actions="1"
    selectable
    searchable
    paginated
    :items-per-page="20"
    show-column-toggle
    columns-visibility-key="users-table"
    row-key="id"
  />
</template>
```

---

#### Back-compat guarantee

All new props default to values that produce zero behavior change:

| Condition | Result |
|---|---|
| No `filterFields` prop | Filter panel hidden, filter pipeline is a no-op |
| No `actions` prop, no `#cell-actions` slot | Actions column not added |
| No `selectable` prop | No checkbox column, no bulk bar |
| No `bulkActions` prop | Bulk bar still shows row count + "Clear" when `selectable` is true |
| Existing `columns` array with a `key: 'actions'` entry | That column is used as-is; no synthetic actions column is appended |

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

---

### RibbonField

An animated canvas field of two woven ribbons, with an optional word threaded through the weave. Decorative by default (`aria-hidden`), theme-aware, and built for use as a hero backdrop.

The weave is **derived, not drawn**. Both centrelines are mirrored sinusoids, so they meet wherever `sin` is zero; giving each ribbon the depth `z = ±cos(ωu + φ)` forces them to opposite depth at every meeting, and which one is in front flips at each crossing. A painter's algorithm (`quads.sort((a, b) => a.z - b.z)`) resolves the whole thing — no mask, no clip, no crossing coordinates to solve for.

```bash
pnpm add-component RibbonField
```

Pulls in `useReducedMotion`, which needs `@vueuse/core`.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `word` | `string` | — | Woven into the ribbons at z = 0. Pass it already cased — nothing is uppercased for you. Omit for bare ribbons |
| `ramps` | `readonly (readonly string[])[]` | — | Two ramps of CSS colors, shadow → highlight, replacing the theme-derived ones. Any stop count works |
| `wordColor` | `string` | `var(--color-text)` | Fill for the word. Any CSS color |
| `interactive` | `boolean` | `true` | Set `false` for a decorative field that ignores the pointer — no grab cursor, no listeners bound |

**Motion**

| Prop | Type | Default | Description |
|---|---|---|---|
| `speed` | `number` | `1` | Scales drift and twist together. `0` freezes the motion but keeps drawing |
| `paused` | `boolean` | `false` | Holds the current frame and stops the loop — cheaper than `speed: 0`, and the phase is kept |
| `phase` | `number` | `0` | Seconds of drift to begin with, so two fields on a page are not in lockstep. Applied once |

**Composition**

| Prop | Type | Default | Description |
|---|---|---|---|
| `waves` | `number` | `1.35` / `1` narrow | Crossings across the field |
| `amplitude` | `number` | `1` | Scales how far the ribbons swing from the centre line |
| `thickness` | `number` | `1` | Scales the band's height |

**Typography**

| Prop | Type | Default | Description |
|---|---|---|---|
| `wordAlpha` | `number` | `0.82` | Translucency of the word, **clamped to 0.95** — see below |
| `wordWeight` | `number \| string` | `800` | Weight the word is set in |
| `wordFont` | `string` | `var(--font-primary)` | Font stack for the word |

**Interaction and cost**

| Prop | Type | Default | Description |
|---|---|---|---|
| `pull` | `number` | `0.8` | How hard the pointer pulls the ribbon toward it |
| `pullReach` | `number` | `0.17` / `0.28` narrow | How far along the ribbon the pull reaches, as a fraction of width |
| `quality` | `'auto' \| 'low' \| 'high'` | `'auto'` | Quad density. `auto` is ~1 per 6px of width; `low` pins 64, `high` pins 150 |

`wordAlpha` is clamped below 1 rather than trusted, because 1 is not a stylistic
choice — an opaque word erases the half of the strip behind it, so the ribbon
reaches a letter and stops instead of passing behind it. The clamp is the
component refusing to render its own defining feature away.

`speed` and `paused` are not the same knob. `speed: 0` still schedules a frame
every tick and redraws an unchanging picture; `paused` stops the loop. Phase is
accumulated rather than derived from the frame clock and lives outside the render
effect, so changing speed bends the motion instead of jumping it, and pausing then
resuming carries on from where it stopped.

The component renders a single `<canvas>`, so any `class` you pass lands on it. It is `size-full`, meaning **the height comes from the parent** — a container with no height renders nothing.

#### Colors

With no `ramps`, each ribbon's 5-stop ramp is built at runtime from the theme tokens:

- ribbon 0 ← `--color-primary`
- ribbon 1 ← `--color-secondary`, or a drained `--color-primary` where the theme defines no distinct secondary

The tokens are re-read on every route a theme can change through — the `data-theme` attribute, the injected `#app-theme-variables` stylesheet that `useThemeCustomizer` rewrites, the `data-vt-preset` attribute, and the OS preference while the app follows the system — so the field tracks the app instead of drifting from it.

#### Responsiveness

Everything scales off the container, and below 480px wide the field is treated as a narrow column rather than a band:

| | Wide | Narrow (< 480px) |
|---|---|---|
| Waves across the field | 1.35 | 1 — crossings otherwise land within a thumb's width of each other |
| Word fit | 96% of width | 86%, so it isn't wedged against both edges |
| Grab radius | 17% of width | 28% — a fingertip is blunter than a cursor |

Quad count follows width (~1 per 6px, clamped to 64–150) rather than a flat 150, which roughly halves the per-frame fill on a phone with no visible difference — `quality` overrides it either way. Drawing also stops entirely while the field is scrolled out of view or the tab is hidden, and `prefers-reduced-motion` renders one held frame instead of animating.

#### Touch

`touch-action: pan-y` is the whole touch story: vertical swipes are handed back to the browser so the page still scrolls past the field, while horizontal and diagonal drags arrive as pointer events and pull the ribbons. `touch-none` would make a full-height hero a scroll trap; the default (no `touch-action`) makes the field ungrabbable on a phone. One pointer owns the pull at a time, and a pointer the browser cancels — which is what a swipe-turned-scroll produces — releases it.

#### Examples

```vue
<!-- Hero. The word is inside the canvas, which is what lets the ribbons thread
     through the letters instead of lying flat across them. There is no text in
     the section, so keep the page's real h1 in the section below. -->
<template>
  <section class="relative isolate h-dvh overflow-hidden bg-surface">
    <RibbonField class="absolute inset-0" word="VUETAIL" />
    <div
      class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background"
      aria-hidden="true"
    />
  </section>
</template>
```

```vue
<!-- Explicit ramps, for a field that should not track the theme -->
<RibbonField
  word="VUETAIL"
  :ramps="[
    ['#0b5c34', '#0e7a45', '#1fa85c', '#2fd070', '#7cebae'],
    ['#16281e', '#1f3a2c', '#3e6a52', '#9db3a6', '#e8e4da'],
  ]"
/>
```

```vue
<!-- Decorative backdrop: no word, no pointer handling -->
<div class="relative h-64 overflow-hidden rounded-xl">
  <RibbonField class="absolute inset-0 opacity-40" :interactive="false" />
  <div class="relative p-8">
    <h2 class="text-2xl font-semibold text-text">Your content, over the field</h2>
  </div>
</div>
```

#### Things that look simplifiable but are not

| Don't | Because |
|---|---|
| Drop `{ flush: 'post' }` on the `watchEffect` | The default `pre` flush runs before the DOM updates, so the canvas ref is `null` and the effect returns early — the field silently never renders |
| Read `props.word` only inside `draw` | Vue tracks synchronous reads, so it would never be a dependency and changing the word would not restart the loop |
| Leave `seal` on in the front pass | A stroke laid over its own fill at partial alpha blends twice along every seam — ~300 of those read as vertical banding across the word |
| Raise `WORD_ALPHA` to 1 | An opaque word erases the half of the strip behind it, so the ribbon reaches a letter and stops instead of passing behind it |
| Remove the injected crossing samples | The over/under boundary can then only land on a uniform sample, so it steps along in visible jumps instead of sliding |

---

### AppDock

A floating macOS-style dock — a glass navigation pill pinned to any edge of the viewport (**bottom**, **left**, **right** or **top**). Tiles are colour-tagged route links; the bar drags between edges with a live ghost preview and FLIPs into its new place with a sampled spring.

```bash
pnpm add-component AppDock
```

Pulls in `AppIcon`, `useDockPosition`, `useDockDrag`, `useDockFlight` and `useKeyboard`. Needs `@vueuse/core` and `vue-router` — the first registry component that requires the router.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `DockItem[] \| DockSection[]` | — | **Required.** Flat, or grouped into sections that render with a separator between them |
| `role` | `string \| null` | `null` | Filters items carrying `roles`. An item with no `roles` is always visible |
| `ariaLabel` | `string` | `'Main'` | Accessible name for the underlying `<nav>` |
| `scope` | `'viewport' \| 'container'` | `'viewport'` | What the dock is pinned to — see below. Read once at setup |
| `position` | `DockPosition` | — | Optional `v-model:position`. Leave it off and the dock owns its edge |
| `edges` | `DockPosition[]` | all four | Edges the dock may occupy. A single edge also hides the grip |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tile scale — 2.25 / 2.75 / 3.25rem. The grip and icons follow |
| `lift` | `number` | `0.375` | Hover lift in rem. `0` disables it; neighbours get a third |
| `storageKey` | `string` | `'app-dock-position'` | Where a viewport dock persists its edge. Ignored when contained |

```ts
interface DockItem {
  label: string;                    // tile aria-label + hover label
  to?: string;                      // RouterLink target; also the key, so it must be unique
  icon: string;                     // Iconify name — see the warning below
  hue?: DockHue;                    // defaults to 'primary'
  roles?: readonly string[];        // omit = visible to everyone
  onClick?: (item) => void;         // an item with no `to` is a button, not a link
  badge?: number | string;          // corner badge; 0 and '' render nothing, >99 becomes '99+'
  exact?: boolean;                  // match this route exactly, not everything beneath it
  disabled?: boolean;               // dimmed, unfocusable, inert
}

type DockPosition = 'bottom' | 'left' | 'top' | 'right';   // also the grip's cycle order
type DockHue = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
```

An item with a `to` renders as a `RouterLink`; an item with only `onClick` renders as a
`<button>` and keys off its label, so the dock can carry actions — search, compose, a command
palette — alongside navigation.

#### Slots

| Slot | Scope | For |
|---|---|---|
| `icon` | `{ item, active, index }` | Replaces a tile's icon — an avatar, a custom SVG, a status ring |
| `leading` | — | Pinned inside the pill before the tile strip, so it never scrolls away |
| `trailing` | — | Pinned after the strip — a settings button, a theme toggle |

```vue
<AppDock :items="items">
  <template #trailing>
    <ThemeToggle />
  </template>
</AppDock>
```

#### ⚠️ Write icons as `icon-[solar--home-2-linear]`, not `solar:home-2-linear`

`AppIcon` accepts both, but only the bracket form survives a production build. Tailwind's iconify plugin emits a class only when it can find it spelled out in scanned source, and the colon form never matches because `AppIcon` converts it at runtime — long after Tailwind has run. The colon form appears to work in dev whenever some *other* file in the project happens to use the same icon, which makes this fail late and look random.

#### Colors

The pill is deliberately dark in both themes — it floats over the page as system furniture rather than a surface belonging to it — and ships self-contained in the component's `<style>` block, so there is nothing to paste into `style.css`.

The **tiles** are the part that follows the theme: `hue` names your own semantic tokens, so a light/dark swap, a preset switch or a `useThemeCustomizer` change carries the dock with it. An active tile is a 25% tint of its hue with the hue as ink and a glow beneath, rather than the solid fill the design was first drawn with — a solid fill needs ink picked per colour to stay legible, and these hues are whatever the app's tokens happen to be.

#### Mounting it

The dock is `position: fixed` and renders outside the content flow, so it belongs in a layout, not a page. The layout also has to reserve room on the same edge — bind `CONTENT_CLEARANCE` to the **preview** position, not the committed one, and the whole page previews the move while a drag is in flight.

```vue
<script setup lang="ts">
  import { computed } from 'vue';
  import AppDock, { CONTENT_CLEARANCE, type DockItem } from '@/components/ui/AppDock.vue';
  import { useDockPosition } from '@/composables/useDockPosition';
  import { useDockDragState } from '@/composables/useDockDrag';

  const items: DockItem[] = [
    { label: 'Home',     to: '/',         icon: 'icon-[solar--home-2-linear]',   hue: 'primary' },
    { label: 'Orders',   to: '/orders',   icon: 'icon-[solar--bag-linear]',      hue: 'success' },
    { label: 'Settings', to: '/settings', icon: 'icon-[solar--settings-linear]', hue: 'accent' },
  ];

  const { dockPosition } = useDockPosition();
  const { previewPosition } = useDockDragState();
  const previewDockPosition = computed(() => previewPosition.value ?? dockPosition.value);
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <AppDock :items="items" />

    <div
      class="mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out"
      :class="CONTENT_CLEARANCE[previewDockPosition]"
    >
      <slot />
    </div>
  </div>
</template>
```

Z-index budget: the dock is `z-40`, its drag ghost `z-30`, hover labels `z-10` inside the pill. Keep modals and overlays above `z-40`.

#### Scope — viewport or container

`scope="viewport"` (the default) is the real thing: `position: fixed`, edges measured against the window, and the edge itself shared through a module-scope singleton and persisted to `localStorage`. That singleton is deliberate — the page layout has to reflow toward the edge being hovered, so the dock and the layout have to read one value. It also means **only one viewport dock may be mounted at a time**.

`scope="container"` pins the dock to its nearest positioned ancestor with `position: absolute` instead, measures the drag edges against that box, and keeps its edge private to the instance. Several can coexist, each minding its own container, and none of them touch `localStorage`. Give the container `position: relative` and `overflow: hidden`.

```vue
<div class="relative h-80 overflow-hidden rounded-xl border border-border">
  <YourScreenContent />
  <AppDock v-model:position="edge" scope="container" :items="items" />
</div>
```

Use it for an embedded app frame, a settings preview, or a demo — anywhere a dock should belong to a box rather than the screen. The drag, the ghost preview, the flight and the grip all behave identically; only what counts as an "edge" changes.

`v-model:position` is a mirror, not a second source of truth: the dock still owns the edge, and a bound value is pushed in and echoed back out. Bind it when something outside has to follow along — a contained dock's edge is otherwise invisible to its container, which still has to reserve space on the right side.

#### Behaviour

| | |
|---|---|
| Edge | `bottom` / `left` / `right`, persisted to `localStorage['app-dock-position']` |
| Drag | Grip handle, pointer-captured, 4px threshold, ghost preview on the target edge |
| Click the grip | No drag → cycles `bottom → left → right → bottom` |
| Escape | Cancels an in-flight drag and glides the bar home |
| Flight | FLIP + a spring sampled into `linear()` (420ms), bezier fallback |
| Hover | Hovered tile lifts `0.375rem`, neighbours `0.125rem` — never a scale, so the dock cannot reflow |
| Overflow | The tile strip scrolls when crowded; the grip never scrolls away, and labels still escape the pill |
| Active tile | Most-specific match wins, on a `/` boundary — `/orders-archive` does not light up `/orders` |
| Below 768px | A **viewport** dock locks to `bottom` and hides its grip, whatever is stored — a floating side rail eats a phone screen. A contained dock is sized by its box, not the device, so it is left alone |
| Badges | `0` and `''` render nothing; numbers above 99 become `99+` |
| A11y | `aria-current="page"`, per-tile `aria-label`, focus rings drawn against the pill, `prefers-reduced-motion`, `prefers-reduced-transparency`, and opaque fallbacks where `backdrop-filter` is unsupported |

#### Things that look simplifiable but are not

| Don't | Because |
|---|---|
| Give `DOCK_SCROLLER` a plain `overflow-x-auto` without its negative margin and matching padding | Setting overflow on one axis computes the other from `visible` to `auto`, which clips hover labels and lifted tiles against the pill's inner edge. The padding is the clip region; the negative margin cancels its contribution to layout |
| Drop `pointer-events-none` from the scroller | That transparent overhang is large, and it would swallow every click aimed at the page behind the dock |
| Turn the hover lift into a scale | A tile that grows resizes its slot, which shoves the row around and reads as loud at any amplitude worth seeing |
| Re-dock the bar mid-drag | The ghost plus the page reflowing behind it already show where it lands; hopping between edges under the cursor is unreadable |
| Commit the new edge after dropping the lift | The flight's pre-flush pass has to measure the bar where the cursor left it, lift included, or it flies from the wrong place |
| Build the class maps from a template string | Tailwind only ships classes it can find as literal strings, so every position variant is spelled out |
| Compare raw pixel distances in `nearestEdge` | Distances are normalised against the box's own width and height first. In a wide box the top and bottom are nearer in pixels almost everywhere, so the side edges become unreachable |

#### Theming the chrome

Every colour in the pill is a custom property on `.dock-root`, so an app that wants a different dock overrides them from a parent rather than editing the component:

```css
.my-layout {
  --dock-chrome: #1a1523;
  --dock-glass: rgb(26 21 35 / 0.9);
  --dock-accent: #c084fc;
  --dock-badge: #f43f5e;
}
```

---

### AppNavbar

A floating nav capsule that contracts past the hero. Labels fold shut without unmounting, and a single pill travels between links instead of fading in under each one.

```bash
pnpm add-component AppNavbar
```

Pulls in `AppIcon` and `useReducedMotion`. Needs `@vueuse/core`, `vue-router` and `motion-v`.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `NavItem[]` | `[]` | The centred nav links |
| `actions` | `NavAction[]` | `[]` | Trailing controls — a CTA, a theme toggle, a language switch |
| `tone` | `'dark' \| 'surface'` | `'dark'` | A self-contained capsule, or one that follows the theme |
| `floating` | `boolean` | `true` | Inset capsule, or a flush full-width bar |
| `position` | `'top' \| 'bottom'` | `'top'` | Which edge it pins to. The panel opens away from it |
| `width` | `NavWidth` | `'xl'` | Measure at rest — match your content column |
| `compactWidth` | `NavWidth` | `'md'` | Measure once contracted |
| `contract` | `boolean` | `true` | Set `false` to pin it at its resting size |
| `contractAt` | `number` | 80% of viewport | Scroll offset, in px, at which it contracts |
| `scrollTarget` | `HTMLElement \| null` | `window` | What it measures scroll against — see below |
| `pill` | `boolean` | `true` | The travelling pill |
| `breakpoint` | `'md' \| 'lg' \| 'xl'` | `'lg'` | Below this, links collapse into the menu button |
| `blur` | `boolean` | `true` | Backdrop blur behind the capsule |

```ts
type NavWidth = 'sm' | 'md' | 'lg' | 'xl' | 'full';   // max-w-xl … max-w-full

interface NavItem {
  label: string;
  to: string;          // also the key, so it must be unique
  exact?: boolean;     // match this route exactly, not everything beneath it
  disabled?: boolean;
}

interface NavAction {
  label: string;
  icon?: string;                    // the icon-[ph--translate] form — see AppDock's warning
  to?: string;                      // a link; omit and pass onClick for a button
  onClick?: (action) => void;
  variant?: 'ghost' | 'solid';      // 'solid' is the bar's one filled element
  exact?: boolean;
  keepLabel?: boolean;              // opt this label out of folding
}
```

#### Slots

| Slot | Scope | For |
|---|---|---|
| `brand` | `{ compact }` | The lockup. `compact` is what lets it clip back to a mark as the bar contracts |
| `actions` | `{ compact }` | Replaces the rendered `actions` entirely |
| `menu` | `{ close }` | Extra rows at the foot of the open panel |

#### Why it floats

A full-width bar with a hairline under it, pinned to the top of the viewport, reads as a lid over whatever is behind it: if the page opens on an image, a rule straight across the top of it cuts the frame in half. Hiding the bar until you scrolled treats the symptom and costs the site its navigation on first paint, which is the worse trade. Inset on all sides instead — the graphic runs full bleed underneath and past it, and the bar reads as an object sitting on the page rather than a frame around it. `floating: false` is there for apps that want the flush bar anyway.

#### Why `tone="dark"` is the default

The bar crosses whatever the page is made of — a hero image, the light body, a dark footer. A bar that restyles per surface has to know where it is. One dark capsule works over all three, and it means a lockup inside it can stay on its dark artwork everywhere instead of swapping mid-scroll. `tone="surface"` is there for apps whose header sits on ordinary page background.

#### Scrolling inside an app shell

The bar listens to `window` by default. When the page scrolls inside a container instead of the document, hand it that container — otherwise it reads the document's offset, which never moves, and it stays at its resting size forever.

```vue
<template>
  <div class="h-screen overflow-hidden">
    <AppNavbar :items="items" :scroll-target="scroller" />
    <main ref="scroller" class="h-full overflow-y-auto"><slot /></main>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  const scroller = ref<HTMLElement | null>(null);
</script>
```

#### Things that look simplifiable but are not

| Don't | Because |
|---|---|
| Unmount a label instead of folding it | It strips the control's accessible name the moment the bar contracts, leaving a screen reader with an icon and nothing else. Each label stays in the DOM at `max-width: 0` |
| Put the label's padding on the collapsing span | Under `border-box` a padded box cannot be narrower than its own padding, so `max-w-0` on a `ps-2` span still measures 8px — which pushes the icon off centre by exactly that much. The padding goes on an inner span, where the parent's `overflow-hidden` clips it |
| Animate `width` instead of `max-width` | Width is laid out; the page under a fixed bar would relayout on every scroll frame of the contract |
| Write the scroll handler without rAF | A fast scroll queues a state write per scroll event. The handler coalesces to one read per frame |
| Give two navbars the same pill `layoutId` | Motion would animate one pill between the two bars. The id is minted per instance from `useId()` |
| Read `compact` from a `scroll` listener on `document` when the page scrolls in a shell | The document's offset never changes, so the bar never contracts. That is what `scrollTarget` is for |

---

### AdvancedAppTable

A data table that also knows how to stop being a table. The same column config renders as
pinned-header rows or as a grid of record cards, at two densities, and both switches are
**app-wide** — flip one table's display menu and every `AdvancedAppTable` on the page follows,
because the preference lives on `<html data-view>` / `<html data-density>` rather than in a prop.

```bash
pnpm add-component AdvancedAppTable
```

Pulls in `AppIcon`, `AppButton`, `AppCheckbox`, `AppPopover`, `useDebounce` and `useTableDisplay`.
No extra packages — the sticky rails, the card reflow, the refresh sweep and the pager are plain CSS.

This is a sibling of `AppTable`, not a replacement. Reach for **`AppTable`** when you want the
batteries-included admin grid: `AppFilterPanel` schemas, inline editable cells, confirm dialogs,
styled xlsx export. Reach for **`AdvancedAppTable`** when the list is the page — server-driven,
long, scanned more than edited — and you want the card view, the density knob, per-table column
memory, cross-page selection and a docked pager.

#### Quick start

```vue
<template>
  <AdvancedAppTable
    id="users"
    v-model:search="search"
    v-model:sort="sort"
    v-model:page="page"
    v-model:selected="selected"
    :columns="columns"
    :rows="rows"
    :total="total"
    :loading="isLoading"
    :refreshing="isFetching && !isLoading"
    server-side
    searchable
    paginated
    selectable
    exportable
    row-clickable
    :actions="actions"
    @row-click="({ row }) => router.push(`/users/${row.id}`)"
  />
</template>

<script setup lang="ts">
  import AdvancedAppTable, { type AdvancedTableColumn } from '@/components/ui/AdvancedAppTable.vue';

  const columns: AdvancedTableColumn<UserRow>[] = [
    {
      key: 'user',
      label: 'User',
      sortable: true,
      sortField: 'name',
      type: 'identity',
      copy: true,
      identity: {
        title: (u) => u.name,
        subtitle: (u) => u.email,
        image: (u) => u.avatarUrl,
        seed: (u) => u.id,
      },
    },
    { key: 'role', label: 'Role', type: 'badge', tones: { admin: '#7cb305', trainer: '#06b6d4' } },
    { key: 'level', label: 'Level', type: 'chip', sortable: true },
    { key: 'createdAt', label: 'Joined', type: 'date', mono: true, sortable: true },
    { key: 'internalRef', label: 'Ref', defaultHidden: true },
  ];
</script>
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | **Required.** Scopes the persisted hidden-column list. Two tables sharing an id share their column preferences |
| `columns` | `AdvancedTableColumn[]` | `[]` | **Required.** See below |
| `rows` | `any[]` | `[]` | The current page's rows (or every row, in client mode) |
| `rowKey` | `string \| (row) => string \| number` | `'id'` | Dot paths allowed. Selection identity depends on this |
| `loading` | `boolean` | `false` | First load — skeleton rows |
| `refreshing` | `boolean` | `false` | Background refetch — the sweep, with stale rows left readable |
| `serverSide` | `boolean` | `false` | Search, sort and paging happen upstream; `rows` renders as given |
| `total` | `number` | — | Row count behind the filters. **Required in `serverSide` mode** |
| `searchable` / `searchPlaceholder` | `boolean` / `string` | `false` / `'Search…'` | Toolbar search box |
| `search` | `string` | — | `v-model:search`. Emitted **debounced** — safe to send straight to an API |
| `searchDebounce` | `number` | `300` | ms |
| `sort` | `string` | — | `v-model:sort` — `field`, `field:desc`, or `''` |
| `paginated` | `boolean` | `false` | Show the pager |
| `page` / `limit` | `number` | — | `v-model:page` (1-based) / `v-model:limit` |
| `pageSizes` | `number[]` | `[25, 50, 100]` | Options in the rows-per-page menu |
| `showLimit` | `boolean` | `true` | Show that menu at all |
| `stickyPagination` | `boolean` | `true` | Dock the pager to the bottom of the viewport |
| `selectable` | `boolean` | `false` | Checkbox column + bulk bar |
| `selected` | `(string \| number)[]` | — | `v-model:selected`. Survives page changes so a selection can accumulate |
| `bulkActions` | `TableBulkAction[]` | `[]` | Buttons in the bulk bar |
| `actions` | `TableRowAction[]` | `[]` | Buttons in the pinned last column |
| `plainLastColumn` | `boolean` | `false` | Opt the last column out of the sticky action rail, for tables whose last column is data |
| `rowClickable` | `boolean` | `false` | Emits `rowClick`; real controls inside the row keep working |
| `rowClass` | `(row, index) => string \| undefined` | — | Extra classes per row |
| `exportable` / `exportFileName` | `boolean` / `string` | `false` / `'export'` | CSV button. The file is `{name}-YYYY-MM-DD.csv`, UTF-8 with a BOM so Excel opens it correctly |
| `exportRows` | `() => Promise<any[]>` | — | Fetch every matching row for the export instead of exporting the page you can see |
| `view` / `density` | `TableView` / `TableDensity` | — | Pin **this** table to one layout/density and hide those rows from its menu |
| `showDisplayMenu` | `boolean` | `true` | The layout / density / columns control |
| `showCount` | `boolean` | `false` | Audience size in the toolbar — the filtered total, not the page |
| `maxHeight` | `string` | `'70vh'` | Height of the scroll box in table view. Ignored in cards, which reflow to the page |
| `skeletonRows` | `number` | `5` | |

Every user-facing string is a prop: `emptyMessage`, `actionsLabel`, `columnsLabel`, `layoutLabel`,
`densityLabel`, `showAllLabel`, `displayMenuTitle`, `selectedLabel`, `clearLabel`, `prevLabel`,
`nextLabel`, `pageLabel`, `ofLabel`, `countLabel`, `exportLabel`, `copyLabel`, `copiedLabel`,
`rowTitle`, `blankLabel`, `trueLabel`, `falseLabel`.

#### Columns

```ts
interface AdvancedTableColumn<T = any> {
  key: string;                  // reads row[key] (dot paths allowed) and keys the persisted hidden state
  label: string;                // header text, menu entry, AND the field label in card mode
  sortable?: boolean;
  sortField?: string;           // the token emitted upstream; defaults to `key`
  hideable?: boolean;           // default true — set false for a structural column
  defaultHidden?: boolean;      // honoured only until this table's prefs are saved
  align?: 'start' | 'center' | 'end';
  width?: string;
  class?: string;
  headerClass?: string;
  mono?: boolean;               // metadata (dates, counts, ids) — mono, never wraps
  nowrap?: boolean;
  truncate?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'chip' | 'identity';
  value?: (row: T) => unknown;  // custom accessor
  format?: (value: unknown, row: T) => string;
  tones?: Record<string, string>;          // type 'badge' — value → hex
  hue?: TableHue | ((row: T) => TableHue); // type 'chip'
  identity?: IdentityConfig<T>;            // type 'identity'
  copy?: boolean | ((row: T) => string);   // copy button beside the value
  title?: (row: T) => string | undefined;  // per-cell tooltip
  noExport?: boolean;
}
```

`type: 'badge'` colours a categorised value: known values come from `tones`, anything else falls
back to `autoTone` — a stable hash into a fixed palette, so a free-form category keeps the same
colour on every page and across sessions. `type: 'chip'` and `type: 'identity'` use the eight-hue
palette the same way, so an avatar and a chip mix against the page identically.

```ts
type TableHue = 'lime' | 'mint' | 'aqua' | 'sky' | 'violet' | 'rose' | 'peach' | 'amber';

interface IdentityConfig<T = any> {
  title: (row: T) => string;                       // the name line
  image?: (row: T) => string | null | undefined;   // falls back to an initial on a hue-tinted disc
  subtitle?: (row: T) => string | null | undefined;// carries the copy button when `copy` is set
  code?: (row: T) => string | null | undefined;    // third line, in mono
  seed?: (row: T) => string;                       // what the stable hue hashes. Defaults to the row key
}

interface TableRowAction<T = any> {
  key?: string; label: string; icon?: string; variant?: AppButtonVariant; danger?: boolean;
  onClick: (row: T) => void | Promise<void>;
  hidden?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

interface TableBulkAction<T = any> {
  key?: string; label: string; icon?: string; variant?: AppButtonVariant; danger?: boolean;
  onClick: (rows: T[], keys: (string | number)[]) => void | Promise<void>;
  disabled?: (rows: T[]) => boolean;
}
```

#### Slots

| Slot | Scope | For |
|---|---|---|
| `cell-{key}` | `{ row, value, index, column }` | Replaces one column's cell entirely |
| `header-{key}` | `{ column }` | Replaces a non-sortable header's content |
| `actions` | `{ row, index }` | Replaces the whole action cell |
| `bulk-actions` | `{ keys, rows, clear }` | Replaces the bulk bar's buttons |
| `toolbar-start` / `toolbar-end` | — | Filters, segments, anything beside the search box |
| `surface-bar` | — | Sits next to the display menu, above the table |
| `empty` | — | Replaces the empty message |

#### Emits

| Event | Payload |
|---|---|
| `update:search` / `search` | `string` — debounced |
| `update:sort` / `sortChange` | `string` |
| `update:page` / `update:limit` | `number` |
| `pageChange` | `{ page, limit, offset }` |
| `update:selected` / `selectionChange` | `(string \| number)[]` / `{ keys, rows }` |
| `rowClick` | `{ row, index, event }` |

Exposed via `ref`: `clearSelection()`, `showAllColumns()`, `exportCsv()`, `selectedKeys`, `selectedRows`.

The module also exports `hueFor(seed)`, `tone(hex)`, `autoTone(value)` and `TABLE_HUES`, so a custom
`cell-{key}` slot can colour its own content out of the same palette the built-in cells use.

#### Display state (`useTableDisplay`)

```ts
import { useTableDisplay } from '@/composables/useTableDisplay';

const { view, density, setView, setDensity, reset } = useTableDisplay();
```

Module-level refs, persisted in `localStorage` and mirrored onto `<html>` as `data-view` and
`data-density`, so your own CSS can react to the same switch. The default is stored as *absent*,
so clearing a preference is one removal. `useHiddenColumns(tableId)` is the per-table half.

#### Behaviour contracts

These are not style preferences. Break one and the table quietly stops working.

| Rule | Why |
|---|---|
| Every table needs a **unique, stable `id`** | It keys the persisted hidden-column list. Two tables sharing an id share their columns |
| `refreshing` is `isFetching && !isLoading` | The first load shows skeletons; the sweep exists so stale rows stay readable rather than flashing away |
| A column's `label` is user-visible **three times** | Header, display menu, and the field label in card mode. Give genuinely distinct columns distinct labels |
| `total` is required in `serverSide` mode | The pager, the range and the count all read it. Without it they describe the current page instead of the result set |
| `rowKey` must actually resolve | It is the selection identity. When it returns `undefined` the row falls back to its index, and a selection stops surviving a page change |
| The last column is the pinned action rail | Pass `plainLastColumn` when your last column is real data, or it gets an opaque background and a seam shadow it does not want |
| Selection persists across pages | That is the point — you can accumulate. Call `clearSelection()` after a bulk action lands |
| Filter/search/sort changes reset to page 1 | Changing what you are looking at should not leave you on page 7 of a shorter list |

#### Things that look simplifiable but are not

| Don't | Because |
|---|---|
| Emit the search box's value directly | The input stays live but only the **debounced** value is emitted, so what a parent forwards to an API is never the half-typed string |
| Let the selection checkbox toggle itself | The click handler `preventDefault()`s and owns the state outright. On a shift-range the DOM would otherwise drift out of step with the model |
| Give the sweep to the scroll box as a `::before` | An absolutely positioned pseudo inside an `overflow: auto` box scrolls away with the content. It lives on an outer wrapper with its own clipping track |
| Put `max-height` in CSS instead of an inline style | It is an inline style precisely so card view can drop it — a capped box would clip cards, which reflow to the page instead of scrolling |
| Skip the `closest()` guard on row click | A click that landed on a button, a link or a checkbox is not a row click. The guard also bails when there is a text selection, so selecting text in a row does not navigate |
| Swap the `defaultHidden` seed for a write on mount | Seeding by *writing* would mark a table as user-configured before the user configured anything, and its defaults could never change again |

---

### AppLiquidGlass

A pane of real glass. The bevelled edge **refracts** whatever sits behind it — computed from
Snell's law, not faked with a blur — so straight lines behind the rim bend the way they do
through a physical lens.

```bash
pnpm add-component AppLiquidGlass
```

Pulls in `useLiquidGlass`. No packages: the whole effect is a generated bitmap, one SVG filter,
and one line of CSS.

Based on the technique in [kube.io/blog/liquid-glass-css-svg](https://kube.io/blog/liquid-glass-css-svg/).
That article works out the maths and does not ship an implementation; this is one.

#### Where glass belongs

Liquid Glass is a **functional layer** — controls and navigation — floating above the content.
It exists to bring focus *to* the content, so putting it *on* the content defeats it. The
adoption guide is blunt about this: "overusing this material in multiple custom controls
distracts from content and provides subpar user experience."

Three rules follow, and the component enforces the second one:

- **Don't put glass on the content layer.** Cards, article bodies, list rows: no.
- **Don't nest glass in glass.** "Layering glass on glass creates visual noise." A nested pane
  logs a development warning, because the result reads as merely muddy rather than obviously broken.
- **Don't crowd it.** Glass elements need breathing room — which is what `AppGlassContainer`'s
  `gap` is for.

Colour follows the same restraint: "be judicious with color in controls and navigation." The
`tone` system exists so a pane can carry an identity when it needs one, not so every pane should.

#### The two variants

Apple ships exactly two, and the choice is the first thing to get right.

| Variant | What it is | Use when |
|---|---|---|
| **Regular** *(default)* | Frosts and saturates, so it carries its own contrast. "The most versatile and common variant… provides legibility regardless of context" | Anywhere. If you are unsure, this one |
| **Clear** | Permanently transparent — almost no frost, and a **dimming layer** underneath instead | Only when all three hold: it sits over media-rich content, that content can take a dimming layer, and what sits on the glass is bold and bright |

Clear without its dimming layer is the single most common way to get this wrong: with no frost
of its own, legibility has nowhere to come from. `dim` defaults to `0.18` under Clear and `0`
under Regular, and it is painted *below* the frost so the blur samples it.

A variant is a set of defaults, not a lock — any prop you pass still wins.

#### How it works — five layers

```
   content          your children
   specular         a masked gradient rim: light travels around the perimeter
   tint             the tone fill, plus the tone's hairline edge
   refract          backdrop-filter: url(#…)   ← bends what the layer below produced
   blur             backdrop-filter: blur() saturate() brightness()
   dim              a black wash, Clear only
```

Blur and bend are **separate layers on purpose**. A single `backdrop-filter` chain would blur
after bending and smear the refraction away; stacking them means the bend operates on an
already-frosted image, which is the order real glass works in.

`feDisplacementMap` offsets every pixel by a vector read out of a second image — red is the x
offset, green is y, and 128 means "don't move". So the whole job is *computing that image*:

1. **A 1-D profile.** Trace one refracted ray per step across the bevel and record how far
   sideways it lands. Displacement depends only on distance-from-the-edge, so a single lookup
   table covers the entire shape.
2. **A signed distance field.** For a rounded rectangle the distance to the nearest edge *and*
   the direction to it are both closed-form, so that 1-D table can be smeared over 2-D without
   tracing anything per pixel.
3. **Encode and hand it over.** `r = 128 + x * 127`, `g = 128 + y * 127`, and the filter's
   `scale` is twice the largest vector in the field.

```html
<filter id="glass" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
  <feImage href="data:image/png;base64,…" result="displacement" />
  <feDisplacementMap in="SourceGraphic" in2="displacement"
                     scale="21.8" xChannelSelector="R" yChannelSelector="G" />
</filter>
```
```css
.pane { backdrop-filter: url(#glass) saturate(1.6); }
```

`color-interpolation-filters="sRGB"` is not optional — the default is linearRGB, which converts
the channels out from under the encoding and quietly ruins the field.

#### Chromatic dispersion

Real glass splits light: a lens rim fringes because each wavelength bends by a different amount.
`dispersion` (px) reproduces it by displacing the channels at three different scales and
recombining them — red furthest, blue least — via `feColorMatrix` masks and arithmetic
`feComposite`. Only the first pass carries alpha, so adding the three back does not triple it.

It is the cue that most separates glass from frosted plastic, and it costs **three displacement
passes instead of one**. On by default for panes (1.5px) and off for buttons, where it is
invisible at that size and the cost multiplies by however many are on screen.

#### The specular rim

A uniform ring reads as a stroke. The rim here is a linear gradient masked down to `rim` px with
`mask-composite`, so brightness travels around the perimeter — strong on the edges facing
`lightAngle`, weaker on the far side — with a soft inner glow that gives the pane a thickness
rather than an outline. It dims automatically in dark mode, where a rim at full strength reads as
a white outline.

#### Accessibility

Apple's adoption guide is specific about what each setting does, and neither is "turn the
material off":

| Setting | The guide says | What the pane does |
|---|---|---|
| **Reduce Transparency** | "makes glass frostier" | Refraction goes — bending content someone asked to see *less* of is backwards — but the material stays. Frost roughly doubles and the tint densifies, so the pane still reads as a layer above the content rather than a flat card |
| **Increase Contrast** | "makes elements predominantly black/white"; the test is "verify contrasting borders appear" | A real 2px border in black or white depending on scheme, the tint pushed most of the way to opaque, and the specular rim dropped — a soft gradient edge is the opposite of an unambiguous one |
| **Reduce Motion** | "elastic properties disabled" | The hover lift and transitions go |

Getting the first one wrong is easy and quiet: stripping `backdrop-filter` entirely *looks* like
respecting the request, and instead destroys the layer separation the whole design depends on.

#### ⚠️ Chromium only, by design of the platform

**Only Chromium runs an SVG filter inside `backdrop-filter`.** Firefox and Safari *accept* the
value and then silently ignore it, so `CSS.supports()` answers yes in all three and is useless
here. The component sniffs for Chromium instead, and everywhere the answer is no it swaps the
refraction for `fallbackBlur` while keeping the tint, the specular rim and the shadow — it still
reads as glass, it just doesn't bend. `supportsSvgBackdropFilter()` is exported if you want to
branch on it yourself.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `GlassVariant` | `'regular'` | `regular` frosts and is safe anywhere; `clear` is transparent and brings a dimming layer. See above |
| `dispersion` | `number` | `1.5` | Channel separation at the rim, in px. Three filter passes instead of one; `0` disables |
| `dim` | `number` | per variant | Darkens what is behind the glass, `0`–`1`, painted under the frost. Clear `0.18`, Regular `0` |
| `rim` / `lightAngle` | `number` | `1.5` / `145` | Thickness of the specular rim, and where the light comes from |
| `radius` | `number` | `24` | Corner radius in px, baked into the refraction as well as the CSS. Half the short side gives a circle |
| `bezel` | `number` | `18` | How far the curved edge reaches in. **The entire effect lives in this band** — past it the pane is flat. `0` removes it |
| `thickness` | `number` | `22` | Glass depth: how far a refracted ray travels before it lands. The strength dial. `0` renders flat |
| `refractiveIndex` | `number` | `1.5` | Air is 1, window glass ~1.5, diamond 2.4. Higher bends harder |
| `profile` | `GlassProfile` | `'squircle'` | Cross-section of the bevel — see below |
| `magnification` | `number` | `1` | A plain radial zoom on top of the refraction. Refraction alone only ever affects the bevel; this is what reaches the middle |
| `maxDisplacement` | `number` | `48` | Ceiling on the refraction term. A near-vertical bevel refracts almost infinitely and would spend the whole 8-bit range on one ring |
| `resolution` | `number` | `0` (auto) | Pixel density of the generated map. `0` picks: full up to 180px, half beyond, where the field is broad enough that nobody can tell. Capped at 3 |
| `blur` / `fallbackBlur` | `number` | per variant / `12` | `fallbackBlur` applies where the filter *cannot* run — not merely before the map is ready, or a Clear pane would flash frosted on every mount |
| `saturate` / `brightness` | `number` | per variant | Applied to the backdrop. Lifting both is what stops glass reading as grey film |
| `tone` | `string` | `'#ffffff'` | **The colour the glass takes on.** One value in, three out — the fill, the lit rim and the glow beneath are all mixed from it. Accepts a `var()` with a fallback |
| `toneStrength` | `number` | `14` | How much of `tone` reaches the fill, as a percentage. ~8 is plain glass with a hint; past ~25 it reads as paint |
| `tint` | `string` | derived | Overrides the derived fill outright. `''` removes the layer |
| `specular` | `boolean` | `true` | The lit rim — bright one side, dim the other, with an inner glow so the pane reads as a thickness rather than a border |
| `shadow` / `interactive` | `boolean` | `true` / `false` | Drop shadow, and a small lift on hover |
| `disabled` | `boolean` | `false` | Stops generating the map and leaves the fallback blur |
| `as` | `string` | `'div'` | Root tag. `span` when the pane sits in an inline flow, as `AppButton` does |

```ts
type GlassProfile = 'convex' | 'squircle' | 'concave' | 'lip';
```

| Profile | Shape | Reads as |
|---|---|---|
| `convex` | quarter circle | A plain lens. Magnifies |
| `squircle` | `⁴√(1 - (1-t)⁴)` | Apple's curve — the bend concentrates into a thinner, harder rim |
| `concave` | inverted convex | The lens inverted: pushes the backdrop outward instead of pulling it in |
| `lip` | convex → concave | Bends one way then the other across the band |

The default slot is scoped: `<AppLiquidGlass v-slot="{ supported }">` tells you which path ran.

#### The engine on its own

```ts
import { useLiquidGlass, buildDisplacementMap, supportsSvgBackdropFilter } from '@/composables/useLiquidGlass';

const el = ref<HTMLElement | null>(null);
const { filterId, map, supported, refresh } = useLiquidGlass(el, { radius: 32, bezel: 20 });
```

`useLiquidGlass` watches the element with a `ResizeObserver`, defers rebuilds to an animation
frame, and skips entirely when the inputs come back unchanged — a resize that settles on the same
box, or a parent re-render, costs nothing. `buildDisplacementMap(w, h, params)` is the pure
function underneath if you want to drive it yourself.

#### Things that look simplifiable but are not

| Don't | Because |
|---|---|
| Drop `color-interpolation-filters="sRGB"` | The default is linearRGB. The channels get converted out from under the encoding and the field goes wrong in a way that looks like a subtle art bug |
| Use `CSS.supports('backdrop-filter', 'url(#x)')` as the feature test | It parses the value, so Firefox and Safari both answer yes and then do nothing. There is no honest query for this; the component sniffs for Chromium |
| Normalise the field against `maxDisplacement` instead of the real maximum | The encoding has 255 steps to spend. Spending them on a range nothing reaches quantises the part you can actually see |
| Rebuild the map on every resize callback | It is O(width × height). Rebuilds are coalesced into one frame and skipped when the size rounds to the same integers, or a drag re-renders it dozens of times a second |
| Clamp `bezel` up to a minimum of 1 | A 1px bevel is a sheer cliff: it refracts enormously, and that one ring then sets the normalisation for the whole field. `0` means no bevel |
| Run blur and displacement in one `backdrop-filter` chain | The chain blurs *after* bending and smears the refraction away. Two stacked layers make the bend operate on an already-frosted image, which is the order real glass works in |
| Fall back to `fallbackBlur` whenever the map is missing | The map is missing for a frame on every mount too. Tying the fallback to *can this browser refract* rather than *is the map ready* is what stops a Clear pane flashing frosted before it settles |
| Size the pane from `getBoundingClientRect()` | That rect is post-transform, so a scaled or hover-lifted pane rebuilds its map at the wrong size — and again on every frame of the transition. `ResizeObserver` reports `borderBoxSize`, the untransformed box |
| Put the pane's `max-height`-style sizing in the scoped CSS | The pane has no size of its own — it takes the size of whatever it wraps, which is what lets `AppButton` hand it a button |

---

### AppMagnifier

A draggable lens that genuinely magnifies. Same engine as `AppLiquidGlass`, curved across the
whole surface rather than only at the rim — which is the entire difference between a lens and a
pane.

```bash
pnpm add-component AppMagnifier
```

Pulls in `AppLiquidGlass` and `useLiquidGlass`. It is composed of them, not a reimplementation:

```vue
<AppLiquidGlass
  :radius="size / 2"
  :bezel="size / 2"        <!-- curved all the way across -->
  :magnification="1.6"     <!-- the part that actually zooms -->
  profile="convex"
/>
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `number` | `160` | Diameter in px. The radius is half of it, which is what makes the pane a circle |
| `magnification` | `number` | `1.6` | A point at distance `r` from the middle is sampled at `r ÷ m`. This is what zooms; refraction alone only bends the rim |
| `bezel` | `number` | `size / 2` | How far the curve reaches in. The full radius is what makes it a lens |
| `thickness` / `refractiveIndex` | `number` | `22` / `1.5` | The refraction riding on top of the zoom — it gives the rim real distortion instead of a hard circular crop |
| `profile` | `GlassProfile` | `'convex'` | A lens wants the plain quarter-circle curve |
| `x` / `y` | `number` | — | `v-model:x` / `v-model:y`, tracking the lens **centre** — the point you aim, not the corner. Unbound, the lens owns its position |
| `draggable` | `boolean` | `true` | Pointer drag, captured on press so a fast drag cannot outrun and drop the lens |
| `contain` | `boolean` | `true` | Clamps the centre so the lens cannot leave its offset parent |
| `blur` / `saturate` / `brightness` / `tint` | | near-neutral | Deliberately unlike the `AppLiquidGlass` defaults — a magnifier that blurs what it magnifies is not much of a magnifier |

Emits `update:x`, `update:y`, `dragStart` and `dragEnd`. The lens is `position: absolute`, so its
stage has to be a positioned parent.

---

### AppButton — `glass`

`AppButton` takes a `glass` prop that sits it on an `AppLiquidGlass` pane.

```vue
<AppButton glass variant="primary" label="Primary" icon="icon-[heroicons-outline--sparkles]" />
<AppButton glass icon-only icon="icon-[heroicons-outline--adjustments-horizontal]" tooltip="Settings" />

<AppButton glass variant="danger" :glass-blur="4" label="Frosted" />
<AppButton glass :glass-tone="false" label="No colour, white label" />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `glass` | `boolean` | `false` | Sits the button on an `AppLiquidGlass` pane |
| `glassTone` | `boolean` | `true` | Whether the variant's colour reaches the pane. Off leaves plain glass **at the same weight** — ghost stays lighter than surface — and turns the label white, since a variant foreground has nothing left to sit against |
| `glassBlur` | `number` | `0` | Blur behind the glass. `0` keeps the backdrop sharp and only *bent*, which is the whole difference between refraction and a frosted panel. Raising it also raises the floor of the non-Chromium fallback, where blur is all that is carrying the effect |

The variant does not merely survive `glass` — it **drives** it. Each variant's colour is passed
down as the pane's `tone`, where one value mixes the fill, the lit rim and the glow beneath, so a
danger button reads as danger from the edge in rather than being a white pane with red text on it.
All the variant gives up is its *opaque background*, which would bury the backdrop the effect is
made of. The quiet variants stay quiet: `ghost`, `outline` and `surface` tint plain white at the
weight each already implied, and `disabled` halves the tone so it recedes. Everything else is
untouched — sizes, icons, `loading`, tooltips and the focus ring behave exactly as off glass.

| Variant | Pane tone | Fill |
|---|---|---|
| `primary` / `accent` / `secondary` | that theme colour | 22% |
| `danger` / `success` | `--color-error` / `--color-success` | 24% |
| `surface` | white | 20% |
| `muted` | white | 14% |
| `ghost` | white | 8% |
| `outline` | white | 6%, plus a visible edge |

Adding it meant the button markup could no longer be repeated per combination — tooltip × glass is
four. The template now declares the button **once** and wraps it in a chain where each optional
wrapper is either the real component or a passthrough that renders its children and nothing else.
Adding a third wrapper later costs one more line, not another copy of the button.

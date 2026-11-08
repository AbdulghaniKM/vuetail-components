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
| `wordFont` | `string` | `var(--font-sans)` | Font stack for the word |

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

- ribbon 0 ← `--color-accent`
- ribbon 1 ← `--color-ring`, or a drained `--color-accent` where the preset's ring matches its accent

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
  <div class="flex h-screen overflow-hidden bg-bg">
    <AppDock :items="items" />

    <div
      class="mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col transition-[padding] duration-(--vt-duration-enter) ease-standard"
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

Pulls in `AppIcon`, `useMotionTokens` and `useReducedMotion`. Needs `@vueuse/core`, `vue-router` and `motion-v`.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `NavItem[]` | `[]` | The centred nav links |
| `actions` | `NavAction[]` | `[]` | Trailing controls — a CTA, a theme toggle, a language switch |
| `tone` | `'dark' \| 'surface'` | `'surface'` | `surface` is the preset's raised surface; `dark` an inverse capsule (ink in light mode, the raised surface in dark mode) with an inverse call to action |
| `floating` | `boolean` | `true` | Inset capsule, or a flush full-width bar |
| `position` | `'top' \| 'bottom'` | `'top'` | Which edge it pins to. The panel opens away from it |
| `width` | `NavWidth` | `'xl'` | Measure at rest — match your content column |
| `compactWidth` | `NavWidth` | `'md'` | Measure once contracted |
| `contract` | `boolean` | `true` | Set `false` to pin it at its resting size |
| `contractAt` | `number` | 80% of viewport | Scroll offset, in px, at which it contracts |
| `scrollTarget` | `HTMLElement \| null` | `window` | What it measures scroll against — see below |
| `pill` | `boolean` | `true` | The travelling pill |
| `breakpoint` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'lg'` | Bar width below which the links collapse into the menu button: `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem. Measured on the bar (a container query), not the viewport |
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

#### `tone`: surface by default, dark on request

`surface` is the preset's raised surface with its border and `shadow-lg`, so the bar belongs to the
page in every preset and theme (design bible §13: a dark dock or bar is never the default).
`tone="dark"` is an inverse capsule for a page that opens on a light hero: ink in light mode, the
raised surface in dark mode. Its call to action inverts too, because Ink's accent is ink and would
vanish into the capsule.

#### Full nav or menu button

`breakpoint` is measured on the bar, not the window: the header is a size container and the links
show from `@min-[40rem]` (`sm`), `48rem` (`md`), `64rem` (`lg`, the default) or `80rem` (`xl`) of its
own width. A bar beside a sidebar, or inside a narrow preview, falls back to the menu button when it
runs out of room instead of overflowing. Pick the size the links and actions fit in.

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

### AppNotificationPreview

A lock-screen picture of a push notification, for the preview beside a "send notification" form. It draws the notification the way an iPhone or an Android phone would, clamps the text the way each one does, and says when the lock screen will cut the title or the message off.

```bash
pnpm add-component AppNotificationPreview
```

Pulls in `AppIcon` and `useReducedMotion`.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `appName` | `string` | `'App'` | The app name above the notification. Its initial is the fallback icon |
| `title` | `string` | `''` | One line on both platforms |
| `message` | `string` | `''` | Four lines on iOS, two on Android. Line breaks are kept |
| `icon` | `string` | `''` | Iconify name for the app icon |
| `iconSrc` | `string` | `''` | Image URL for the app icon. Wins over `icon` |
| `image` | `string` | `''` | Attached image. Below the text on iOS, a thumbnail beside it on Android until expanded |
| `platform` | `'ios' \| 'android'` | `'ios'` | Which phone draws it |
| `appearance` | `'light' \| 'dark'` | `'light'` | The card's own theme, independent of the site's |
| `expanded` | `boolean` | `false` | The long-press view: no clamps |
| `time` | `Date \| string \| number` | now | What the lock-screen clock shows |
| `live` | `boolean` | `true` | Re-reads the clock every 30s while no `time` is given |
| `locale` | `string` | the browser's | BCP 47 locale for the clock, passed to `Intl` |
| `when` | `string` | `'now'` | The timestamp on the card |
| `stack` | `number` | `0` | Notifications waiting behind this one. Up to 2 are drawn |
| `wallpaper` | `string` | deep blue | Any CSS background, set on `--np-wallpaper`. Keep it dark enough for the white clock |
| `titlePlaceholder` | `string` | `'Your title'` | Shown, dimmed, while `title` is empty |
| `messagePlaceholder` | `string` | `'Your message shows here.'` | Shown, dimmed, while `message` is empty |
| `caption` | `string` | `''` | A note under the phone |
| `warnCutoff` | `boolean` | `true` | Measure the clamps and say when text is cut. Off for a static picture |
| `cutoffLabel` | `string` | `'The lock screen cuts the {part} off. Long-press shows the rest.'` | `{part}` becomes `title`, `message` or `title and message` |

#### Slots

| Slot | Scope | For |
|---|---|---|
| `icon` | — | The app icon, replacing `iconSrc`, `icon` and the initial |
| `caption` | `{ titleCut, messageCut }` | The note under the phone. The cut-off warning still follows it |

#### Emits

| Event | Payload | When |
|---|---|---|
| `truncate` | `{ title: boolean; message: boolean }` | What the lock screen cuts off changes. Use it to warn or block sending |

#### Accessibility

The screen is one `role="img"` whose label is the notification itself: the platform, the app, the title and the message, and whether there is an image. The clock and the stacked cards are `aria-hidden`; they are decoration to a screen reader. The cut-off warning is a `role="status"`, so it is announced as the text crosses the limit.

```vue
<template>
  <InputField v-model="title" label="Title" />
  <Textarea v-model="message" label="Message" />
  <AppNotificationPreview
    class="max-w-[22rem]"
    app-name="Acme"
    :title="title"
    :message="message"
    :platform="platform"
    @truncate="(cut) => (tooLong = cut.title || cut.message)"
  />
</template>
```

The preview is `w-full`. Give it a width, about `max-w-[22rem]`, or it collapses inside a centring flex parent.

#### Things that look simplifiable but are not

| Don't | Because |
|---|---|
| Swap the phone's colours, radii and system font for tokens | It depicts a phone, not a piece of the app. Preset-driven colours would make an iPhone change colour with the site's theme. It reads the same in every preset and theme on purpose |
| Work out the cut-off from character counts | The clamps are CSS, and where a line breaks depends on the font, the width and the script. Measuring `scrollHeight` against `clientHeight` is the only way to know what the phone hides |
| Key the arrival animation on the text | Typing would replay it on every keystroke. It is keyed on `platform` and `expanded`, the changes a real card animates for |
| Size the clock with `vw` | The phone is a fraction of the viewport. Container units size the clock to the phone, so it stays in proportion at any width |

---

### AdvancedAppTable

A data table that also knows how to stop being a table. The same column config renders as
pinned-header rows or as a grid of record cards, at two densities, and both switches are
**app-wide** — flip one table's display menu and every `AdvancedAppTable` on the page follows,
because the preference lives on `<html data-vt-table-view>` / `<html data-vt-table-density>` rather than in a prop.

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

Module-level refs, persisted in `localStorage` and mirrored onto `<html>` as `data-vt-table-view` and
`data-vt-table-density`, so your own CSS can react to the same switch. The default is stored as *absent*,
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

A pane of real glass. Its rim **bends** whatever sits behind it, fringed red to blue, and catches
light the way iOS 26.1 draws it, so straight lines behind the edge curve the way they do through
a physical lens.

```bash
pnpm add-component AppLiquidGlass
```

Pulls in `useLiquidGlass`. No packages: the whole effect is generated bitmaps, SVG filters, and
a few lines of CSS.

**The lens is ported from [glisse](https://github.com/0kzh/glisse)** by Kelvin Zhang, a faithful
implementation of Apple's Liquid Glass for the web (MIT; the licence is reproduced at the top of
`useLiquidGlass.ts`). glisse is itself after Aave's web glass. VueTail keeps its own Vue API,
variants and tokens on top, maps its physical props (`thickness`, `refractiveIndex`, `profile`)
onto glisse's lens, and adds a radial zoom for `AppMagnifier`.

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

A variant is a set of defaults, not a lock — any prop you pass still wins. Regular's 14px frost
softens the bend; glisse's own glass frosts 3px, so pass `:blur="3"` for its look.

#### How it works — five layers

```
   content          your children
   specular         the painted rim (iOS 26.1), plus a faint inner glow
   tint             the tone fill, plus the tone's hairline edge
   refract          backdrop-filter: url(#vt-glass-…)   ← bends what the layer below produced
   blur             backdrop-filter: blur() saturate() brightness()
   dim              a black wash, Clear only
```

Blur and bend are **separate layers on purpose**: the bend operates on an already-frosted image,
the order glass works in.

The lens is glisse's. Within a band round the rim (`bezel`, a quarter of the short side by
default) each point shows content from further in, by the slope of a shallow dome across the
pane; an error function fades it out toward the middle, which barely moves. The pull is stored as
**two grey images, one per direction**, not one red/green image: on a wide-gamut display Chrome
converts a coloured map to the display's colours before displacing, which bends a pull straight
down sideways too, while greys come through unchanged. Each pass takes the other direction from an
alpha of one half, which is no pull.

```html
<filter id="vt-glass-0" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
  <feImage href="data:…across" result="across" />
  <feImage href="data:…down" result="down" />
  <feDisplacementMap in="SourceGraphic" in2="across-pull" scale="70"
                     xChannelSelector="R" yChannelSelector="A" />
  <!-- …then down, and the same for green and blue at slightly smaller scales -->
</filter>
```

Filters live in one hidden `<defs>` for the page, cached by shape and settings: twenty buttons of
the same size share one.

#### Every browser, with a marked backdrop

**Only Chromium applies an SVG filter to a live backdrop.** Firefox and Safari parse
`backdrop-filter: url(…)` and ignore it, so `CSS.supports()` is useless as a test and the engine
sniffs for Chromium.

Everywhere else, do what glisse does: **mark the content behind the glass with
`data-glass-backdrop`.** The pane then filters that element itself, with its lens placed where the
pane stands, refreshed every frame so it follows scrolling and dragging, but only while the marked
element is on screen: an IntersectionObserver stops the loop when it scrolls away (measured in
Chrome with a Safari user agent: about 1800 layout reads a second before, 0 off screen after). That
works in every browser. Keep marked content reasonably small where a lens moves over it: Safari redraws the filter
on the CPU, about 40ms a frame for 1200 × 800 at 2x. Over anything unmarked, those browsers keep
the frost, the tint, the painted rim and the shadow.

`source` overrides the choice: `content` filters the marked element in Chromium too, `backdrop`
never touches content. The pane exposes `mode` (`backdrop`, `content` or `none`).

#### Chromatic dispersion

Real glass splits light: a lens rim fringes because each wavelength bends by a different amount.
Every pass is run three times, red bending furthest: at `dispersion: 0.08` (glisse's default)
red bends 8% and green 4% further than blue, and the three are added back up with each keeping a
third of its alpha.

#### The lit rim

A uniform ring reads as a stroke. The rim is painted per shape from glisse's measurements of iOS
26.1: a line brightest at the very edge and gone `rim` px in (1.22), slightly bowed, lighting the
sides that face `lightAngle` and, as its reflection, the opposite sides, fading over the corners
between and a little wider on the corners it faces. It is 0.3 of white over a light page and 0.13
over a dark one (`--lg-rim-shine`), and repaints when the theme or preset changes.

#### Accessibility

Apple's adoption guide is specific about what each setting does, and neither is "turn the
material off":

| Setting | The guide says | What the pane does |
|---|---|---|
| **Reduce Transparency** | "makes glass frostier" | Refraction goes — bending content someone asked to see *less* of is backwards — but the material stays. Frost roughly doubles and the tint densifies, so the pane still reads as a layer above the content rather than a flat card |
| **Increase Contrast** | "makes elements predominantly black/white"; the test is "verify contrasting borders appear" | A real 2px border in black or white depending on scheme, the tint pushed most of the way to opaque, and the lit rim dropped — a soft edge is the opposite of an unambiguous one |
| **Reduce Motion** | "elastic properties disabled" | The hover lift and transitions go |

Getting the first one wrong is easy and quiet: stripping `backdrop-filter` entirely *looks* like
respecting the request, and instead destroys the layer separation the whole design depends on.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `GlassVariant` | `'regular'` | `regular` frosts and is safe anywhere; `clear` is transparent and brings a dimming layer. See above |
| `dispersion` | `number` | `0.08` | How much further red bends than blue, as a fraction. Past ~0.2 it stops reading as glass. Clamped to 0.4 |
| `dim` | `number` | per variant | Darkens what is behind the glass, `0`–`1`, painted under the frost. Clear `0.18`, Regular `0` |
| `rim` / `lightAngle` | `number` | `1.22` / `135` | Width of the lit line in px, and where the light comes from as a CSS gradient angle |
| `radius` | `number` | `24` | Corner radius in px, baked into the lens as well as the CSS. Half the short side gives a circle |
| `bezel` | `number \| 'auto'` | `'auto'` | Width of the band that bends, in px. `auto` is a quarter of the short side, glisse's tuning |
| `thickness` | `number` | `22` | The strength dial. With `refractiveIndex`: 22 at 1.5 reaches 0.45 of the short side, glisse's default. `0` renders flat |
| `refractiveIndex` | `number` | `1.5` | Air is 1 (no bend). The reach grows with how far it is above 1 |
| `profile` | `GlassProfile` | `'squircle'` | The dome the bend follows — see below |
| `magnification` | `number` | `1` | A radial zoom over the whole pane, on top of the rim. With a zoom the rim is scaled down just enough that the picture never folds back on itself |
| `maxDisplacement` | `number` | `0` | Ceiling on how far any point moves, in px. `0` leaves it to the lens, which never moves content more than half its reach |
| `resolution` | `number` | `0` (auto) | Map density in pixels per px. `0` follows the screen, up to 2 |
| `source` | `GlassSource` | `'auto'` | What bends: `auto`, `backdrop` or `content`. See above |
| `blur` / `fallbackBlur` | `number` | per variant / `12` | `fallbackBlur` applies where nothing bends — not merely before the first measurement, or a Clear pane would flash frosted on every mount |
| `saturate` / `brightness` | `number` | per variant | Applied to the backdrop. Lifting both is what stops glass reading as grey film |
| `tone` | `string` | `'var(--color-surface)'` | **The colour the glass takes on.** One value in, three out — the fill, the lit rim and the glow beneath are all mixed from it. Accepts a `var()` with a fallback |
| `toneStrength` | `number` | `14` | How much of `tone` reaches the fill, as a percentage. ~8 is plain glass with a hint; past ~25 it reads as paint |
| `tint` | `string` | derived | Overrides the derived fill outright. `''` removes the layer |
| `specular` | `boolean` | `true` | The painted rim and the inner glow |
| `shadow` / `interactive` | `boolean` | `true` / `false` | Drop shadow, and a small lift on hover |
| `disabled` | `boolean` | `false` | Stops the lens and leaves the fallback blur |
| `as` | `string` | `'div'` | Root tag. `span` when the pane sits in an inline flow, as `AppButton` does |

```ts
type GlassProfile = 'convex' | 'squircle' | 'concave' | 'lip';
type GlassSource = 'auto' | 'backdrop' | 'content';
```

| Profile | Dome | Reads as |
|---|---|---|
| `squircle` | glisse's glass: sags half the short side | Steep at the edge, a hard bright rim |
| `convex` | sags 0.3 of it | Rounder: the bend spreads further in |
| `concave` | squircle, inverted | Pushes the backdrop outward instead of pulling it in |
| `lip` | squircle with `splay` 0.4 | Pulls straight across near the sides, as glisse's switch thumb does |

The default slot is scoped: `<AppLiquidGlass v-slot="{ supported }">` tells you whether anything
bends.

#### The engine on its own

```ts
import { useLiquidGlass, findGlassBackdrop, supportsSvgBackdropFilter } from '@/composables/useLiquidGlass';

const el = ref<HTMLElement | null>(null);
const { filter, rim, mode, supported, refresh } = useLiquidGlass(
  el,
  { radius: 32, thickness: 24 },
  { light: { angle: 135, width: 1.22 } },
);
// put filter on the element's backdrop-filter, rim on its background-image
```

`useLiquidGlass` watches the element with a `ResizeObserver`, refits a frame later, and repaints
the rim when the theme or preset changes. `lensMap(shape, params, density)` and
`rimMap(shape, shine, light, density)` are the pure functions underneath.

#### Things that look simplifiable but are not

| Don't | Because |
|---|---|
| Store the pull as one red/green image | On a wide-gamut display Chrome converts a coloured map before displacing by it, so a pull straight down bends sideways too. Two grey images come through unchanged |
| Drop `color-interpolation-filters="sRGB"` | The default is linearRGB. The channels get converted out from under the encoding and the field goes wrong in a way that looks like a subtle art bug |
| Use `CSS.supports('backdrop-filter', 'url(#x)')` as the feature test | It parses the value, so Firefox and Safari both answer yes and then do nothing. There is no honest query for this; the engine sniffs for Chromium |
| Guard every lens against folding | At a pane's rim the fold is the look: glisse squeezes and mirrors the content there, as iOS does. Only a zoom needs the guard, where the fold would reach the middle |
| Keep a filter's id when a lens over marked content moves | WebKit keeps showing a filter's old output until its id changes, so every move gets a new id |
| Run blur and displacement in one `backdrop-filter` chain | Two stacked layers make the bend operate on an already-frosted image, which is the order glass works in |
| Fall back to `fallbackBlur` before the first measurement | The pane has no lens for a frame on every mount. Assuming it refracts until measured is what stops a Clear pane flashing frosted before it settles |
| Size the pane from `getBoundingClientRect()` | That rect is post-transform, so a scaled or hover-lifted pane redraws its map at the wrong size on every frame of the transition. `ResizeObserver` reports the untransformed box |
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

---

## Composable reference

Each composable is installed with `pnpm add-composable <name>` and lands in `src/composables/`.
Sections follow the component format: what it does, options, what it returns, and the behaviour
that is easy to break.

### useInfiniteScroll

Loads paginated data as the user nears the end of a list. An `IntersectionObserver` watches a
sentinel after the last item; while it is in view (within `threshold` px) the next page loads.

```bash
pnpm add-composable useInfiniteScroll
```

```vue
<template>
  <ul ref="containerRef" class="h-80 overflow-y-auto">
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
    <li ref="sentinelRef" aria-hidden="true" />
  </ul>
  <p v-if="error" role="alert">{{ error }} <button @click="loadMore">Retry</button></p>
</template>

<script setup lang="ts">
import { useInfiniteScroll } from '@/composables/useInfiniteScroll';

const { items, error, containerRef, sentinelRef, loadMore } = useInfiniteScroll({
  fetch: (page, { signal }) => api.get('/people', { params: { page }, signal }).then((r) => r.data),
  pageSize: 20,
});
</script>
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `fetch` | `(page, { signal }) => Promise<T[]>` | — | Loads one page (1-based). `signal` aborts when `reset()` runs or the owner unmounts |
| `pageSize` | `number` | `20` | A page shorter than this means there is no more data |
| `threshold` | `number` | `200` | How far before the end, in px, the next page starts loading |
| `window` | `boolean` | `false` | Measure against the window, for a list the page itself scrolls. `containerRef` is then just the list |

#### Returns

| Name | Type | Description |
|---|---|---|
| `items` | `Ref<T[]>` | Every loaded item, in page order |
| `loading` | `Ref<boolean>` | A page is in flight |
| `done` | `Ref<boolean>` | The last page came back short |
| `error` | `Ref<string \| null>` | The last failure. The page is kept, so `loadMore()` retries it |
| `containerRef` | `Ref<HTMLElement \| null>` | The scroller (or, with `window`, the list) |
| `sentinelRef` | `Ref<HTMLElement \| null>` | Optional element placed after the items. Without one, a 1px `div` is appended and kept last |
| `loadMore` | `() => Promise<void>` | Loads the next page now; a no-op while loading or done |
| `reset` | `() => void` | Aborts the request in flight, clears the list and loads page 1 |

#### Behaviour

- Page 1 loads as soon as the container is attached, in view or not.
- After each page, the sentinel is checked again. An observer only reports *changes*, so a page
  too short to push the sentinel off screen would otherwise stall the list with room left.
- A page that lands after `reset()` or unmount is dropped: it is never appended to the new list,
  and the page counter only moves on success, so nothing repeats or is skipped.

#### Things that look simplifiable but are not

| Looks simplifiable | Why it is not |
|---|---|
| Rely on the observer alone | It reports on `observe()` and on change. Re-observing after each page is what asks "still in view?" |
| Decrement the page on error | The page only advances on success, so there is nothing to undo and no window where it is wrong |
| Drop the generation counter, `AbortSignal` is enough | Not every `fetch` honours the signal. The counter drops a late page whatever the fetch does |

### useConfirm

Opens a confirmation dialog (`ConfirmDangerModal`) and resolves the answer as a promise.

```bash
pnpm add-composable useConfirm
```

```ts
const { confirm } = useConfirm(); // in setup

if (await confirm({ title: 'Delete account?', confirmLabel: 'Delete account' })) {
  await api.delete('/account');
}
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `'Are you sure?'` | The heading |
| `message` | `string` | `'This action cannot be undone.'` | The description |
| `confirmLabel` | `string` | `'Confirm'` | Name the action ("Delete account"), not "OK" |
| `cancelLabel` | `string` | `'Cancel'` | |
| `variant` | `'danger' \| 'primary'` | `'danger'` | `danger`: warning icon and a danger button. `primary`: an ordinary yes or no |
| `body` | `() => VNode \| VNode[]` | — | Extra content under the message |

#### Behaviour

- Resolves `true` on confirm; `false` on Cancel, Escape, a backdrop click, or when another
  `confirm()` opens (one dialog at a time, app-wide, so no promise is left pending).
- Renders with the **caller's app context**: call `useConfirm()` in `setup` and the dialog sees the
  router, plugins, global components and app-level provides.
- Unmounts after the preset's exit duration (`--vt-duration-exit`), so it fades out instead of
  vanishing.
- Enter confirms only when focus is not on a field, button or link. Enter on the focused Cancel
  button cancels (AppModal's rule, see its `@confirm`).

#### Things that look simplifiable but are not

| Looks simplifiable | Why it is not |
|---|---|
| `createApp(ConfirmDangerModal).mount()` | A second app has none of the first one's plugins, router or provides |
| A fixed `setTimeout(…, 300)` before unmount | Console's exit is 90ms and Pine's 140ms: the token is the truth |
| Let the old dialog's promise go when a new one opens | A caller awaiting it would hang forever |

### useAuth

Session state on top of the template's `src/lib/authToken.ts`. The **access token lives in memory
only**; the **refresh token is an httpOnly, SameSite cookie** your server sets and reads. Nothing
is written to `localStorage`, so an XSS payload has no token to read from storage.

```bash
pnpm add-composable useAuth   # also needs src/plugins/axios.ts and src/lib/authToken.ts
```

```ts
// main.ts: your routes, then restore the session from the cookie before the first guard.
configureAuth({ login: '/api/session', refresh: '/api/session/refresh', logout: '/api/session', me: '/api/me' });
const { refresh, fetchUser } = useAuth();
if (await refresh()) await fetchUser();
```

#### Returns

| Name | Type | Description |
|---|---|---|
| `user` | `Ref<TUser \| null>` | Cleared whenever the token is, from anywhere |
| `token` | `ComputedRef<string \| null>` | The in-memory access token |
| `isAuthenticated` | `ComputedRef<boolean>` | Follows `clearAuthToken()` calls made elsewhere |
| `loading` | `Ref<boolean>` | `login()` or `fetchUser()` in flight |
| `login(credentials)` | `Promise<data>` | POST, then stores `data.token` and `data.user` |
| `setSession(token, user?)` | `void` | A session your code obtained (SSO callback, invite link) |
| `fetchUser()` | `Promise<TUser \| null>` | GET the me route; signs out on failure |
| `refresh()` | `Promise<boolean>` | Cookie → new access token; `false` and signed out on failure |
| `logout()` | `Promise<void>` | Signs out locally, then asks the server to drop the cookie |

`useAuth<TUser>()` types `user` with your own fields. `configureAuth(paths)` is a separate export.

#### Server contract

| Route | Method | Request | Response |
|---|---|---|---|
| login | POST | `{ email, password }` | `{ token, user }`, and sets the refresh cookie |
| refresh | POST | the cookie (`withCredentials`) | `{ token }` |
| logout | POST | the cookie | clears the cookie |
| me | GET | `Authorization: Bearer <token>` | the user |

#### Behaviour

- Registers `getToken` and `refreshToken` with the axios plugin. `onUnauthorized` (redirect to
  Login, a toast) stays with the app, in `main.ts`.
- One refresh at a time: the interceptor's 401 retry and `refresh()` share the request in flight.
- The refresh request is marked `_retry`, so a 401 on it signs out instead of asking the
  interceptor for another refresh, which would wait on itself forever.

#### Things that look simplifiable but are not

| Looks simplifiable | Why it is not |
|---|---|
| Keep the token in a `ref` inside useAuth | Then `clearAuthToken()` from the app's 401 handler leaves useAuth "signed in". authToken.ts is the one source, and reactive |
| Store the refresh token so a reload stays signed in | That is the token worth stealing. The cookie gives the same reload behaviour without exposing it |
| Register `onUnauthorized` here too | `setAuthProvider` merges, so it would replace the app's redirect |

### usePagination

Client-side pagination state for a table or list.

```ts
const query = ref('');
const rows = computed(() => people.value.filter((p) => p.name.includes(query.value)));
const { page, totalPages, range, visiblePages, paginate, goTo } = usePagination({
  total: () => rows.value.length,
  pageSize: 25,
});
// <tr v-for="row in paginate(rows)">
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `total` | `MaybeRefOrGetter<number>` | — | Item count. A getter follows a filtered list |
| `pageSize` | `MaybeRefOrGetter<number>` | `10` | Changing it goes back to page 1 |
| `initialPage` | `number` | `1` | Clamped to the pages that exist |
| `maxVisiblePages` | `MaybeRefOrGetter<number>` | `5` | Length of `visiblePages` |

Returns `page`, `pageSize`, `totalPages` (at least 1), `startIndex`, `endIndex`, `isFirst`,
`isLast`, `range` (`{ start, end, total }`, `start` is 0 when empty), `visiblePages`, `goTo`
(clamps), `next`, `prev`, `first`, `last` and `paginate(items)`.

#### Things that look simplifiable but are not

| Looks simplifiable | Why it is not |
|---|---|
| Clamp `page` in a normal (pre-flush) watcher | For one render the slice is empty: "page 5 of 2" flashes "No results" after every narrowing filter. The clamp is `flush: 'sync'` |
| Keep the page when `pageSize` changes | Page 4 at 10 per page and page 4 at 50 per page hold unrelated rows |

### useKeyboard

Global keyboard shortcuts, removed on unmount.

```ts
useKeyboard({ 'ctrl+k': () => (paletteOpen.value = true), '/': () => search.value?.focus() });
useKeyboard({ escape: close, 'shift+/': showHelp }, isOpen, { repeat: false });
```

| Argument | Type | Description |
|---|---|---|
| `shortcuts` | `Record<string, (e) => void \| boolean>` | `ctrl` means Ctrl or ⌘. Return `true` to `preventDefault` |
| `enabled` | `MaybeRefOrGetter<boolean>` | Binds while true; omitted, binds on mount |
| `options.allowInInputs` | `boolean` (`false`) | Fire single-key shortcuts inside text fields |
| `options.repeat` | `boolean` (`true`) | Fire on auto-repeat |

#### Behaviour

- **Typing is safe.** In an input, textarea, select or contenteditable, a shortcut with no ctrl,
  alt or meta does not fire (`/`, `j`, `enter`). Escape always fires, so a dialog closes from a field.
- **Shifted symbols match either spelling.** Shift+/ reports `?`; both `'?'` and `'shift+/'` match
  it. Letters keep shift: `'a'` and `'shift+a'` are different shortcuts.
- Keys pressed while an IME is composing (Japanese, Chinese input) are ignored.
- One press fires one handler.

### useDebounce and useThrottle

```ts
const query = ref('');
const debounced = useDebounce(query, 300);   // updates 300ms after the last keystroke
watch(debounced, (q) => search(q));
// on Enter: debounced.flush()   on close: debounced.cancel()

const scrollY = useThrottle(rawScrollY, 100); // at most every 100ms, with a trailing update
```

`useDebounce` returns the ref with `flush()` and `cancel()` attached. Both timers stop with the
component or effect scope that created them, so nothing is written after unmount.

### useClipboard

```ts
const { copy, copied, isSupported } = useClipboard({ resetAfter: 2000, toastMessage: 'Link copied' });
await copy(url, true); // true also shows the toast
```

`navigator.clipboard` needs a secure context. Where it is missing (plain-http previews, some
WebViews) `copy()` falls back to selecting a hidden textarea and the legacy copy command, then
returns focus. `copy()` resolves `false` only when both fail. The `copied` timer stops on unmount.

### useMotionTokens

```ts
const { state, enter, exit } = useMotionTokens();
// <motion.div :animate="{ x, transition: state() }" :exit="{ opacity: 0, transition: exit() }">
```

| Function | Token | Use for |
|---|---|---|
| `state()` | `--vt-duration` | Something moving between two states: a pill sliding, a panel resizing |
| `enter()` | `--vt-duration-enter` | Something appearing |
| `exit()` | `--vt-duration-exit` | Something leaving (shorter than its entrance) |

Each returns `{ duration, ease }` in motion-v's units (seconds, a bezier tuple) and reads the live
token at call time, so a preset switch reaches the next animation. Under
`prefers-reduced-motion: reduce`, tokens.css shortens every duration in every preset (80 / 100 /
70ms); a component still drops its movement (`y`, `scale`) and keeps the fade.

### useSeo

```ts
useSeo(() => ({ title: post.value?.title ?? 'Loading', description: post.value?.summary }));
```

A getter is tracked: the metadata re-applies when the data it reads changes (a post that loads
after the page) and on every navigation. It is cleared when the page unmounts.

### useFormValidation

```ts
const errors = ref<Record<string, string>>({});
useFormValidation(form, schema, errors); // clears messages as fields become valid
```

Error keys are field paths: `email`, `address.city`. A key is cleared once nothing at or beneath it
fails, so `address` stays while any nested field is invalid. It only clears; set errors on submit.
Phase 9.4 adds `useForm`, which owns validation, errors, touched state and submit.

### useToast

App-wide notifications. Mount `AppToast` once (App.vue) with `toasts`; call the methods anywhere.

```ts
configureToasts({ max: 3, duration: 4000 }); // once, in main.ts; defaults: 5 and 5000ms

const toast = useToast();
toast.success('"Q3 report.pdf" was deleted.', { action: { label: 'Undo', onClick: () => restore(file) } });
await toast.promise(upload(files), {
  loading: 'Uploading…',
  success: (n) => `Uploaded ${n} files.`,
  error: (e) => `Upload failed: ${(e as Error).message}`,
});
```

| Method | Description |
|---|---|
| `success` / `error` / `warning` / `info(message, { title?, duration?, action? })` | Shows a toast, returns its id. `duration: 0` keeps it until dismissed |
| `promise(p, { loading, success, error })` | A sticky loading toast that becomes the outcome; resolves or rejects with `p` |
| `update(id, patch)` | Changes a toast in place; a new `duration` restarts its timer |
| `remove(id)` / `clear()` | Closes one, or all |
| `pause(id)` / `resume(id)` | AppToast calls these on hover and focus |

- Past `max`, the oldest toast closes: a wall of toasts is unreadable and covers the page.
- An `action` button runs, then closes the toast, so an Undo never leaves "Deleted" on screen.

### useLocalStorage

```ts
const theme = useLocalStorage('theme', 'light', z.enum(['light', 'dark']));
```

A ref mirrored to `localStorage[key]` as JSON (`null` removes the key). With a schema, anything that
does not parse falls back to the default. A change made in another tab arrives through the
`storage` event and goes through the same schema; the listener stops with the component.

### useBreakpoint

```ts
const { current, isMobile, atLeast, smallerThan } = useBreakpoint();
const wide = atLeast('lg'); // min-width: 1024px, like Tailwind's lg:
```

`atLeast(bp)` is a `min-width` query (the breakpoint itself counts); `smallerThan(bp)` is its
opposite. `greaterThan` is kept as a deprecated alias of `atLeast`: the old name was wrong. Every
caller shares one set of five media queries.

### useDateFormat

`useDateFormat(date)` takes a value, a ref or a getter (`() => post.value.publishedAt`); `format`,
`formatPreset`, `relative`, `relativeShort` and `custom` format its current value on each call.
`useDateRange(start, end)` takes the same.

### Package requirements and the CLI

`requires.packages` in registry.json lists npm packages a component or composable needs, as a name
or `name@range` when the version matters: motion-v is `motion-v@^2.2.1`, because 1.x resets motion
elements to their `initial` state for one frame when an animation ends (the modal flash). The CLI
does not install packages; after an install it prints `pnpm add …` for any your `package.json`
lacks.

### useOverlay

Focus, scroll and Escape for anything that sits over the page. AppModal and AppImageModal use it;
build your own sheet, drawer or lightbox on it.

```ts
const open = ref(false);
const panel = ref<HTMLElement | null>(null);
useOverlay(panel, open, { onEscape: () => (open.value = false) });
// <div v-if="open" ref="panel" role="dialog" aria-modal="true" aria-labelledby="…">
```

| Option | Default | Description |
|---|---|---|
| `initialFocus` | `'first'` | `'first'` focusable element, `'panel'` itself (give it `tabindex="-1"`), or `() => element` |
| `returnFocus` | `true` | Give focus back to what had it before opening |
| `lockScroll` | `true` | Lock page scroll while open (tokens.css reserves the scrollbar gutter, so nothing shifts) |
| `onEscape` | — | Called on Escape while this overlay is on top |

Returns `focus()` (move focus in again). `focusableIn(root)` is exported too.

#### Behaviour

- **One stack, app-wide.** Only the top overlay traps Tab, pulls stray focus back (a click behind
  it, a script) and hears Escape. A dialog opened from a dialog works without either knowing.
- **Scroll locks once.** The first overlay locks `body`, the last one to close restores the value
  it found. Closing a nested dialog no longer unlocks the page under the outer one.
- **Escape respects the inside.** If something in the panel handled Escape first (an open select
  marks it with `preventDefault`), the overlay stays open.
- The panel may be a component ref, and may only exist while open (`v-if`).

#### Things that look simplifiable but are not

| Looks simplifiable | Why it is not |
|---|---|
| `document.body.style.overflow = open ? 'hidden' : ''` per component | The inner dialog's close unlocks the page while the outer is still open, and `''` wipes a value the app set |
| A keydown listener per overlay | Two traps fight over Tab, and Escape closes every open dialog at once |
| Use it for the docs ⌘K palette | That is a native `<dialog>` with `showModal()`: the browser already traps focus and handles Escape |

### useRovingFocus

Arrow-key navigation through a group, the WAI-ARIA way: the arrows of the orientation, Home and End,
wrap, type-ahead, disabled items skipped. Select uses it, as do the docs tabs, preset switcher and
⌘K palette.

```ts
// Roving tabindex (tabs, toolbars, radio groups): one Tab stop, moving focuses the item.
const bar = ref<HTMLElement | null>(null);
const tools = useRovingFocus({ count: 3, orientation: 'horizontal', container: bar });
// <div ref="bar" role="toolbar" @keydown="tools.onKeydown"> <button :tabindex="tools.tabindex(i)" role="radio">

// Active descendant (listbox, combobox): focus stays put, the index moves.
const list = useRovingFocus({ count: () => options.value.length, label: (i) => options.value[i].label });
// <ul role="listbox" tabindex="0" :aria-activedescendant="`opt-${list.active.value}`" @keydown="list.onKeydown">
```

| Option | Default | Description |
|---|---|---|
| `count` | — | `MaybeRefOrGetter<number>`; the index is pulled back when it shrinks |
| `orientation` | `'vertical'` | `'horizontal'`, `'vertical'` or `'both'` |
| `loop` | `true` | Wrap at the ends |
| `disabled(i)` | — | Items to skip |
| `label(i)` | — | Turns on type-ahead. Leave it off when typing goes into a search box |
| `initial` | `0` | `-1` for none |
| `container` | — | Roving-tabindex mode; items are found by ARIA role or `itemSelector` |
| `onChange(i)` | — | After a key moved the index (automatic tab activation) |

Returns `active`, `onKeydown(e)` (returns whether it used the key, and prevents its default only
then), `tabindex(i)` and `set(i, { focus })`. It ignores keys with ctrl, alt or meta.

Select's list now takes focus (`tabindex="-1"`): before, `listRef.focus()` did nothing, so the
arrow keys never reached a non-searchable Select. With `searchable`, the search box is a
`role="combobox"` carrying `aria-activedescendant`.

### useAnnouncer

```ts
const { announce } = useAnnouncer();      // in setup
announce('3 people shown');               // polite: waits for the reader to finish
announce('Could not save.', 'assertive'); // interrupts: errors only
```

Two visually hidden live regions (`[data-vt-announcer="polite"]`, `"assertive"`) are added to
`<body>` the first time `useAnnouncer()` runs, so they exist before any message. A burst collapses
to its last message; the same message twice is read twice (the region is emptied first).

AppToast announces through it: errors assertively, the rest politely, and again when a
`promise()` toast turns into its outcome. Its stack is a labelled `region` landmark rather than
a live region, so toasts are no longer read twice (the old stack was `aria-live="polite"` with a
`role="alert"` inside each toast). InputField, Textarea and PhoneInput error messages keep
`role="alert"` and drop the contradicting `aria-live="polite"`.

| Looks simplifiable | Why it is not |
|---|---|
| Give each component its own `aria-live` element | It is removed with the component, cutting the message short, and two of them talk over each other |
| Create the region in `announce()` | A region added with its text in the same tick is often not read |


<template>
  <div class="w-full">
    <div class="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <!-- Block header: icon + title + toggle button -->
      <div class="flex items-center justify-between gap-3 p-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <AppIcon name="icon-[heroicons-outline--funnel]" :size="1.125" />
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <p class="truncate text-sm font-semibold text-text">{{ title }}</p>
              <span
                v-if="activeCount > 0"
                class="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[0.6875rem] font-semibold tabular-nums text-white"
              >{{ activeCount }}</span>
            </div>
            <p class="truncate text-xs text-text-muted">
              {{ activeCount > 0 ? `${activeCount} ${activeCount === 1 ? 'filter' : 'filters'} active` : subtitle }}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <slot name="header-end" :active-count="activeCount" />
          <button
            v-if="activeCount > 0"
            type="button"
            class="hidden text-xs font-medium text-text-muted transition-colors hover:text-text sm:inline"
            @click="clear"
          >
            {{ clearAllLabel }}
          </button>
          <button
            type="button"
            class="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-all duration-150 active:scale-95"
            :class="open ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border bg-surface text-text hover:bg-muted'"
            :aria-expanded="open"
            @click="open = !open"
          >
            <span>{{ open ? hideLabel : showLabel }}</span>
            <AppIcon
              name="icon-[heroicons-outline--chevron-down]"
              :size="0.875"
              class="shrink-0 transition-transform duration-200"
              :class="open ? 'rotate-180' : ''"
            />
          </button>
        </div>
      </div>

      <!-- Applied-filter chips -->
      <div
        v-if="chips && appliedChips.length"
        class="flex flex-wrap gap-2 border-t border-border px-3 py-2.5"
      >
        <span
          v-for="chip in appliedChips"
          :key="chip.key"
          class="inline-flex max-w-[14rem] items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
        >
          <span class="truncate">{{ chip.label }}: {{ chip.display }}</span>
          <button
            type="button"
            class="flex size-3.5 shrink-0 items-center justify-center rounded-full hover:bg-accent/20"
            :aria-label="`Remove ${chip.label} filter`"
            @click="removeChip(chip.key)"
          >
            <AppIcon name="icon-[heroicons-outline--x-mark]" :size="0.625" />
          </button>
        </span>
      </div>

      <!-- Collapsible fields -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div
          v-if="open"
          class="border-t border-border p-4"
          role="region"
          :aria-label="title"
        >
        <p v-if="!fields.length" class="py-4 text-center text-sm text-text-muted">
          {{ emptyMessage }}
        </p>

        <div v-else class="flex flex-col gap-4">
          <div
            v-for="(row, rowIndex) in fields"
            :key="rowIndex"
            class="grid gap-4"
            :class="rowClass || getDefaultRowClass(row)"
          >
            <div
              v-for="(field, fieldIndex) in row"
              :key="field.key ?? fieldIndex"
              :class="field.customClass"
            >
              <!-- field label + per-field clear -->
              <div class="mb-1.5 flex items-center justify-between gap-2">
                <p class="text-xs font-medium text-text-muted">{{ field.label }}</p>
                <button
                  v-if="isFieldActive(field.key)"
                  type="button"
                  class="text-xs font-medium text-accent hover:underline"
                  @click="clearField(field.key)"
                >
                  {{ clearLabel }}
                </button>
              </div>

              <!-- text / email / number (scalar) -->
              <InputField
                v-if="field.type === 'text' || field.type === 'email' || field.type === 'number'"
                :model-value="(getFieldValue(field.key) as string | number) ?? ''"
                :type="inputType(field.type)"
                :placeholder="field.placeholder || `${anyLabel} ${field.label}`"
                @update:model-value="setFieldValue(field.key, $event)"
              />

              <!-- select -->
              <Select
                v-else-if="field.type === 'select'"
                :model-value="(getFieldValue(field.key) as string | number) ?? ''"
                :items="fieldOptions(field)"
                :placeholder="field.placeholder || `${anyLabel} ${field.label}`"
                :searchable="field.searchable ?? true"
                @update:model-value="setFieldValue(field.key, $event)"
              />

              <!-- phone -->
              <PhoneInput
                v-else-if="field.type === 'phone'"
                :model-value="(getFieldValue(field.key) as string) ?? ''"
                :placeholder="field.placeholder"
                @update:model-value="setFieldValue(field.key, $event)"
              />

              <!-- date / datetime (single) -->
              <DatePicker
                v-else-if="field.type === 'date' || field.type === 'datetime'"
                :model-value="(getFieldValue(field.key) as string) ?? ''"
                :mode="field.type === 'datetime' ? 'datetime' : 'date'"
                :placeholder="field.placeholder"
                :min="field.min as string | undefined"
                :max="field.max as string | undefined"
                @update:model-value="setFieldValue(field.key, $event)"
              />

              <!-- numberRange -->
              <div v-else-if="field.type === 'numberRange'" class="flex items-center gap-2">
                <InputField
                  type="number"
                  :model-value="getRangePart(field.key, 'min')"
                  :placeholder="field.min !== undefined ? String(field.min) : 'Min'"
                  @update:model-value="setNumberRange(field.key, 'min', $event)"
                />
                <span class="shrink-0 text-text-muted">–</span>
                <InputField
                  type="number"
                  :model-value="getRangePart(field.key, 'max')"
                  :placeholder="field.max !== undefined ? String(field.max) : 'Max'"
                  @update:model-value="setNumberRange(field.key, 'max', $event)"
                />
              </div>

              <!-- multiselect -->
              <AppPopover
                v-else-if="field.type === 'multiselect'"
                placement="bottom-start"
                :close-on-content-click="false"
                match-width
                panel-class="border border-border bg-surface rounded-xl shadow-lg p-1"
              >
                <template #trigger="{ toggle, isOpen }">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-start text-sm transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    @click="toggle"
                  >
                    <span class="truncate" :class="multiSelectSummary(field) ? 'text-text' : 'text-text/50'">
                      {{ multiSelectSummary(field) || `${anyLabel} ${field.label}` }}
                    </span>
                    <AppIcon
                      name="icon-[heroicons-outline--chevron-down]"
                      :size="1.125"
                      class="shrink-0 text-text-muted transition-transform duration-200"
                      :class="isOpen ? 'rotate-180' : ''"
                    />
                  </button>
                </template>
                <template #default>
                  <ul class="flex max-h-52 flex-col gap-0.5 overflow-y-auto p-1">
                    <li
                      v-for="opt in fieldOptions(field)"
                      :key="String(opt.value)"
                      class="rounded-lg px-2 py-1 hover:bg-muted"
                    >
                      <AppCheckbox
                        :model-value="isMultiSelected(field.key, opt.value)"
                        :label="opt.label"
                        @update:model-value="toggleMultiSelect(field.key, opt.value, $event)"
                      />
                    </li>
                  </ul>
                </template>
              </AppPopover>

              <!-- dateRange -->
              <AppPopover
                v-else-if="field.type === 'dateRange'"
                placement="bottom-start"
                :close-on-content-click="false"
                match-width
                panel-class="border border-border bg-surface rounded-xl shadow-lg p-3 min-w-[16rem]"
              >
                <template #trigger="{ toggle, isOpen }">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-start text-sm transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    @click="toggle"
                  >
                    <span class="truncate" :class="dateRangeSummary(field.key) ? 'text-text' : 'text-text/50'">
                      {{ dateRangeSummary(field.key) || `${anyLabel} ${field.label}` }}
                    </span>
                    <AppIcon
                      name="icon-[heroicons-outline--calendar]"
                      :size="1.125"
                      class="shrink-0 text-text-muted"
                      :class="isOpen ? 'text-accent' : ''"
                    />
                  </button>
                </template>
                <template #default>
                  <div class="flex flex-col gap-2">
                    <div>
                      <p class="mb-1 text-xs text-text-muted">From</p>
                      <DatePicker
                        :model-value="getDatePart(field.key, 'from')"
                        @update:model-value="setDateRange(field.key, 'from', $event)"
                      />
                    </div>
                    <div>
                      <p class="mb-1 text-xs text-text-muted">To</p>
                      <DatePicker
                        :model-value="getDatePart(field.key, 'to')"
                        @update:model-value="setDateRange(field.key, 'to', $event)"
                      />
                    </div>
                  </div>
                </template>
              </AppPopover>

              <!-- boolean (tri-state) -->
              <div v-else-if="field.type === 'boolean'" class="flex gap-2">
                <button
                  type="button"
                  class="flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors"
                  :class="
                    getFieldValue(field.key) === true
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-surface text-text hover:bg-muted'
                  "
                  @click="setFieldValue(field.key, getFieldValue(field.key) === true ? null : true)"
                >
                  {{ field.trueLabel || 'Yes' }}
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors"
                  :class="
                    getFieldValue(field.key) === false
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-surface text-text hover:bg-muted'
                  "
                  @click="setFieldValue(field.key, getFieldValue(field.key) === false ? null : false)"
                >
                  {{ field.falseLabel || 'No' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer controls -->
        <div
          v-if="fields.length"
          class="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3"
        >
          <button
            type="button"
            class="text-xs font-medium text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="loading"
            @click="clear"
          >
            {{ clearAllLabel }}
          </button>
          <AppButton
            variant="accent"
            :label="applyLabel"
            size="sm"
            :loading="loading"
            @click="apply"
          />
        </div>
      </div>
    </Transition>
    </div>
  </div>
</template>

<script lang="ts">
// Runtime exports live in a plain <script> block so `filterRows` and the filter
// types can be imported by AppTable (and any parent) — <script setup> can only
// export types, not values.
import type { FormField } from '@/types/form.types';
import type { SelectItem } from './Fields/Select.vue';

export type FilterFieldType = FormField['type'] | 'multiselect' | 'boolean' | 'dateRange' | 'numberRange';

/** A superset of FormField — plain FormFieldRow[] schemas remain valid input.
 *  `min`/`max` are re-widened here (number for ranges, string for date bounds),
 *  so they're omitted from the base before extension. */
export interface FilterField extends Omit<FormField, 'type' | 'min' | 'max'> {
  type: FilterFieldType;
  /** multiselect options (alias of `items`). */
  options?: SelectItem[] | string[];
  /** hints for numberRange / bounds for date pickers. */
  min?: number | string;
  max?: number | string;
  /** boolean toggle labels. */
  trueLabel?: string;
  falseLabel?: string;
}

export type FilterFieldRow = FilterField[];
export type FilterState = Record<string, unknown>;

export function normalizeOptions(options?: SelectItem[] | string[]): SelectItem[] {
  if (!options) return [];
  return options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
}

function getValueAt(row: any, key: string): any {
  const keys = key.split('.');
  let value: any = row;
  for (const k of keys) value = value?.[k];
  return value ?? '';
}

export function isEmptyFilterValue(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return true;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') return Object.values(val as Record<string, unknown>).every((v) => v === null || v === '' || v === undefined);
  return false;
}

/**
 * Pure, object-aware predicate engine. Filters `rows` against a filter `state`
 * keyed by field. Handles scalars, arrays (multiselect), booleans, `{from,to}`
 * date ranges and `{min,max}` number ranges. This is the single home of all
 * filtering logic — AppTable delegates to it and does no filtering itself.
 */
export function filterRows<T = any>(rows: T[], fields: FilterFieldRow[], state: FilterState): T[] {
  if (!Array.isArray(rows)) return [];
  const flat = fields.flat();
  return rows.filter((row) => {
    for (const field of flat) {
      const val = state[field.key];
      if (isEmptyFilterValue(val)) continue;
      const raw = getValueAt(row, field.key);

      switch (field.type) {
        case 'text':
        case 'email':
        case 'phone':
          if (!String(raw).toLowerCase().includes(String(val).toLowerCase())) return false;
          break;
        case 'number':
          if (Number(raw) !== Number(val)) return false;
          break;
        case 'select':
          if (String(raw) !== String(val)) return false;
          break;
        case 'multiselect': {
          const arr = val as (string | number)[];
          if (arr.length > 0 && !arr.map(String).includes(String(raw))) return false;
          break;
        }
        case 'boolean':
          if (typeof val === 'boolean' && Boolean(raw) !== val) return false;
          break;
        case 'numberRange': {
          const { min, max } = val as { min: number | null; max: number | null };
          const n = Number(raw);
          if (min !== null && min !== undefined && n < min) return false;
          if (max !== null && max !== undefined && n > max) return false;
          break;
        }
        case 'dateRange': {
          const { from, to } = val as { from: string | null; to: string | null };
          const t = new Date(raw).getTime();
          if (Number.isNaN(t)) return false;
          if (from && t < new Date(from).getTime()) return false;
          if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            if (t > toDate.getTime()) return false;
          }
          break;
        }
        case 'date':
        case 'datetime': {
          const r = new Date(raw);
          const d = new Date(val as string);
          if (Number.isNaN(r.getTime()) || r.toDateString() !== d.toDateString()) return false;
          break;
        }
      }
    }
    return true;
  });
}

/** Human-readable display of a single field's active value (for chips). */
export function displayFilterValue(field: FilterField, val: unknown): string {
  switch (field.type) {
    case 'select': {
      const opt = normalizeOptions(field.options ?? field.items).find((o) => String(o.value) === String(val));
      return opt?.label ?? String(val);
    }
    case 'multiselect': {
      const arr = val as (string | number)[];
      if (arr.length === 1) {
        const opt = normalizeOptions(field.options ?? field.items).find((o) => String(o.value) === String(arr[0]));
        return opt?.label ?? String(arr[0]);
      }
      return `${arr.length} selected`;
    }
    case 'numberRange': {
      const { min, max } = val as { min: number | null; max: number | null };
      if (min != null && max != null) return `${min}–${max}`;
      if (min != null) return `≥${min}`;
      return `≤${max}`;
    }
    case 'dateRange': {
      const { from, to } = val as { from: string | null; to: string | null };
      if (from && to) return `${from} – ${to}`;
      return from ? `from ${from}` : `until ${to}`;
    }
    case 'boolean':
      return val ? (field.trueLabel ?? 'Yes') : (field.falseLabel ?? 'No');
    default:
      return String(val);
  }
}
</script>

<script setup lang="ts">
import { ref, computed } from 'vue';
import AppIcon from './AppIcon.vue';
import AppButton from './AppButton.vue';
import AppPopover from './AppPopover.vue';
import AppCheckbox from './AppCheckbox.vue';
import InputField from './Fields/InputField.vue';
import Select from './Fields/Select.vue';
import PhoneInput from './Fields/PhoneInput.vue';
import DatePicker from './Fields/DatePicker.vue';

interface Props {
  /** Two-way filter state. Updated live as the user edits; the parent only
   *  loads on the `apply` event, so no request fires per keystroke. */
  modelValue: FilterState;
  /** Row/field schema — superset of AppForm's FormFieldRow. */
  fields: FilterFieldRow[];
  /** Baseline that Clear resets to and the badge/chips diff against. */
  defaultValues?: FilterState;
  /** Block header title. */
  title?: string;
  /** Sub-line shown under the title when no filters are active. */
  subtitle?: string;
  loading?: boolean;
  defaultOpen?: boolean;
  /** Show removable chips inside the block (default true). */
  chips?: boolean;
  applyLabel?: string;
  clearLabel?: string;
  clearAllLabel?: string;
  /** Toggle-button labels for the collapsed / expanded states. */
  showLabel?: string;
  hideLabel?: string;
  anyLabel?: string;
  emptyMessage?: string;
  /** Override the auto-computed responsive grid class for every row. */
  rowClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  defaultValues: () => ({}),
  fields: () => [],
  title: 'Filter Panel',
  subtitle: 'No filters applied',
  loading: false,
  defaultOpen: false,
  chips: true,
  applyLabel: 'Apply',
  clearLabel: 'Clear',
  clearAllLabel: 'Clear all',
  showLabel: 'Show',
  hideLabel: 'Hide',
  anyLabel: 'Any',
  emptyMessage: 'No filters available.',
  rowClass: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: FilterState];
  apply: [value: FilterState];
  clear: [value: FilterState];
}>();

const open = ref(props.defaultOpen);

const GRID_COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

function getDefaultRowClass(row: FilterField[]): string {
  return GRID_COLS_CLASS[row.length] ?? GRID_COLS_CLASS[4];
}

function fieldOptions(field: FilterField): SelectItem[] {
  return normalizeOptions(field.options ?? field.items);
}

// ── Field value plumbing ────────────────────────────────────────────────────
function getFieldValue(key: string): unknown {
  return props.modelValue[key];
}

function setFieldValue(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

function inputType(type: FilterFieldType): 'text' | 'email' | 'number' {
  if (type === 'email') return 'email';
  if (type === 'number') return 'number';
  return 'text';
}

// ── numberRange helpers ─────────────────────────────────────────────────────
function getRangePart(key: string, part: 'min' | 'max'): string {
  const v = props.modelValue[key] as { min: number | null; max: number | null } | undefined;
  const n = v?.[part];
  return n !== null && n !== undefined ? String(n) : '';
}
function setNumberRange(key: string, part: 'min' | 'max', value: string | number) {
  const cur = (props.modelValue[key] as { min: number | null; max: number | null }) ?? { min: null, max: null };
  const parsed = value === '' || value === null ? null : Number(value);
  setFieldValue(key, { min: cur.min ?? null, max: cur.max ?? null, [part]: parsed });
}

// ── dateRange helpers ───────────────────────────────────────────────────────
function getDatePart(key: string, part: 'from' | 'to'): string {
  const v = props.modelValue[key] as { from: string | null; to: string | null } | undefined;
  return v?.[part] ?? '';
}
function setDateRange(key: string, part: 'from' | 'to', value: string) {
  const cur = (props.modelValue[key] as { from: string | null; to: string | null }) ?? { from: null, to: null };
  setFieldValue(key, { from: cur.from ?? null, to: cur.to ?? null, [part]: value || null });
}
function dateRangeSummary(key: string): string {
  const v = props.modelValue[key] as { from: string | null; to: string | null } | undefined;
  if (!v?.from && !v?.to) return '';
  if (v.from && v.to) return `${v.from} – ${v.to}`;
  return v.from ? `from ${v.from}` : `until ${v.to}`;
}

// ── multiselect helpers ─────────────────────────────────────────────────────
function isMultiSelected(key: string, value: string | number): boolean {
  const cur = (props.modelValue[key] as (string | number)[]) ?? [];
  return cur.map(String).includes(String(value));
}
function toggleMultiSelect(key: string, value: string | number, checked: boolean) {
  const cur = (props.modelValue[key] as (string | number)[]) ?? [];
  setFieldValue(key, checked ? [...cur, value] : cur.filter((v) => String(v) !== String(value)));
}
function multiSelectSummary(field: FilterField): string {
  const arr = (props.modelValue[field.key] as (string | number)[]) ?? [];
  if (arr.length === 0) return '';
  if (arr.length === 1) {
    const opt = fieldOptions(field).find((o) => String(o.value) === String(arr[0]));
    return opt?.label ?? String(arr[0]);
  }
  return `${arr.length} selected`;
}

// ── Active-filter counting (current state vs. defaultValues) ─────────────────
function isFieldActive(key: string): boolean {
  const current = props.modelValue[key];
  const base = props.defaultValues[key];
  if (isEmptyFilterValue(current)) return false;
  return JSON.stringify(current) !== JSON.stringify(base ?? '');
}

const flatFields = computed<FilterField[]>(() => props.fields.flat());
const fieldKeys = computed(() => flatFields.value.map((f) => f.key));
const activeCount = computed(() => fieldKeys.value.filter(isFieldActive).length);

const appliedChips = computed(() =>
  flatFields.value
    .filter((f) => isFieldActive(f.key))
    .map((f) => ({ key: f.key, label: f.label, display: displayFilterValue(f, props.modelValue[f.key]) })),
);

// ── Actions ─────────────────────────────────────────────────────────────────
function resetValueFor(key: string): unknown {
  return props.defaultValues[key] ?? '';
}

function clearField(key: string) {
  setFieldValue(key, resetValueFor(key));
}

function removeChip(key: string) {
  const next = { ...props.modelValue, [key]: resetValueFor(key) };
  emit('update:modelValue', next);
  emit('apply', next);
}

function apply() {
  emit('apply', { ...props.modelValue });
}

function clear() {
  const reset: FilterState = { ...props.modelValue };
  for (const key of fieldKeys.value) reset[key] = resetValueFor(key);
  emit('update:modelValue', reset);
  emit('clear', reset);
  // Clear also re-fetches the clean data set, mirroring Apply.
  emit('apply', reset);
}

defineExpose({ open, apply, clear, activeCount });
</script>

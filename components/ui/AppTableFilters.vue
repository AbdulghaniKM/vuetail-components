<template>
  <div class="flex w-full basis-full flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all duration-150 active:scale-95"
        :class="
          appliedCount > 0 || panelOpen
            ? 'border-accent/40 bg-accent/10 text-accent'
            : 'border-border bg-surface text-text-muted hover:bg-muted hover:text-text'
        "
        :aria-expanded="panelOpen"
        @click="togglePanel"
      >
        <AppIcon name="icon-[heroicons-outline--funnel]" :size="0.75" class="shrink-0" />
        <span>Filters</span>
        <span
          v-if="appliedCount > 0"
          class="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[0.625rem] font-semibold text-white"
        >{{ appliedCount }}</span>
        <AppIcon
          name="icon-[heroicons-outline--chevron-down]"
          :size="0.75"
          class="shrink-0 opacity-60 transition-transform duration-150"
          :class="panelOpen ? 'rotate-180' : ''"
        />
      </button>

      <!-- applied filter chips — always visible, independent of panel open state -->
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
          @click="removeFilterChip(chip.key)"
        >
          <AppIcon name="icon-[heroicons-outline--x-mark]" :size="0.625" />
        </button>
      </span>
    </div>

    <!-- the actual collapsible panel — a real card above the table, not a floating menu -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="panelOpen" class="w-full rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-semibold text-text">Filters</p>
          <button
            type="button"
            class="text-text-muted transition-colors hover:text-text"
            aria-label="Collapse filters"
            @click="panelOpen = false"
          >
            <AppIcon name="icon-[heroicons-outline--chevron-up]" :size="1" />
          </button>
        </div>

        <p v-if="!filters.length" class="py-4 text-center text-sm text-text-muted">No filters available.</p>

        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div v-for="filter in filters" :key="filter.key">
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <p class="text-xs font-medium text-text-muted">{{ filter.label }}</p>
              <button
                v-if="isDraftActive(filter.key)"
                type="button"
                class="text-xs font-medium text-accent hover:underline"
                @click="clearDraftFilter(filter.key)"
              >
                Clear
              </button>
            </div>

            <!-- text -->
            <InputField
              v-if="filter.type === 'text'"
              :model-value="(draftFilters[filter.key] as string) || ''"
              :placeholder="filter.placeholder || `Filter by ${filter.label}…`"
              @update:model-value="setFilter(filter.key, $event as string)"
            />

            <!-- number -->
            <div v-else-if="filter.type === 'number'" class="flex items-center gap-2">
              <InputField
                type="number"
                :model-value="getNumberMin(filter.key)"
                :placeholder="filter.min !== undefined ? String(filter.min) : 'Min'"
                @update:model-value="setNumberMin(filter.key, $event)"
              />
              <span class="shrink-0 text-text-muted">–</span>
              <InputField
                type="number"
                :model-value="getNumberMax(filter.key)"
                :placeholder="filter.max !== undefined ? String(filter.max) : 'Max'"
                @update:model-value="setNumberMax(filter.key, $event)"
              />
            </div>

            <!-- select -->
            <Select
              v-else-if="filter.type === 'select'"
              :model-value="(draftFilters[filter.key] as string | number) ?? ''"
              :items="normalizeOptions(filter.options)"
              :placeholder="`Any ${filter.label}`"
              @update:model-value="setFilter(filter.key, $event)"
            />

            <!-- multiselect -->
            <AppPopover
              v-else-if="filter.type === 'multiselect'"
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
                  <span class="truncate" :class="multiSelectSummary(filter.key) ? 'text-text' : 'text-text/50'">
                    {{ multiSelectSummary(filter.key) || `Any ${filter.label}` }}
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
                    v-for="opt in normalizeOptions(filter.options)"
                    :key="String(opt.value)"
                    class="rounded-lg px-2 py-1 hover:bg-muted"
                  >
                    <AppCheckbox
                      :model-value="isMultiSelected(filter.key, opt.value)"
                      :label="opt.label"
                      @update:model-value="toggleMultiSelect(filter.key, opt.value, $event)"
                    />
                  </li>
                </ul>
              </template>
            </AppPopover>

            <!-- dateRange -->
            <AppPopover
              v-else-if="filter.type === 'dateRange'"
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
                  <span class="truncate" :class="dateRangeSummary(filter.key) ? 'text-text' : 'text-text/50'">
                    {{ dateRangeSummary(filter.key) || `Any ${filter.label}` }}
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
                      :model-value="getDateFrom(filter.key)"
                      @update:model-value="setDateRangeFrom(filter.key, $event)"
                    />
                  </div>
                  <div>
                    <p class="mb-1 text-xs text-text-muted">To</p>
                    <DatePicker
                      :model-value="getDateTo(filter.key)"
                      @update:model-value="setDateRangeTo(filter.key, $event)"
                    />
                  </div>
                </div>
              </template>
            </AppPopover>

            <!-- boolean -->
            <div v-else-if="filter.type === 'boolean'" class="flex gap-2">
              <button
                type="button"
                class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                :class="
                  draftFilters[filter.key] === true
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-surface text-text hover:bg-muted'
                "
                @click="setFilter(filter.key, draftFilters[filter.key] === true ? null : true)"
              >
                Yes
              </button>
              <button
                type="button"
                class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                :class="
                  draftFilters[filter.key] === false
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-surface text-text hover:bg-muted'
                "
                @click="setFilter(filter.key, draftFilters[filter.key] === false ? null : false)"
              >
                No
              </button>
            </div>
          </div>
        </div>

        <!-- footer stays put at the bottom of the card — every field above is a fixed-height
             trigger (popovers float, they don't expand the grid), so picking values never
             shifts this row up or down -->
        <div v-if="filters.length" class="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          <button
            type="button"
            class="text-xs font-medium text-text-muted transition-colors hover:text-text"
            @click="resetFilters"
          >
            Reset all
          </button>
          <AppButton variant="accent" label="Apply filters" size="sm" @click="applyFilters" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppPopover from './AppPopover.vue';
import AppIcon from './AppIcon.vue';
import AppButton from './AppButton.vue';
import AppCheckbox from './AppCheckbox.vue';
import InputField from './Fields/InputField.vue';
import DatePicker from './Fields/DatePicker.vue';
import Select from './Fields/Select.vue';
import type { SelectItem } from './Fields/Select.vue';

export type FilterType = 'select' | 'multiselect' | 'dateRange' | 'boolean' | 'text' | 'number';

export interface FilterDef {
  key: string;
  type: FilterType;
  label: string;
  options?: SelectItem[] | string[];
  placeholder?: string;
  min?: number;
  max?: number;
}

export type FilterValue =
  | string
  | number
  | boolean
  | null
  | (string | number)[]
  | { from: string | null; to: string | null }
  | { min: number | null; max: number | null };

export type ActiveFilters = Record<string, FilterValue>;

interface Props {
  modelValue: ActiveFilters;
  filters: FilterDef[];
}

const props = defineProps<Props>();
const emit = defineEmits<{ 'update:modelValue': [value: ActiveFilters] }>();

const panelOpen = ref(false);

// draftFilters is the panel's working copy — nothing here is applied to the
// table until "Apply filters" is pressed. It's reset from the applied value
// every time the panel is opened, so abandoned edits never leak forward.
const draftFilters = ref<ActiveFilters>({ ...props.modelValue });

watch(panelOpen, (open) => {
  if (open) draftFilters.value = { ...props.modelValue };
});

function togglePanel() {
  panelOpen.value = !panelOpen.value;
}

function setFilter(key: string, value: FilterValue) {
  draftFilters.value = { ...draftFilters.value, [key]: value };
}

function clearDraftFilter(key: string) {
  const next = { ...draftFilters.value };
  delete next[key];
  draftFilters.value = next;
}

function applyFilters() {
  emit('update:modelValue', { ...draftFilters.value });
}

function resetFilters() {
  draftFilters.value = {};
  emit('update:modelValue', {});
}

function isActiveValue(val: FilterValue | undefined): boolean {
  if (val === null || val === undefined || val === '') return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.values(val).some((v) => v !== null && v !== '');
  return true;
}

function isDraftActive(key: string): boolean {
  return isActiveValue(draftFilters.value[key]);
}

function normalizeOptions(options?: SelectItem[] | string[]): SelectItem[] {
  if (!options) return [];
  return options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
}

// number helpers
function getNumberMin(key: string): string {
  const v = draftFilters.value[key] as { min: number | null; max: number | null } | undefined;
  return v?.min !== null && v?.min !== undefined ? String(v.min) : '';
}
function getNumberMax(key: string): string {
  const v = draftFilters.value[key] as { min: number | null; max: number | null } | undefined;
  return v?.max !== null && v?.max !== undefined ? String(v.max) : '';
}
function setNumberMin(key: string, value: string | number) {
  const cur = (draftFilters.value[key] as { min: number | null; max: number | null }) ?? { min: null, max: null };
  const min = value === '' || value === null ? null : Number(value);
  setFilter(key, { min, max: cur.max ?? null });
}
function setNumberMax(key: string, value: string | number) {
  const cur = (draftFilters.value[key] as { min: number | null; max: number | null }) ?? { min: null, max: null };
  const max = value === '' || value === null ? null : Number(value);
  setFilter(key, { min: cur.min ?? null, max });
}

// dateRange helpers
function getDateFrom(key: string): string {
  const v = draftFilters.value[key] as { from: string | null; to: string | null } | undefined;
  return v?.from ?? '';
}
function getDateTo(key: string): string {
  const v = draftFilters.value[key] as { from: string | null; to: string | null } | undefined;
  return v?.to ?? '';
}
function setDateRangeFrom(key: string, value: string) {
  const cur = (draftFilters.value[key] as { from: string | null; to: string | null }) ?? { from: null, to: null };
  setFilter(key, { from: value || null, to: cur.to ?? null });
}
function setDateRangeTo(key: string, value: string) {
  const cur = (draftFilters.value[key] as { from: string | null; to: string | null }) ?? { from: null, to: null };
  setFilter(key, { from: cur.from ?? null, to: value || null });
}
function dateRangeSummary(key: string): string {
  const v = draftFilters.value[key] as { from: string | null; to: string | null } | undefined;
  if (!v?.from && !v?.to) return '';
  if (v.from && v.to) return `${v.from} – ${v.to}`;
  return v.from ? `from ${v.from}` : `until ${v.to}`;
}

// multiselect helpers
function isMultiSelected(key: string, value: string | number): boolean {
  const cur = (draftFilters.value[key] as (string | number)[]) ?? [];
  return cur.map(String).includes(String(value));
}
function toggleMultiSelect(key: string, value: string | number, checked: boolean) {
  const cur = (draftFilters.value[key] as (string | number)[]) ?? [];
  setFilter(key, checked ? [...cur, value] : cur.filter((v) => v !== value));
}
function multiSelectSummary(key: string): string {
  const arr = (draftFilters.value[key] as (string | number)[]) ?? [];
  if (arr.length === 0) return '';
  if (arr.length === 1) {
    const filter = props.filters.find((f) => f.key === key);
    const opt = normalizeOptions(filter?.options).find((o) => String(o.value) === String(arr[0]));
    return opt?.label ?? String(arr[0]);
  }
  return `${arr.length} selected`;
}

// display helpers — operate on whatever value is passed in (applied, for chips)
function getDisplayValue(filter: FilterDef, val: FilterValue): string {
  switch (filter.type) {
    case 'text':
      return String(val);
    case 'select': {
      const opt = normalizeOptions(filter.options).find((o) => String(o.value) === String(val));
      return opt?.label ?? String(val);
    }
    case 'number': {
      const { min, max } = val as { min: number | null; max: number | null };
      if (min !== null && max !== null) return `${min}–${max}`;
      if (min !== null) return `≥${min}`;
      return `≤${max}`;
    }
    case 'multiselect': {
      const arr = val as (string | number)[];
      if (arr.length === 1) {
        const opt = normalizeOptions(filter.options).find((o) => String(o.value) === String(arr[0]));
        return opt?.label ?? String(arr[0]);
      }
      return `${arr.length} selected`;
    }
    case 'dateRange': {
      const { from, to } = val as { from: string | null; to: string | null };
      if (from && to) return `${from} – ${to}`;
      if (from) return `from ${from}`;
      return `until ${to}`;
    }
    case 'boolean':
      return val ? 'Yes' : 'No';
    default:
      return String(val);
  }
}

// applied filters — drive the chip row, always visible regardless of panel state
const appliedChips = computed(() =>
  props.filters
    .filter((f) => isActiveValue(props.modelValue[f.key]))
    .map((f) => ({ key: f.key, label: f.label, display: getDisplayValue(f, props.modelValue[f.key]) })),
);

const appliedCount = computed(() => appliedChips.value.length);

function removeFilterChip(key: string) {
  const next = { ...props.modelValue };
  delete next[key];
  emit('update:modelValue', next);
}
</script>

<template>
  <fieldset
    class="flex min-w-0 flex-col gap-1.5"
    :disabled="disabled"
    :aria-describedby="error ? errorId : undefined"
  >
    <legend v-if="label" class="mb-1.5 text-control font-medium text-text">{{ label }}</legend>
    <div
      class="flex"
      :class="orientation === 'horizontal' ? 'flex-row flex-wrap gap-x-6 gap-y-3' : 'flex-col gap-3'"
    >
      <label
        v-for="(item, index) in items"
        :key="String(item.value)"
        class="flex items-start gap-2.5"
        :class="isDisabled(item) ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'"
      >
        <span class="relative mt-px flex shrink-0 items-center justify-center after:absolute after:-inset-3.5">
          <input
            type="radio"
            :name="groupName"
            :value="String(item.value)"
            :checked="item.value === modelValue"
            :disabled="isDisabled(item)"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="describedBy(item, index)"
            class="peer size-[1.125rem] cursor-[inherit] appearance-none rounded-full border bg-surface transition-colors duration-(--vt-duration) checked:border-accent checked:bg-accent"
            :class="
              error
                ? 'border-danger-text focus-visible:outline-danger-text'
                : 'border-border-strong enabled:hover:border-[color-mix(in_srgb,var(--color-border-strong),var(--color-text)_25%)]'
            "
            @change="select(item)"
          />
          <span aria-hidden="true" class="pointer-events-none absolute size-1.5 rounded-full bg-accent-fg opacity-0 peer-checked:opacity-100" />
        </span>
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="select-none text-control text-text">{{ item.label }}</span>
          <span v-if="item.description" :id="`${id}-${index}-description`" class="text-sm text-text-muted">
            {{ item.description }}
          </span>
        </span>
      </label>
    </div>
    <p v-if="error" :id="errorId" class="mt-0.5 flex items-center gap-1.5 text-sm text-danger-text">
      <AppIcon name="icon-[heroicons--exclamation-circle]" :size="1" aria-hidden="true" />
      {{ error }}
    </p>
  </fieldset>
</template>

<script setup lang="ts" generic="T extends string | number">
import { useId } from 'vue';
import AppIcon from './AppIcon.vue';

export interface RadioItem<V extends string | number = string | number> {
  label: string;
  value: V;
  description?: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue?: T;
    items: RadioItem<T>[];
    /** The group's name, shown as the fieldset's legend. */
    label?: string;
    orientation?: 'vertical' | 'horizontal';
    error?: string;
    disabled?: boolean;
    /** The native `name`; one is generated when left out. */
    name?: string;
  }>(),
  { orientation: 'vertical', disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: T];
  change: [value: T];
}>();

const id = useId();
const groupName = props.name ?? id;
const errorId = `${id}-error`;

const isDisabled = (item: RadioItem<T>) => props.disabled || !!item.disabled;

// Each radio carries its own description and the group's error, because screen readers announce
// a fieldset's description unevenly but always read the focused input's.
const describedBy = (item: RadioItem<T>, index: number) =>
  [item.description ? `${id}-${index}-description` : '', props.error ? errorId : ''].filter(Boolean).join(' ') || undefined;

function select(item: RadioItem<T>) {
  emit('update:modelValue', item.value);
  emit('change', item.value);
}
</script>

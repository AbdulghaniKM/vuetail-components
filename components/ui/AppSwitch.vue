<template>
  <div class="inline-flex items-start gap-2.5" :class="disabled ? 'opacity-45' : ''">
    <button
      :id="switchId"
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :aria-describedby="description ? descriptionId : undefined"
      :disabled="disabled"
      class="group relative inline-flex shrink-0 items-center rounded-switch border p-px transition-colors duration-(--vt-duration) after:absolute after:-inset-3 disabled:cursor-not-allowed"
      :class="[
        TRACK[size],
        modelValue
          ? 'border-accent bg-accent hover:enabled:bg-accent-hover'
          : 'border-border-strong bg-surface hover:enabled:border-[color-mix(in_srgb,var(--color-border-strong),var(--color-text)_25%)]',
        size === 'sm' ? 'mt-0.5' : size === 'lg' ? '-mt-0.5' : 'mt-0',
      ]"
      v-bind="$attrs"
      @click="toggle"
    >
      <span
        aria-hidden="true"
        class="pointer-events-none block rounded-switch transition-[translate,background-color] duration-(--vt-duration) ease-standard motion-reduce:transition-colors"
        :class="[THUMB[size], modelValue ? `bg-accent-fg ${ON[size]}` : 'bg-text-muted']"
      />
    </button>
    <span v-if="label || description || $slots.default" class="flex min-w-0 flex-col gap-0.5">
      <label v-if="label" :for="switchId" class="select-none text-control font-medium text-text" :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'">
        {{ label }}
      </label>
      <span v-if="description" :id="descriptionId" class="text-sm text-text-muted">{{ description }}</span>
      <slot />
    </span>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';

defineOptions({ inheritAttrs: false });

export type SwitchSize = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: SwitchSize;
  }>(),
  { modelValue: false, disabled: false, size: 'md' },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  change: [value: boolean];
}>();

// Track, thumb and the thumb's travel per size. Travel = track width − thumb − 2 × 1px padding
// − 2 × 1px edge, so the thumb lands flush at the end. `rtl:` flips the direction of travel.
const TRACK: Record<SwitchSize, string> = { sm: 'h-4 w-7', md: 'h-5 w-9', lg: 'h-6 w-11' };
const THUMB: Record<SwitchSize, string> = { sm: 'size-3', md: 'size-4', lg: 'size-5' };
const ON: Record<SwitchSize, string> = {
  sm: 'translate-x-3 rtl:-translate-x-3',
  md: 'translate-x-4 rtl:-translate-x-4',
  lg: 'translate-x-5 rtl:-translate-x-5',
};

const switchId = useId();
const descriptionId = `${switchId}-description`;

function toggle() {
  if (props.disabled) return;
  const next = !props.modelValue;
  emit('update:modelValue', next);
  emit('change', next);
}
</script>

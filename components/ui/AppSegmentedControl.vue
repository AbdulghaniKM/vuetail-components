<template>
  <fieldset class="inline-flex min-w-0 max-w-full flex-col gap-1.5" :disabled="disabled">
    <legend :class="hideLabel ? 'sr-only' : 'mb-1.5 text-sm font-medium text-text'">{{ label }}</legend>
    <!-- One track, equal segments sized to the widest label, so the indicator only translates. -->
    <div
      class="grid min-w-0 auto-cols-fr grid-flow-col rounded-md border border-border bg-muted p-0.5"
      :class="SIZE[size].track"
    >
      <label
        v-for="(item, index) in items"
        :key="String(item.value)"
        class="relative flex min-w-0 select-none items-center justify-center gap-1.5 rounded-sm px-3 font-medium transition-colors duration-(--vt-duration) after:absolute after:inset-x-0 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
        :class="[
          SIZE[size].segment,
          isDisabled(item) ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
          item.value === modelValue ? 'text-text' : 'text-text-muted',
          !isDisabled(item) && item.value !== modelValue && 'hover:text-text',
        ]"
      >
        <!-- Native radio: one Tab stop, arrows move and select, "2 of 3" for free. -->
        <input
          type="radio"
          class="sr-only"
          :name="groupName"
          :value="String(item.value)"
          :checked="item.value === modelValue"
          :disabled="isDisabled(item)"
          :aria-describedby="item.description ? `${id}-${index}-description` : undefined"
          @change="select(item)"
        />
        <!-- The one indicator travels between segments (a FLIP transform through layout-id). -->
        <motion.span
          v-if="item.value === modelValue"
          :layout-id="indicatorId"
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 rounded-sm border border-border-strong bg-surface shadow-sm"
          :transition="indicatorTransition()"
        />
        <AppIcon v-if="item.icon" :name="item.icon" :size="SIZE[size].icon" class="relative shrink-0" aria-hidden="true" />
        <span class="relative truncate">{{ item.label }}</span>
        <span v-if="item.description" :id="`${id}-${index}-description`" hidden>{{ item.description }}</span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts" generic="T extends string | number">
import { useId } from 'vue';
import { motion } from 'motion-v';
import AppIcon from './AppIcon.vue';
import { useMotionTokens } from '@/composables/useMotionTokens';
import { useReducedMotion } from '@/composables/useReducedMotion';

export interface SegmentedItem<V extends string | number = string | number> {
  label: string;
  value: V;
  icon?: string;
  /** Read by screen readers as the option's description (not shown). */
  description?: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue?: T;
    items: SegmentedItem<T>[];
    /** Names the group (the fieldset's legend). Always required; `hideLabel` keeps it for screen readers only. */
    label: string;
    hideLabel?: boolean;
    size?: 'sm' | 'md';
    disabled?: boolean;
    /** The native `name`; one is generated when left out. */
    name?: string;
  }>(),
  { hideLabel: false, size: 'md', disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: T];
  change: [value: T];
}>();

// The track's 2px padding and 1px edge come off the control height; the after: box takes each
// segment back out to a 44px hit area (bible §2).
const SIZE = {
  sm: { track: 'h-control-sm', segment: 'text-sm after:-inset-y-2.5', icon: 1 },
  md: { track: 'h-control-md', segment: 'text-control after:-inset-y-1.5', icon: 1.125 },
} as const;

const id = useId();
const groupName = props.name ?? id;
const indicatorId = `segmented-indicator-${id}`;

const isDisabled = (item: SegmentedItem<T>) => props.disabled || !!item.disabled;

function select(item: SegmentedItem<T>) {
  if (item.value === props.modelValue) return;
  emit('update:modelValue', item.value);
  emit('change', item.value);
}

const reduced = useReducedMotion();
const { state } = useMotionTokens();
// Read per move, so a preset switch reaches the next one; under reduced motion it jumps.
const indicatorTransition = () => (reduced.value ? { duration: 0 } : state());
</script>

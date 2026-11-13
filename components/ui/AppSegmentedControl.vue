<template>
  <fieldset class="inline-flex min-w-0 max-w-full flex-col gap-1.5" :disabled="disabled">
    <legend :class="hideLabel ? 'sr-only' : 'mb-1.5 text-sm font-medium text-text'">{{ label }}</legend>
    <!-- One track, equal segments sized to the widest label. -->
    <div
      ref="track"
      class="relative grid min-w-0 auto-cols-fr grid-flow-col rounded-md border border-border bg-muted p-0.5"
      :class="SIZE[size].track"
    >
      <!-- The indicator: one AppBlob behind the labels. Moving, it stretches from the old segment
           to the new one and settles (the head leads, the tail follows); the edge layer takes the
           place of the old shadow. -->
      <AppBlob
        class="absolute top-0 left-0"
        v-bind="canvas"
        :shapes="shapes"
        fill="var(--color-surface)"
        edge="var(--color-border-strong)"
        :blur="blob.blur.value"
      />
      <label
        v-for="(item, index) in items"
        :key="String(item.value)"
        :data-indicator="String(item.value)"
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
        <AppIcon v-if="item.icon" :name="item.icon" :size="SIZE[size].icon" class="relative shrink-0" aria-hidden="true" />
        <span class="relative truncate">{{ item.label }}</span>
        <span v-if="item.description" :id="`${id}-${index}-description`" hidden>{{ item.description }}</span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts" generic="T extends string | number">
import { computed, ref, useId } from 'vue';
import AppBlob from './AppBlob.vue';
import AppIcon from './AppIcon.vue';
import { useBlob } from '@/composables/useBlob';
import { useIndicator } from '@/composables/useIndicator';

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

const isDisabled = (item: SegmentedItem<T>) => props.disabled || !!item.disabled;

function select(item: SegmentedItem<T>) {
  if (item.value === props.modelValue) return;
  emit('update:modelValue', item.value);
  emit('change', item.value);
}

// The segment's own small corner, not the blob's large default, so the pill stays a segment.
const blob = useBlob({ radius: '--radius-sm' });
const track = ref<HTMLElement | null>(null);
const active = computed(() => (props.modelValue === undefined ? null : String(props.modelValue)));
const { canvas, shapes } = useIndicator(track, active, { blob });
</script>

<template>
  <div
    class="flex w-full min-w-0 flex-col gap-1"
    :class="disabled ? 'opacity-45' : ''"
    :role="isRange ? 'group' : undefined"
    :aria-labelledby="isRange && label ? labelId : undefined"
    :aria-disabled="isRange && disabled ? 'true' : undefined"
    v-bind="isRange ? $attrs : {}"
  >
    <!-- One <label> holds the name and the value: the value is aria-hidden, so it stays out of the
         name, and a disabled input's label is exempt from the contrast check. -->
    <component
      :is="isRange ? 'div' : 'label'"
      v-if="label || showValue"
      :for="isRange ? undefined : inputId"
      class="flex items-baseline justify-between gap-3"
    >
      <span v-if="label" :id="labelId" class="text-control font-medium text-text">{{ label }}</span>
      <span v-if="showValue" aria-hidden="true" class="ms-auto font-mono text-sm tabular-nums text-text-muted">{{ valueText }}</span>
    </component>

    <div class="relative flex h-11 items-center">
      <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 h-1 rounded-switch bg-border-strong">
        <div class="absolute inset-y-0 rounded-switch bg-accent" :style="fillStyle" />
      </div>

      <input
        :id="inputId"
        ref="lowRef"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="low"
        :disabled="disabled"
        :aria-label="isRange ? minLabel : undefined"
        :aria-valuetext="format ? format(low) : undefined"
        :class="[INPUT, isRange ? 'pointer-events-none' : '']"
        :style="isRange ? { zIndex: lowOnTop ? 2 : 1 } : undefined"
        v-bind="isRange ? {} : $attrs"
        @input="onInput('low', $event)"
        @change="emit('change', model)"
      />
      <input
        v-if="isRange"
        ref="highRef"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="high"
        :disabled="disabled"
        :aria-label="maxLabel"
        :aria-valuetext="format ? format(high) : undefined"
        :class="[INPUT, 'pointer-events-none']"
        :style="{ zIndex: lowOnTop ? 1 : 2 }"
        @input="onInput('high', $event)"
        @change="emit('change', model)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';

defineOptions({ inheritAttrs: false });

export type SliderValue = number | [number, number];

const props = withDefaults(
  defineProps<{
    /** A number, or `[low, high]` for a range with two thumbs. */
    modelValue?: SliderValue;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    disabled?: boolean;
    /** Show the current value beside the label. */
    showValue?: boolean;
    /** Formats the shown value and each thumb's `aria-valuetext` ("$40", "40 percent"). */
    format?: (value: number) => string;
    /** Names of the two thumbs of a range, read after the group's label. */
    minLabel?: string;
    maxLabel?: string;
  }>(),
  { modelValue: 0, min: 0, max: 100, step: 1, disabled: false, showValue: true, minLabel: 'Minimum', maxLabel: 'Maximum' },
);

const emit = defineEmits<{
  'update:modelValue': [value: SliderValue];
  change: [value: SliderValue];
}>();

// The native input does the work: arrows, Page Up / Down, Home / End, touch and the screen reader
// role all come from it. Only the look is ours. Each thumb is styled twice because WebKit and
// Gecko name the pseudo-element differently, and a selector list with an unknown one is dropped
// whole. Written out in full so Tailwind's scanner finds every class. The ring goes on the thumb,
// not around the 44px-tall input.
const INPUT = [
  'absolute inset-x-0 h-11 w-full cursor-pointer appearance-none bg-transparent outline-none disabled:cursor-not-allowed [&::-moz-range-track]:bg-transparent',
  '[&::-webkit-slider-thumb]:size-[1.125rem] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-switch [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:duration-(--vt-duration)',
  '[&:hover::-webkit-slider-thumb]:bg-muted [&:disabled::-webkit-slider-thumb]:cursor-not-allowed',
  '[&:focus-visible::-webkit-slider-thumb]:outline-2 [&:focus-visible::-webkit-slider-thumb]:outline-offset-2 [&:focus-visible::-webkit-slider-thumb]:outline-ring',
  '[&::-moz-range-thumb]:size-[1.125rem] [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-switch [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-colors [&::-moz-range-thumb]:duration-(--vt-duration)',
  '[&:hover::-moz-range-thumb]:bg-muted [&:disabled::-moz-range-thumb]:cursor-not-allowed',
  '[&:focus-visible::-moz-range-thumb]:outline-2 [&:focus-visible::-moz-range-thumb]:outline-offset-2 [&:focus-visible::-moz-range-thumb]:outline-ring',
].join(' ');

const inputId = useId();
const labelId = `${inputId}-label`;
const lowRef = ref<HTMLInputElement | null>(null);
const highRef = ref<HTMLInputElement | null>(null);

const isRange = computed(() => Array.isArray(props.modelValue));
const clamp = (v: number) => Math.min(props.max, Math.max(props.min, v));
const low = computed(() => clamp(Array.isArray(props.modelValue) ? props.modelValue[0] : props.modelValue));
const high = computed(() => clamp(Array.isArray(props.modelValue) ? props.modelValue[1] : props.modelValue));
const model = computed<SliderValue>(() => (isRange.value ? [low.value, high.value] : low.value));

const pct = (v: number) => (props.max === props.min ? 0 : ((v - props.min) / (props.max - props.min)) * 100);

// Logical insets, so the fill follows the native input when the page is RTL. It tracks the thumb
// directly and never transitions, so it is not a width animation.
const fillStyle = computed(() => ({
  insetInlineStart: `${isRange.value ? pct(low.value) : 0}%`,
  insetInlineEnd: `${100 - pct(high.value)}%`,
}));

// Two thumbs on one spot: the one on top is the only one the pointer can reach. Near the end of
// the track that has to be the low thumb, or the pair could never move back.
const lowOnTop = computed(() => low.value === high.value && high.value > (props.min + props.max) / 2);

const fmt = (v: number) => (props.format ? props.format(v) : String(v));
const valueText = computed(() => (isRange.value ? `${fmt(low.value)} – ${fmt(high.value)}` : fmt(low.value)));

function onInput(which: 'low' | 'high', event: Event) {
  const input = event.target as HTMLInputElement;
  let next = Number(input.value);
  if (!isRange.value) {
    emit('update:modelValue', next);
    return;
  }
  // Thumbs do not cross: a thumb stops at the other one. The input is put back by hand because
  // Vue skips the patch when the bound value has not changed.
  if (which === 'low' && next > high.value) next = high.value;
  if (which === 'high' && next < low.value) next = low.value;
  input.value = String(next);
  emit('update:modelValue', which === 'low' ? [next, high.value] : [low.value, next]);
}

defineExpose({ focus: () => lowRef.value?.focus() });
</script>

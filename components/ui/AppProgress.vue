<template>
  <div
    class="min-w-0"
    :class="[variant === 'circular' ? 'inline-flex items-center gap-3' : 'flex w-full flex-col gap-1.5', attrs.class]"
    :style="attrs.style as StyleValue"
  >
    <!-- Bar: the label and the value share a row above the track. -->
    <div v-if="variant === 'bar' && (label || showValue)" class="flex items-baseline justify-between gap-3">
      <span v-if="label" :id="labelId" class="text-sm font-medium text-text">{{ label }}</span>
      <span v-if="showValue && !indeterminate" aria-hidden="true" class="ms-auto text-sm tabular-nums text-text-muted">{{ valueText }}</span>
    </div>

    <div
      role="progressbar"
      :aria-labelledby="label ? labelId : undefined"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="indeterminate ? undefined : clamped"
      :aria-valuetext="indeterminate || !format ? undefined : valueText"
      :data-tone="tone"
      v-bind="rest"
      :class="variant === 'circular' ? ['relative inline-grid shrink-0 place-items-center', CIRCLE_SIZE[size]] : ['relative w-full overflow-hidden rounded-full bg-muted', BAR_SIZE[size]]"
    >
      <template v-if="variant === 'bar'">
        <!-- Indeterminate: a segment that sweeps the track; under reduced motion a full, fading bar. -->
        <div
          v-if="indeterminate"
          class="vt-progress-sweep absolute inset-y-0 start-0 w-2/5 motion-reduce:w-full"
          :class="FILL[tone]"
        />
        <!-- Determinate: one full-width fill scaled from the start edge, as AppPageLoader does. -->
        <div
          v-else
          class="vt-progress-fill h-full w-full transition-transform duration-(--vt-duration) ease-standard"
          :class="FILL[tone]"
          :style="{ transform: `scaleX(${ratio})` }"
        />
      </template>

      <template v-else>
        <svg
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          class="col-start-1 row-start-1 size-full -rotate-90"
          :class="indeterminate ? 'vt-progress-spin' : ''"
        >
          <circle cx="18" cy="18" r="15" class="stroke-muted" :stroke-width="STROKE[size]" />
          <!-- pathLength 100 makes the dash offset read as a percentage. -->
          <circle
            cx="18"
            cy="18"
            r="15"
            pathLength="100"
            stroke-dasharray="100"
            :stroke-dashoffset="indeterminate ? 70 : 100 - ratio * 100"
            :stroke-width="STROKE[size]"
            stroke-linecap="round"
            class="transition-[stroke-dashoffset] duration-(--vt-duration) ease-standard"
            :class="STROKE_TONE[tone]"
            :style="indeterminate || ratio > 0 ? undefined : { opacity: 0 }"
          />
        </svg>
        <span
          v-if="showValue && !indeterminate && size !== 'sm'"
          aria-hidden="true"
          class="col-start-1 row-start-1 tabular-nums text-text"
          :class="size === 'lg' ? 'text-sm font-semibold' : 'text-xs font-medium'"
        >{{ valueText }}</span>
      </template>
    </div>

    <!-- Circular: the label (and, when small, the value) sit beside the ring. -->
    <div v-if="variant === 'circular' && (label || (showValue && size === 'sm' && !indeterminate))" class="flex min-w-0 flex-col">
      <span v-if="label" :id="labelId" class="text-sm font-medium text-text">{{ label }}</span>
      <span v-if="showValue && size === 'sm' && !indeterminate" aria-hidden="true" class="text-sm tabular-nums text-text-muted">{{ valueText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, useId, type StyleValue } from 'vue';

defineOptions({ inheritAttrs: false });

export type ProgressTone = 'accent' | 'success' | 'warning' | 'danger' | 'info';

const props = withDefaults(
  defineProps<{
    /** The current value. `null` or left out: indeterminate (work under way, amount unknown). */
    value?: number | null;
    min?: number;
    max?: number;
    /** Visible name above the bar, or beside the ring. Without one, pass `aria-label`. */
    label?: string;
    /** Show the value as text: a percentage, or what `format` returns. */
    showValue?: boolean;
    /** Words for the value ("3 of 8 files"), shown and read out as `aria-valuetext`. */
    format?: (value: number, ratio: number) => string;
    tone?: ProgressTone;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'bar' | 'circular';
  }>(),
  {
    value: null,
    min: 0,
    max: 100,
    label: undefined,
    showValue: false,
    format: undefined,
    tone: 'accent',
    size: 'md',
    variant: 'bar',
  },
);

// `class` and `style` go on the wrapper; `aria-label` and the rest on the progressbar.
const attrs = useAttrs();
const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});

const labelId = `progress-label-${useId()}`;

const indeterminate = computed(() => props.value === null || props.value === undefined || Number.isNaN(props.value));
const span = computed(() => Math.max(props.max - props.min, 0));
const clamped = computed(() => Math.min(Math.max(props.value ?? props.min, props.min), props.max));
const ratio = computed(() => (span.value === 0 ? 0 : (clamped.value - props.min) / span.value));
const valueText = computed(() =>
  props.format ? props.format(clamped.value, ratio.value) : `${Math.round(ratio.value * 100)}%`,
);

// Status tones are fills, and the label or value text carries the meaning (bible §7).
const FILL: Record<ProgressTone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};
const STROKE_TONE: Record<ProgressTone, string> = {
  accent: 'stroke-accent',
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
  info: 'stroke-info',
};
const BAR_SIZE = { sm: 'h-1', md: 'h-2', lg: 'h-3' } as const;
const CIRCLE_SIZE = { sm: 'size-6', md: 'size-10', lg: 'size-16' } as const;
const STROKE = { sm: 5, md: 4, lg: 3.5 } as const;
</script>

<style scoped>
/* The fill grows from the start edge, so RTL fills from the right. */
.vt-progress-fill { transform-origin: left; }
.vt-progress-fill:dir(rtl) { transform-origin: right; }

/* Indeterminate loops are indicators, not state changes: they keep their own pace. */
.vt-progress-sweep { animation: vt-progress-sweep 1.6s ease-in-out infinite; }
.vt-progress-sweep:dir(rtl) { animation-name: vt-progress-sweep-rtl; }
.vt-progress-spin { animation: vt-progress-spin 1s linear infinite; }

@keyframes vt-progress-sweep {
  from { transform: translateX(-100%); }
  to { transform: translateX(250%); }
}
@keyframes vt-progress-sweep-rtl {
  from { transform: translateX(100%); }
  to { transform: translateX(-250%); }
}
@keyframes vt-progress-spin {
  to { transform: rotate(360deg); }
}
@keyframes vt-progress-fade {
  50% { opacity: 0.4; }
}

/* Reduced motion drops the movement and keeps a slow fade, so the work still reads as under way. */
@media (prefers-reduced-motion: reduce) {
  .vt-progress-sweep,
  .vt-progress-spin { animation: vt-progress-fade 2s ease-in-out infinite; }
}
</style>

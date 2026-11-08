<template>
  <span
    class="inline-flex h-[1.375rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-badge px-2 text-xs font-semibold leading-none"
    :class="variantClass"
  >
    <span v-if="dot" class="size-1.5 rounded-full bg-current" aria-hidden="true" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  label?: string;
  /** Tone. `primary` is the accent, `error` is danger, `muted` is neutral. */
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'surface' | 'outline' | 'muted';
  /** A leading dot, for statuses a reader scans down a list. */
  dot?: boolean;
}>(), {
  variant: 'primary',
  dot: false,
});

// Soft fills with status text: every pair here passes AA in all six preset and theme
// combinations (checked by scripts/tokens.mjs).
const variantClass = computed(() => ({
  primary: 'bg-accent-subtle text-accent-text',
  success: 'bg-success-subtle text-success-text',
  warning: 'bg-warning-subtle text-warning-text',
  error: 'bg-danger-subtle text-danger-text',
  info: 'bg-info-subtle text-info-text',
  surface: 'border border-border bg-surface text-text',
  outline: 'border border-border-strong text-text-muted',
  muted: 'bg-muted text-text-muted',
}[props.variant]));
</script>

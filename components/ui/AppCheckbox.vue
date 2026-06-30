<template>
  <label
    class="inline-flex cursor-pointer items-center gap-2"
    :class="disabled ? 'cursor-not-allowed opacity-50' : ''"
  >
    <span class="relative flex shrink-0 items-center justify-center">
      <input
        ref="inputRef"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        class="peer size-4 cursor-pointer appearance-none rounded border border-border bg-surface transition-colors checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed"
        v-bind="$attrs"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span
        v-if="indeterminate"
        class="pointer-events-none absolute h-0.5 w-2.5 rounded-full bg-white"
      />
      <AppIcon
        v-else-if="modelValue"
        name="icon-[heroicons-outline--check]"
        :size="0.625"
        class="pointer-events-none absolute text-white"
      />
    </span>
    <span v-if="label" class="select-none text-sm text-text">{{ label }}</span>
    <slot />
  </label>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import AppIcon from './AppIcon.vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    label?: string;
  }>(),
  { modelValue: false, indeterminate: false, disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const inputRef = ref<HTMLInputElement | null>(null);

function applyIndeterminate(val: boolean) {
  if (inputRef.value) inputRef.value.indeterminate = val;
}

onMounted(() => applyIndeterminate(props.indeterminate));
watch(() => props.indeterminate, applyIndeterminate);
</script>

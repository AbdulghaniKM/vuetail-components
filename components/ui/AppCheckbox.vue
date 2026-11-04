<template>
  <label
    class="inline-flex cursor-pointer items-center gap-2.5"
    :class="disabled ? 'cursor-not-allowed opacity-45' : ''"
  >
    <span class="relative flex shrink-0 items-center justify-center">
      <input
        ref="inputRef"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        class="peer size-[1.125rem] cursor-pointer appearance-none rounded-sm border border-border-strong bg-surface transition-colors duration-(--vt-duration) checked:border-accent checked:bg-accent indeterminate:border-accent indeterminate:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed"
        v-bind="$attrs"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span
        v-if="indeterminate"
        class="pointer-events-none absolute h-0.5 w-2.5 rounded-full bg-accent-fg"
      />
      <AppIcon
        v-else-if="modelValue"
        name="icon-[heroicons-outline--check]"
        :size="0.75"
        class="pointer-events-none absolute text-accent-fg"
      />
    </span>
    <span v-if="label" class="select-none text-control text-text">{{ label }}</span>
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

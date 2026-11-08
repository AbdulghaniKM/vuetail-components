<template>
 <div class="flex flex-col gap-1.5 w-full">
 <label v-if="label" :for="fieldId" class="text-control font-medium text-text">
 {{ label }}
 </label>
 <textarea
 :id="fieldId"
 :value="modelValue"
 :placeholder="placeholder"
 :readonly="readonly"
 :disabled="readonly"
 :rows="rows"
 :aria-invalid="error ? 'true' : undefined"
 :aria-describedby="error ? errorId : undefined"
 @input="handleInput"
 class="w-full min-h-[calc(var(--spacing-control-md)*2.5)] rounded-md border border-border-strong bg-surface px-3 py-2 text-control text-text placeholder:text-text-subtle focus-visible:-outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-(--vt-duration) ease-standard resize-y"
 :class="[customClass, { 'border-danger-text focus-visible:outline-danger-text': error }]"
 />
 <span
 :id="errorId"
 role="alert"
 aria-live="polite"
 class="block min-h-[1.25rem] text-sm text-danger-text"
 :class="{ invisible: !error }"
 >{{ error }}</span>
 </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';

interface Props {
 modelValue: string;
 label?: string;
 placeholder?: string;
 readonly?: boolean;
 error?: string;
 customClass?: string;
 rows?: number;
}

withDefaults(defineProps<Props>(), {
 placeholder: '',
 readonly: false,
 rows: 4,
});

const emit = defineEmits<{
 'update:modelValue': [value: string];
}>();

const fieldId = useId();
const errorId = `${fieldId}-error`;

const handleInput = (event: Event) => {
 const target = event.target as HTMLTextAreaElement;
 emit('update:modelValue', target.value);
};
</script>

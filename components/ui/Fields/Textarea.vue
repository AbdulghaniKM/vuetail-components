<template>
 <div class="flex flex-col gap-1.5 w-full">
 <label v-if="label" :for="fieldId" class="text-sm font-medium text-text">
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
 class="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text placeholder:text-text/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-y"
 :class="[customClass, { 'border-error focus:border-error focus:ring-error/20': error }]"
 />
 <span
 :id="errorId"
 role="alert"
 aria-live="polite"
 class="block min-h-[1.25rem] text-sm text-error"
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

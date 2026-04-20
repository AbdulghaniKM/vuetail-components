<template>
 <form @submit.prevent="handleSubmit" class="flex min-h-0 flex-col" :class="containerClass" novalidate>
 <!-- Scrollable fields area -->
 <div class="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin" :class="fieldGap">
 <div
 v-for="(row, rowIndex) in fields"
 :key="rowIndex"
 class="grid"
 :class="[rowClass || getDefaultRowClass(row), fieldGap]"
 >
 <!-- Render fields in row -->
 <div
 v-for="(field, fieldIndex) in row"
 :key="field.key ?? fieldIndex"
 :class="field.customClass"
 >
 <!-- Input Field -->
 <InputField
 v-if="field.type === 'text' || field.type === 'password' || field.type === 'email' || field.type === 'number' || field.type === 'datetime-local'"
 v-model="modelValue[field.key]"
 :label="field.label"
 :type="field.type"
 :placeholder="field.placeholder"
 :readonly="field.readonly"
 :error="errors[field.key]"
 />

 <!-- Textarea -->
 <Textarea
 v-else-if="field.type === 'textarea'"
 v-model="modelValue[field.key]"
 :label="field.label"
 :placeholder="field.placeholder"
 :readonly="field.readonly"
 :rows="field.rows"
 :error="errors[field.key]"
 />

 <!-- Select -->
 <Select
 v-else-if="field.type === 'select'"
 v-model="modelValue[field.key]"
 :label="field.label"
 :items="field.items || []"
 :placeholder="field.placeholder"
 :readonly="field.readonly"
 :error="errors[field.key]"
 :searchable="field.searchable ?? true"
 />

 <!-- Phone Input -->
 <PhoneInput
 v-else-if="field.type === 'phone'"
 v-model="modelValue[field.key]"
 :label="field.label"
 :placeholder="field.placeholder"
 :readonly="field.readonly"
 :error="errors[field.key]"
 />

 <!-- DatePicker -->
 <DatePicker
 v-else-if="field.type === 'date' || field.type === 'datetime'"
 v-model="modelValue[field.key]"
 :label="field.label"
 :mode="field.type === 'datetime' ? 'datetime' : 'date'"
 :placeholder="field.placeholder"
 :readonly="field.readonly"
 :error="errors[field.key]"
 :min="field.min"
 :max="field.max"
 />

 <!-- File Input -->
 <FileInput
 v-else-if="field.type === 'file'"
 v-model="modelValue[field.key]"
 :label="field.label"
 :placeholder="field.placeholder"
 :readonly="field.readonly"
 :error="errors[field.key]"
 :multiple="(field as any).multiple"
 :accept="(field as any).accept"
 />
 </div>
 </div>

 <slot name="before-actions" :errors="errors" />
 </div>

 <!-- Submit Button -->
 <div class="mt-4 flex shrink-0 justify-end gap-4">
 <slot name="actions" :submitting="isSubmitting">
 <button
 type="submit"
 :disabled="isSubmitting"
 class="rounded-lg bg-accent px-6 py-2.5 font-semibold text-white transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {{ isSubmitting ? 'Submitting...' : 'Submit' }}
 </button>
 </slot>
 </div>
 </form>
</template>

<script setup lang="ts" generic="TSchema extends ZodType = ZodType">
import { ref } from 'vue';
import { z, type ZodType } from 'zod';
import { useFormValidation } from '@/composables/useFormValidation';
import InputField from './InputField.vue';
import Textarea from './Textarea.vue';
import Select from './Select.vue';
import PhoneInput from './PhoneInput.vue';
import DatePicker from './DatePicker.vue';
import FileInput from './FileInput.vue';
import type { FormField, FormFieldRow } from '@/types/form';

type SchemaValues<T extends ZodType> = z.infer<T>;

interface Props {
 /** Form model — use z.infer<typeof yourSchema> for typing. */
 modelValue: Record<string, any>;
 fields: FormFieldRow[];
 schema?: TSchema;
 containerClass?: string;
 rowClass?: string;
 fieldGap?: string;
}

const props = withDefaults(defineProps<Props>(), {
 modelValue: () => ({}),
 fields: () => [],
 containerClass: 'space-y-4',
 fieldGap: 'gap-4',
});

const emit = defineEmits<{
 'update:modelValue': [value: Record<string, any>];
 /** Emitted when submit passes validation. Parent owns the network. */
 submit: [values: SchemaValues<TSchema>];
}>();

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);

useFormValidation(props.modelValue, props.schema, errors);

const getDefaultRowClass = (row: FormField[]) => {
 const fieldCount = row.length;
 if (fieldCount === 1) return 'grid-cols-1';
 if (fieldCount === 2) return 'grid-cols-1 md:grid-cols-2';
 if (fieldCount === 3) return 'grid-cols-1 md:grid-cols-3';
 return `grid-cols-1 md:grid-cols-${fieldCount}`;
};

const validate = (): boolean => {
 errors.value = {};

 if (!props.schema) return true;

 try {
 props.schema.parse(props.modelValue);
 return true;
 } catch (error) {
 if (error instanceof z.ZodError) {
 error.issues.forEach((err) => {
 const path = err.path.join('.');
 errors.value[path] = err.message;
 });
 }
 return false;
 }
};

const clearErrors = () => {
 errors.value = {};
};

const handleSubmit = () => {
 if (!validate()) return;
 isSubmitting.value = true;
 // The parent handles the network and MUST call `finish()` / `finishError()` via the
 // exposed control — or just let this flag reset immediately. For personal-scope,
 // reset immediately after emit so the button doesn't stay disabled indefinitely.
 emit('submit', props.modelValue as SchemaValues<TSchema>);
 isSubmitting.value = false;
};

const setSubmitting = (value: boolean) => {
 isSubmitting.value = value;
};

defineExpose({
 submit: handleSubmit,
 validate,
 clearErrors,
 setSubmitting,
});
</script>

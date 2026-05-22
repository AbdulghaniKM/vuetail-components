<template>
  <form @submit.prevent="handleSubmit" class="flex min-h-0 flex-col" :class="containerClass" novalidate>
    <!-- Scrollable fields area -->
    <div class="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto" :class="fieldGap">
      <div
        v-for="(row, rowIndex) in fields"
        :key="rowIndex"
        class="grid"
        :class="[rowClass || getDefaultRowClass(row), fieldGap]"
      >
        <div
          v-for="(field, fieldIndex) in row"
          :key="field.key ?? fieldIndex"
          :class="field.customClass"
        >
          <InputField
            v-if="field.type === 'text' || field.type === 'password' || field.type === 'email' || field.type === 'number' || field.type === 'datetime-local'"
            :model-value="getFieldValue(field.key)"
            :label="field.label"
            :type="field.type"
            :placeholder="field.placeholder"
            :readonly="field.readonly"
            :error="displayErrors[field.key]"
            @update:model-value="setFieldValue(field.key, $event)"
          />

          <Textarea
            v-else-if="field.type === 'textarea'"
            :model-value="getFieldValue(field.key)"
            :label="field.label"
            :placeholder="field.placeholder"
            :readonly="field.readonly"
            :rows="field.rows"
            :error="displayErrors[field.key]"
            @update:model-value="setFieldValue(field.key, $event)"
          />

          <Select
            v-else-if="field.type === 'select'"
            :model-value="getFieldValue(field.key)"
            :label="field.label"
            :items="field.items || []"
            :placeholder="field.placeholder"
            :readonly="field.readonly"
            :error="displayErrors[field.key]"
            :searchable="field.searchable ?? true"
            @update:model-value="setFieldValue(field.key, $event)"
          />

          <PhoneInput
            v-else-if="field.type === 'phone'"
            :model-value="getFieldValue(field.key)"
            :label="field.label"
            :placeholder="field.placeholder"
            :readonly="field.readonly"
            :error="displayErrors[field.key]"
            @update:model-value="setFieldValue(field.key, $event)"
          />

          <DatePicker
            v-else-if="field.type === 'date' || field.type === 'datetime'"
            :model-value="getFieldValue(field.key)"
            :label="field.label"
            :mode="field.type === 'datetime' ? 'datetime' : 'date'"
            :placeholder="field.placeholder"
            :readonly="field.readonly"
            :error="displayErrors[field.key]"
            :min="field.min"
            :max="field.max"
            @update:model-value="setFieldValue(field.key, $event)"
          />

          <FileInput
            v-else-if="field.type === 'file'"
            :model-value="getFieldValue(field.key)"
            :label="field.label"
            :placeholder="field.placeholder"
            :readonly="field.readonly"
            :error="displayErrors[field.key]"
            :multiple="(field as any).multiple"
            :accept="(field as any).accept"
            @update:model-value="setFieldValue(field.key, $event)"
          />
        </div>
      </div>

      <slot name="before-actions" :errors="displayErrors" />
    </div>

    <div class="mt-4 flex shrink-0 justify-end gap-4">
      <slot name="actions" :submitting="submitting">
        <button
          type="submit"
          :disabled="submitting"
          class="rounded-lg bg-accent px-6 py-2.5 font-semibold text-white transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ submitting ? 'Submitting...' : 'Submit' }}
        </button>
      </slot>
    </div>
  </form>
</template>

<script setup lang="ts" generic="TSchema extends ZodType = ZodType">
  import { computed, ref } from 'vue';
  import { z, type ZodType } from 'zod';
  import { FormModel } from '@/lib/FormModel';
  import { useFormValidation } from '@/composables/useFormValidation';
  import InputField from './InputField.vue';
  import Textarea from './Textarea.vue';
  import Select from './Select.vue';
  import PhoneInput from './PhoneInput.vue';
  import DatePicker from './DatePicker.vue';
  import FileInput from './FileInput.vue';
  import type { FormField, FormFieldRow } from '@/types/form.types';

  type SchemaValues<T extends ZodType> = z.infer<T>;

  const GRID_COLS_CLASS: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-4',
  };

  interface Props {
    /** Legacy v-model — ignored when `formModel` is provided. */
    modelValue?: Record<string, unknown>;
    /** Optional FormModel instance from `@/lib/FormModel`. */
    formModel?: FormModel<Record<string, unknown>>;
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
    'update:modelValue': [value: Record<string, unknown>];
    submit: [values: SchemaValues<TSchema>];
  }>();

  const errors = ref<Record<string, string>>({});
  const isSubmitting = ref(false);

  if (!props.formModel) {
    useFormValidation(props.modelValue, props.schema, errors);
  }

  const displayErrors = computed<Record<string, string>>(() => {
    if (props.formModel) {
      return props.formModel.errors.value as Record<string, string>;
    }
    return errors.value;
  });

  const submitting = computed(() =>
    props.formModel ? props.formModel.isSubmitting.value : isSubmitting.value,
  );

  const getFieldValue = (key: string): unknown => {
    if (props.formModel) {
      return props.formModel.fields[key as keyof typeof props.formModel.fields];
    }
    return props.modelValue[key];
  };

  const setFieldValue = (key: string, value: unknown) => {
    if (props.formModel) {
      (props.formModel.fields as Record<string, unknown>)[key] = value;
      return;
    }
    emit('update:modelValue', { ...props.modelValue, [key]: value });
  };

  const getDefaultRowClass = (row: FormField[]) => {
    const fieldCount = row.length;
    return GRID_COLS_CLASS[fieldCount] ?? GRID_COLS_CLASS[4];
  };

  const validate = (): boolean => {
    if (props.formModel) {
      return props.formModel.validate();
    }

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
    if (props.formModel) {
      props.formModel.errors.value = {};
      return;
    }
    errors.value = {};
  };

  const handleSubmit = async () => {
    if (props.formModel) {
      await props.formModel.submit(async (values) => {
        emit('submit', values as SchemaValues<TSchema>);
      });
      return;
    }

    if (!validate()) return;
    isSubmitting.value = true;
    emit('submit', props.modelValue as SchemaValues<TSchema>);
    isSubmitting.value = false;
  };

  const setSubmitting = (value: boolean) => {
    if (props.formModel) {
      props.formModel.isSubmitting.value = value;
      return;
    }
    isSubmitting.value = value;
  };

  defineExpose({
    submit: handleSubmit,
    validate,
    clearErrors,
    setSubmitting,
  });
</script>

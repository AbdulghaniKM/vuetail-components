<template>
  <form ref="formRef" @submit.prevent="handleSubmit" class="flex min-h-0 flex-col" :class="containerClass" novalidate>
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
          :data-field="field.key"
          :class="field.customClass"
        >
          <InputField
            v-if="field.type === 'text' || field.type === 'password' || field.type === 'email' || field.type === 'number' || field.type === 'datetime-local'"
            :model-value="getTextValue(field.key)"
            :label="field.label"
            :type="field.type"
            :placeholder="field.placeholder"
            :readonly="field.readonly"
            :error="displayErrors[field.key]"
            @update:model-value="setFieldValue(field.key, $event)"
          />

          <Textarea
            v-else-if="field.type === 'textarea'"
            :model-value="getTextValue(field.key)"
            :label="field.label"
            :placeholder="field.placeholder"
            :readonly="field.readonly"
            :rows="field.rows"
            :error="displayErrors[field.key]"
            @update:model-value="setFieldValue(field.key, $event)"
          />

          <Select
            v-else-if="field.type === 'select'"
            :model-value="getTextValue(field.key)"
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
            :model-value="getTextValue(field.key)"
            :label="field.label"
            :placeholder="field.placeholder"
            :readonly="field.readonly"
            :error="displayErrors[field.key]"
            @update:model-value="setFieldValue(field.key, $event)"
          />

          <DatePicker
            v-else-if="field.type === 'date' || field.type === 'datetime'"
            :model-value="getTextValue(field.key)"
            :label="field.label"
            :mode="field.type === 'datetime' ? 'datetime' : 'date'"
            :placeholder="field.placeholder"
            :readonly="field.readonly"
            :error="displayErrors[field.key]"
            :min="field.min"
            :max="field.max"
            @update:model-value="setFieldValue(field.key, $event)"
          />

          <AppRadioGroup
            v-else-if="field.type === 'radio'"
            :model-value="getTextValue(field.key)"
            :label="field.label"
            :items="radioItems(field)"
            :orientation="field.orientation"
            :disabled="field.readonly"
            :error="displayErrors[field.key]"
            @update:model-value="setFieldValue(field.key, $event)"
          />

          <AppSlider
            v-else-if="field.type === 'slider'"
            :model-value="getFieldValue(field.key) as number | [number, number]"
            :label="field.label"
            :min="field.min !== undefined ? Number(field.min) : undefined"
            :max="field.max !== undefined ? Number(field.max) : undefined"
            :step="field.step"
            :disabled="field.readonly"
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
          class="rounded-lg bg-accent px-6 py-2.5 font-semibold text-accent-fg transition-[background-color,opacity] duration-(--vt-duration) ease-standard hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ submitting ? 'Submitting...' : 'Submit' }}
        </button>
      </slot>
    </div>
  </form>
</template>

<script setup lang="ts" generic="TValues extends Record<string, unknown> = Record<string, unknown>">
  import { computed, nextTick, ref, watch } from 'vue';
  import { z, type ZodType } from 'zod';
  import { FormModel } from '@/lib/FormModel';
  import { useFormValidation } from '@/composables/useFormValidation';
  import InputField from './InputField.vue';
  import Textarea from './Textarea.vue';
  import Select from './Select.vue';
  import PhoneInput from './PhoneInput.vue';
  import DatePicker from './DatePicker.vue';
  import FileInput from './FileInput.vue';
  import AppRadioGroup, { type RadioItem } from '../AppRadioGroup.vue';
  import AppSlider from '../AppSlider.vue';
  import type { FormField, FormFieldRow } from '@/types/form.types';

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
    formModel?: FormModel<TValues>;
    fields: FormFieldRow[];
    schema?: ZodType;
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
    /** The FormModel's values (typed from it), or the v-model object. */
    submit: [values: TValues];
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

  // The text-like fields take a string (InputField and Select also a number). What a key holds is
  // the schema's business, so this cast is type-only.
  const getTextValue = (key: string) => getFieldValue(key) as string;

  const setFieldValue = (key: string, value: unknown) => {
    if (props.formModel) {
      (props.formModel.fields as Record<string, unknown>)[key] = value;
      return;
    }
    emit('update:modelValue', { ...props.modelValue, [key]: value });
  };

  // `items` may be plain strings, as for Select; a radio needs a label and a value for each.
  const radioItems = (field: FormField): RadioItem[] =>
    (field.items ?? []).map((item) => (typeof item === 'string' ? { label: item, value: item } : item));

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

  const formRef = ref<HTMLFormElement | null>(null);

  // After a failed submit, focus goes to the first field with an error, so a keyboard or screen
  // reader user lands on what to fix instead of hunting for red text.
  const focusFirstError = async () => {
    await nextTick();
    const path = props.formModel ? props.formModel.firstErrorPath.value : Object.keys(errors.value).find((k) => errors.value[k]);
    if (!path || !formRef.value) return;
    const top = path.split('.')[0];
    const host =
      formRef.value.querySelector<HTMLElement>(`[data-field="${CSS.escape(path)}"]`) ??
      formRef.value.querySelector<HTMLElement>(`[data-field="${CSS.escape(top)}"]`);
    host?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, select, button')?.focus();
  };

  // With a FormModel, errors clear as the user fixes them, as the v-model path does through
  // useFormValidation. New errors still only appear on submit.
  if (props.formModel) {
    watch(
      () => props.formModel!.fields,
      () => props.formModel!.clearResolved(),
      { deep: true },
    );
  }

  const handleSubmit = async () => {
    if (props.formModel) {
      await props.formModel.submit(async (values) => {
        emit('submit', values);
      });
      if (props.formModel.firstErrorPath.value) await focusFirstError();
      return;
    }

    if (!validate()) {
      await focusFirstError();
      return;
    }
    isSubmitting.value = true;
    emit('submit', props.modelValue as TValues);
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

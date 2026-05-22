<template>
  <AppModal
    :is-open="isOpen"
    :title="title"
    :description="description"
    :loading="loading || submitting"
    max-width="md"
    @close="handleClose"
  >
    <AppForm
      v-if="formModel"
      ref="formRef"
      :form-model="formModel"
      :fields="fields"
      @submit="handleSubmit"
    >
      <template #actions="{ submitting: formSubmitting }">
        <div class="flex w-full gap-3">
          <AppButton
            variant="outline"
            label="Cancel"
            class="flex-1"
            :disabled="formSubmitting"
            @click="handleClose"
          />
          <AppButton
            type="submit"
            :label="submitLabel"
            class="flex-1"
            :loading="formSubmitting"
          />
        </div>
      </template>
    </AppForm>

    <AppForm
      v-else
      ref="formRef"
      v-model="formData"
      :fields="fields"
      :schema="schema"
      @submit="handleSubmit"
    >
      <template #actions="{ submitting: formSubmitting }">
        <div class="flex w-full gap-3">
          <AppButton
            variant="outline"
            label="Cancel"
            class="flex-1"
            :disabled="formSubmitting"
            @click="handleClose"
          />
          <AppButton
            type="submit"
            :label="submitLabel"
            class="flex-1"
            :loading="formSubmitting"
          />
        </div>
      </template>
    </AppForm>
  </AppModal>
</template>

<script setup lang="ts" generic="TSchema extends ZodType = ZodType">
  import { computed, ref, watch } from 'vue';
  import type { ZodType } from 'zod';
  import api from '@/plugins/axios';
  import { FormModel } from '@/lib/FormModel';
  import AppModal from './AppModal.vue';
  import AppButton from './AppButton.vue';
  import AppForm from './Fields/AppForm.vue';
  import { useToast } from '@/composables/useToast';
  import type { FormFieldRow } from '@/types/form.types';

  interface Props {
    isOpen: boolean;
    apiPath: string;
    method?: 'post' | 'put' | 'patch';
    title: string;
    description?: string;
    fields: FormFieldRow[];
    schema?: TSchema;
    initialData?: Record<string, unknown>;
    successMessage?: string;
    submitLabel?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    method: 'post',
    initialData: () => ({}),
    successMessage: 'Success! The record has been saved.',
    submitLabel: 'Save Changes',
  });

  const emit = defineEmits<{
    close: [];
    success: [data: unknown];
  }>();

  const { success, error: toastError } = useToast();
  const formData = ref<Record<string, unknown>>({ ...props.initialData });
  const formModel = ref<FormModel<Record<string, unknown>> | null>(null);
  const loading = ref(false);
  const formRef = ref<InstanceType<typeof AppForm> | null>(null);

  const submitting = computed(
    () => loading.value || (formModel.value?.isSubmitting.value ?? false),
  );

  const initForm = () => {
    if (props.schema) {
      formModel.value = new FormModel({ ...props.initialData }, props.schema);
    } else {
      formModel.value = null;
      formData.value = { ...props.initialData };
    }
    formRef.value?.clearErrors();
  };

  watch(
    () => props.isOpen,
    (open) => {
      if (open) initForm();
    },
  );

  watch(
    () => props.initialData,
    () => {
      if (props.isOpen) initForm();
    },
    { deep: true },
  );

  const handleClose = () => {
    if (loading.value || submitting.value) return;
    emit('close');
  };

  const handleSubmit = async (values: unknown) => {
    loading.value = true;
    formRef.value?.setSubmitting(true);

    try {
      const response = await api[props.method](props.apiPath, values);
      success(props.successMessage);
      emit('success', response.data);
      emit('close');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Something went wrong. Please try again.';
      toastError(message);
    } finally {
      loading.value = false;
      formRef.value?.setSubmitting(false);
    }
  };
</script>

<template>
  <AppModal
    :is-open="isOpen"
    :title="title"
    :description="description"
    :loading="loading"
    max-width="md"
    @close="handleClose"
  >
    <AppForm
      ref="formRef"
      v-model="formData"
      :fields="fields"
      :schema="schema"
      @submit="handleSubmit"
    >
      <template #actions="{ submitting }">
        <div class="flex w-full gap-3">
          <AppButton
            variant="outline"
            label="Cancel"
            class="flex-1"
            :disabled="submitting"
            @click="handleClose"
          />
          <AppButton
            type="submit"
            :label="submitLabel"
            class="flex-1"
            :loading="submitting"
          />
        </div>
      </template>
    </AppForm>
  </AppModal>
</template>

<script setup lang="ts" generic="TSchema extends ZodType = ZodType">
import { ref, watch } from 'vue';
import type { ZodType } from 'zod';
import api from '@/plugins/axios';
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
  initialData?: Record<string, any>;
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
  success: [data: any];
}>();

const { toast } = useToast();
const formData = ref<Record<string, any>>({ ...props.initialData });
const loading = ref(false);
const formRef = ref<InstanceType<typeof AppForm> | null>(null);

// Sync formData when initialData changes or modal opens
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      formData.value = { ...props.initialData };
      formRef.value?.clearErrors();
    }
  }
);

const handleClose = () => {
  if (loading.value) return;
  emit('close');
};

const handleSubmit = async (values: any) => {
  loading.value = true;
  formRef.value?.setSubmitting(true);
  
  try {
    const response = await api[props.method](props.apiPath, values);
    toast.success(props.successMessage);
    emit('success', response.data);
    emit('close');
  } catch (error: any) {
    const message = error.response?.data?.message || 'Something went wrong. Please try again.';
    toast.error(message);
    
    // If there are validation errors from the server, we could potentially map them back to the form
    // but for now, we just show the toast.
  } finally {
    loading.value = false;
    formRef.value?.setSubmitting(false);
  }
};
</script>

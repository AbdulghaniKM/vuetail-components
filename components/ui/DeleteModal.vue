<template>
  <ConfirmDangerModal
    :is-open="isOpen"
    :title="title"
    :message="message"
    :loading="loading"
    @close="emit('close')"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import api from '@/plugins/axios';
import ConfirmDangerModal from './ConfirmDangerModal.vue';
import { useToast } from '@/composables/useToast';

interface Props {
  isOpen: boolean;
  apiPath: string;
  title?: string;
  message?: string;
  successMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm Deletion',
  message: 'Are you sure you want to delete this? This action cannot be undone.',
  successMessage: 'Success! The record has been deleted.',
});

const emit = defineEmits<{
  close: [];
  success: [];
}>();

const { toast } = useToast();
const loading = ref(false);

const handleDelete = async () => {
  loading.value = true;
  try {
    await api.delete(props.apiPath);
    toast.success(props.successMessage);
    emit('success');
    emit('close');
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'Failed to delete. Please try again.';
    toast.error(errorMessage);
  } finally {
    loading.value = false;
  }
};
</script>

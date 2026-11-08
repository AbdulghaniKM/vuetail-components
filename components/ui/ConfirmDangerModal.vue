<template>
 <AppModal
 :is-open="isOpen"
 :title="title"
 :description="message"
 :icon="variant === 'danger' ? 'icon-[heroicons--exclamation-triangle]' : 'icon-[heroicons-outline--question-mark-circle]'"
 :icon-variant="variant"
 max-width="sm"
 hide-close
 @close="emit('close')"
 @confirm="emit('confirm')"
 >
 <!-- Optional extra content; the description in the header is usually enough. -->
 <slot />
 <template #footer>
 <div class="flex gap-2.5">
 <AppButton
 variant="outline"
 :label="cancelLabel"
 full-width
 size="md"
 class="flex-1"
 @click="emit('close')"
 />
 <AppButton
 :variant="variant"
 :label="loading ? loadingLabel : confirmLabel"
 :loading="loading"
 :loading-label="loadingLabel"
 :icon="variant === 'danger' ? 'icon-[heroicons-outline--trash]' : undefined"
 full-width
 size="md"
 class="flex-1"
 @click="emit('confirm')"
 />
 </div>
 </template>
 </AppModal>
</template>

<script setup lang="ts">
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'

withDefaults(
 defineProps<{
 isOpen: boolean
 title?: string
 message?: string
 confirmLabel?: string
 cancelLabel?: string
 loading?: boolean
 loadingLabel?: string
 /** `danger` for destructive actions; `primary` for an ordinary yes or no. */
 variant?: 'danger' | 'primary'
 }>(),
 {
 title: 'Confirm',
 message: 'Are you sure? This action cannot be undone.',
 confirmLabel: 'Yes, confirm',
 cancelLabel: 'Cancel',
 loading: false,
 loadingLabel: 'Processing...',
 variant: 'danger',
 }
)

const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
 <AppModal
 :is-open="isOpen"
 :title="title"
 :description="message"
 :icon="variant === 'danger' ? 'icon-[heroicons--exclamation-triangle]' : 'icon-[heroicons--question-mark-circle]'"
 :icon-variant="variant"
 max-width="sm"
 hide-close
 @close="emit('close')"
 @confirm="onModalConfirm"
 >
 <!-- Optional extra content; the description in the header is usually enough. -->
 <slot />
 <!-- Said on screen as well, since nothing on a held button shows it until it is pressed. -->
 <p v-if="hold" class="text-sm text-text-muted" :class="$slots.default && 'mt-3'">{{ holdLine }}</p>
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
 :label="confirmLabel"
 :loading="loading"
 :loading-label="loadingLabel"
 :icon="variant === 'danger' ? 'icon-[heroicons--trash]' : undefined"
 :hold="hold"
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
import { computed } from 'vue'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'

const props = withDefaults(
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
 /**
  * Hold to confirm: the confirm button fires only after it is held this long (ms; `true` is
  * 1500ms), and Enter on the dialog no longer confirms. Off by default.
  */
 hold?: boolean | number
 /** The line under the message that explains the hold. */
 holdText?: string
 }>(),
 {
 title: 'Confirm',
 message: 'Are you sure? This action cannot be undone.',
 confirmLabel: 'Yes, confirm',
 cancelLabel: 'Cancel',
 loading: false,
 loadingLabel: 'Processing...',
 variant: 'danger',
 hold: false,
 holdText: undefined,
 }
)

const emit = defineEmits<{ close: []; confirm: [] }>()

const holdLine = computed(() => props.holdText ?? `Press and hold "${props.confirmLabel}" to confirm.`)

// AppModal confirms on Enter anywhere in the dialog; with a hold, only the held button may.
function onModalConfirm() {
 if (!props.hold) emit('confirm')
}
</script>

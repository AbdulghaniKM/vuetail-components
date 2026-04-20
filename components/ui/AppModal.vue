<template>
 <Teleport to="body">
 <AnimatePresence>
 <motion.div
 v-if="isOpen"
 key="modal-backdrop"
 class="fixed inset-0 z-[9999] flex p-4 sm:p-6"
 :class="verticalAlign === 'center' ? 'items-center' : 'items-start pt-[8vh]'"
 :initial="{ opacity: 0 }"
 :animate="{ opacity: 1 }"
 :exit="{ opacity: 0 }"
 :transition="{ duration: 0.2 }"
 >
 <!-- Backdrop -->
 <motion.div
 class="absolute inset-0 bg-black/40 backdrop-blur-sm"
 :initial="{ opacity: 0 }"
 :animate="{ opacity: 1 }"
 :exit="{ opacity: 0 }"
 @click="handleBackdropClick"
 />

 <!-- Panel -->
 <motion.div
 ref="panelRef"
 key="modal-panel"
 role="dialog"
 aria-modal="true"
 :aria-labelledby="title ? titleId : undefined"
 :aria-describedby="description ? descId : undefined"
 class="relative mx-auto flex w-full flex-col overflow-hidden rounded-xl bg-surface text-text shadow-xl ring-1 ring-border/50"
 :class="[
 maxWidthClass,
 fullscreen ? 'h-full max-h-full !rounded-none !ring-0' : 'max-h-[85vh]',
 ]"
 :initial="{ opacity: 0, scale: 0.96, y: 12 }"
 :animate="{ opacity: 1, scale: 1, y: 0 }"
 :exit="{ opacity: 0, scale: 0.97, y: 6 }"
 :transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }"
 >
 <!-- Loading overlay -->
 <Transition
 enter-active-class="transition-opacity duration-200"
 enter-from-class="opacity-0"
 leave-active-class="transition-opacity duration-150"
 leave-from-class="opacity-100"
 leave-to-class="opacity-0"
 >
 <div
 v-if="loading"
 class="absolute inset-0 z-20 flex items-center justify-center bg-surface/80 backdrop-blur-[1px]"
 >
 <div class="flex flex-col items-center gap-3">
 <AppSpinner size="lg" />
 <span v-if="loadingText" class="text-text-muted text-sm font-medium">{{ loadingText }}</span>
 </div>
 </div>
 </Transition>

 <!-- Header -->
 <div
 v-if="title || icon || $slots.header"
 class="flex shrink-0 items-start justify-between gap-4 px-6 pb-0 pt-6"
 >
 <slot name="header">
 <div class="flex items-start gap-3">
 <div
 v-if="icon"
 class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl"
 :class="iconContainerClass"
 >
 <AppIcon :name="icon" :size="1.25" :class="iconColorClass" />
 </div>
 <div class="min-w-0">
 <h3 :id="titleId" class="text-text text-base font-semibold leading-snug">{{ title }}</h3>
 <p v-if="description" :id="descId" class="text-text-muted mt-1 text-sm leading-relaxed">{{ description }}</p>
 </div>
 </div>
 </slot>
 <button
 v-if="!hideClose"
 type="button"
 class="text-text-muted hover:bg-muted hover:text-text focus-visible:ring-accent/40 -me-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg transition-all focus-visible:ring-2 focus-visible:outline-none"
 @click="handleClose"
 :aria-label="closeLabel"
 >
 <AppIcon name="icon-[heroicons-outline--x-mark]" :size="1.125" />
 </button>
 </div>

 <!-- Body -->
 <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
 <slot />
 </div>

 <!-- Footer -->
 <div
 v-if="$slots.footer"
 class="border-border shrink-0 border-t px-6 py-4"
 >
 <slot name="footer" />
 </div>
 </motion.div>
 </motion.div>
 </AnimatePresence>
 </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted, ref, toRef, useId, nextTick } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import AppIcon from './AppIcon.vue'
import AppSpinner from './AppSpinner.vue'
import { useKeyboard } from '@/composables/useKeyboard'

// Per-instance IDs for aria-labelledby / aria-describedby. Avoids collision
// when two modals render on the same page.
const uid = useId()
const titleId = `modal-title-${uid}`
const descId = `modal-desc-${uid}`

const props = withDefaults(
 defineProps<{
 isOpen: boolean
 title?: string
 description?: string
 icon?: string
 /** Icon color theme ÔÇö controls icon and icon-container tint */
 iconVariant?: 'primary' | 'danger' | 'warning' | 'success' | 'info'
 maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
 closeLabel?: string
 persistent?: boolean
 hideClose?: boolean
 fullscreen?: boolean
 loading?: boolean
 loadingText?: string
 verticalAlign?: 'center' | 'top'
 }>(),
 {
 title: '',
 description: '',
 icon: '',
 iconVariant: 'primary',
 maxWidth: 'md',
 closeLabel: 'Close',
 persistent: false,
 hideClose: false,
 fullscreen: false,
 loading: false,
 loadingText: '',
 verticalAlign: 'center',
 }
)

const emit = defineEmits<{ close: []; confirm: [] }>()
const panelRef = ref<HTMLElement | null>(null)

function handleClose() {
 if (props.loading) return
 emit('close')
}

function handleConfirm() {
 if (props.loading) return
 emit('confirm')
}

function handleBackdropClick() {
 if (!props.persistent) handleClose()
}

// Keyboard shortcuts ÔÇö only active while modal is open
useKeyboard(
 {
 escape: () => {
 if (!props.persistent && !props.loading) handleClose()
 },
 enter: (e: KeyboardEvent) => {
 if (props.loading) return
 const tag = (e.target as HTMLElement)?.tagName
 if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return
 handleConfirm()
 },
 },
 toRef(props, 'isOpen'),
)

// Body scroll lock + focus management
let previouslyFocused: HTMLElement | null = null

const FOCUSABLE_SELECTOR = [
 'a[href]',
 'button:not([disabled])',
 'input:not([disabled]):not([type="hidden"])',
 'select:not([disabled])',
 'textarea:not([disabled])',
 '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(): HTMLElement[] {
 const el = (panelRef.value as any)?.$el || panelRef.value
 if (!el || typeof el.querySelectorAll !== 'function') return []
 return Array.from(el.querySelectorAll(FOCUSABLE_SELECTOR) as NodeListOf<HTMLElement>)
 .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)
}

function handleTrap(e: KeyboardEvent) {
 if (e.key !== 'Tab') return
 const focusables = getFocusable()
 if (focusables.length === 0) {
 e.preventDefault()
 return
 }
 const first = focusables[0]
 const last = focusables[focusables.length - 1]
 const active = document.activeElement as HTMLElement | null
 if (e.shiftKey && active === first) {
 e.preventDefault()
 last.focus()
 } else if (!e.shiftKey && active === last) {
 e.preventDefault()
 first.focus()
 }
}

watch(
 () => props.isOpen,
 (open) => {
 document.body.style.overflow = open ? 'hidden' : ''
 if (open) {
 previouslyFocused = (document.activeElement as HTMLElement) ?? null
 document.addEventListener('keydown', handleTrap)
 nextTick(() => {
 const focusables = getFocusable()
 const el = (panelRef.value as any)?.$el || panelRef.value
 // Prefer first focusable inside the panel; fall back to the panel itself.
 ;(focusables[0] ?? el)?.focus()
 })
 } else {
 document.removeEventListener('keydown', handleTrap)
 previouslyFocused?.focus?.()
 previouslyFocused = null
 }
 },
 { immediate: true },
)

onUnmounted(() => {
 document.body.style.overflow = ''
 document.removeEventListener('keydown', handleTrap)
})

const maxWidthClass = computed(() => {
 if (props.fullscreen) return 'max-w-none'
 const map: Record<string, string> = {
 xs: 'max-w-xs', sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg',
 xl: 'max-w-xl', '2xl': 'max-w-2xl', full: 'max-w-full',
 }
 return map[props.maxWidth] || map.md
})

const iconContainerClass = computed(() => {
 const map: Record<string, string> = {
 primary: 'bg-accent/10',
 danger: 'bg-error/10',
 warning: 'bg-warning/10',
 success: 'bg-success/10',
 info: 'bg-info/10',
 }
 return map[props.iconVariant] || map.primary
})

const iconColorClass = computed(() => {
 const map: Record<string, string> = {
 primary: 'text-accent',
 danger: 'text-error',
 warning: 'text-warning',
 success: 'text-success',
 info: 'text-info',
 }
 return map[props.iconVariant] || map.primary
})
</script>

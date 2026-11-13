<template>
 <div class="flex items-center justify-center gap-1.5">
 <!-- Hour column -->
 <div class="flex flex-col items-center">
 <button
 type="button"
 class="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors duration-(--vt-duration) ease-standard hover:bg-accent/10 hover:text-accent"
 aria-label="Increase hour"
 @click="adjustHour(1)"
 >
 <AppIcon name="icon-[heroicons--chevron-up]" :size="1" />
 </button>
 <input
 ref="hourInputRef"
 :value="displayHour"
 type="text"
 inputmode="numeric"
 maxlength="2"
 aria-label="Hour"
 class="w-11 rounded-md border border-border-strong bg-surface py-2 text-center text-sm font-bold text-text tabular-nums transition-colors duration-(--vt-duration) ease-standard focus-visible:-outline-offset-1"
 @focus="onInputFocus"
 @blur="commitHours"
 @keydown.enter="($event.target as HTMLInputElement).blur()"
 @keydown.up.prevent="adjustHour(1)"
 @keydown.down.prevent="adjustHour(-1)"
 />
 <button
 type="button"
 class="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors duration-(--vt-duration) ease-standard hover:bg-accent/10 hover:text-accent"
 aria-label="Decrease hour"
 @click="adjustHour(-1)"
 >
 <AppIcon name="icon-[heroicons--chevron-down]" :size="1" />
 </button>
 </div>

 <span class="mb-1 self-center text-xl font-bold text-text-muted select-none">:</span>

 <!-- Minute column -->
 <div class="flex flex-col items-center">
 <button
 type="button"
 class="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors duration-(--vt-duration) ease-standard hover:bg-accent/10 hover:text-accent"
 aria-label="Increase minute"
 @click="adjustMinute(1)"
 >
 <AppIcon name="icon-[heroicons--chevron-up]" :size="1" />
 </button>
 <input
 ref="minuteInputRef"
 :value="displayMinute"
 type="text"
 inputmode="numeric"
 maxlength="2"
 aria-label="Minute"
 class="w-11 rounded-md border border-border-strong bg-surface py-2 text-center text-sm font-bold text-text tabular-nums transition-colors duration-(--vt-duration) ease-standard focus-visible:-outline-offset-1"
 @focus="onInputFocus"
 @blur="commitMinutes"
 @keydown.enter="($event.target as HTMLInputElement).blur()"
 @keydown.up.prevent="adjustMinute(1)"
 @keydown.down.prevent="adjustMinute(-1)"
 />
 <button
 type="button"
 class="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors duration-(--vt-duration) ease-standard hover:bg-accent/10 hover:text-accent"
 aria-label="Decrease minute"
 @click="adjustMinute(-1)"
 >
 <AppIcon name="icon-[heroicons--chevron-down]" :size="1" />
 </button>
 </div>

 <!-- AM/PM -->
 <!-- AM / PM as one track: the accent pill is an AppBlob that stretches from one to the other. -->
 <div ref="periodTrack" class="relative ms-3 flex flex-col gap-1 rounded-xl bg-muted p-1">
 <AppBlob class="absolute top-0 left-0" v-bind="periodCanvas" :shapes="periodShapes" fill="var(--color-accent)" :blur="periodBlob.blur.value" />
 <button
 type="button"
 data-indicator="am"
 :aria-pressed="!isPM"
 class="relative rounded-lg px-3 py-1.5 text-xs font-bold tracking-tight transition-colors duration-(--vt-duration) ease-standard"
 :class="!isPM ? 'text-accent-fg' : 'text-text-muted hover:text-text'"
 @click="setPeriod(false)"
 >
 AM
 </button>
 <button
 type="button"
 data-indicator="pm"
 :aria-pressed="isPM"
 class="relative rounded-lg px-3 py-1.5 text-xs font-bold tracking-tight transition-colors duration-(--vt-duration) ease-standard"
 :class="isPM ? 'text-accent-fg' : 'text-text-muted hover:text-text'"
 @click="setPeriod(true)"
 >
 PM
 </button>
 </div>
 </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '../AppIcon.vue'
import AppBlob from '../AppBlob.vue'
import { useBlob } from '@/composables/useBlob'
import { useIndicator } from '@/composables/useIndicator'

interface Props {
 hours?: number
 minutes?: number
 modelValue?: string // Format"HH:mm"
}

const props = withDefaults(defineProps<Props>(), {
 hours: 0,
 minutes: 0,
})

const emit = defineEmits<{
 'update:hours': [value: number]
 'update:minutes': [value: number]
 'update:modelValue': [value: string]
}>()

const hourInputRef = ref<HTMLInputElement | null>(null)
const minuteInputRef = ref<HTMLInputElement | null>(null)

// ─── Internal State ───
// Using internal refs to ensure immediate updates during calculations
const internalH = ref(props.hours)
const internalM = ref(props.minutes)

// Sync from props (external changes)
watch(() => [props.hours, props.minutes], ([h, m]) => {
 internalH.value = h
 internalM.value = m
}, { immediate: true })

// Sync from modelValue if provided
watch(() => props.modelValue, (val) => {
 if (val && val.includes(':')) {
 const [h, m] = val.split(':').map(Number)
 if (!isNaN(h)) internalH.value = h
 if (!isNaN(m)) internalM.value = m
 }
})

// ─── Computed ──────────────────────────────────────────────────────────────

const isPM = computed(() => internalH.value >= 12)

const displayHour = computed(() => {
 const h = internalH.value
 if (h === 0) return '12'
 if (h > 12) return String(h - 12)
 return String(h)
})

const displayMinute = computed(() => String(internalM.value).padStart(2, '0'))

// ─── Methods ────────────────────────────────────────────────────────────────

function notify() {
 emit('update:hours', internalH.value)
 emit('update:minutes', internalM.value)
 
 const h = String(internalH.value).padStart(2, '0')
 const m = String(internalM.value).padStart(2, '0')
 emit('update:modelValue', `${h}:${m}`)
}

function adjustHour(delta: number) {
 let next = internalH.value + delta
 if (next >= 24) next = 0
 if (next < 0) next = 23
 internalH.value = next
 notify()
}

function adjustMinute(delta: number) {
 let nextM = internalM.value + delta

 if (nextM >= 60) {
 internalM.value = 0
 adjustHour(1)
 } else if (nextM < 0) {
 internalM.value = 59
 adjustHour(-1)
 } else {
 internalM.value = nextM
 notify()
 }
}

function setPeriod(pm: boolean) {
 const h = internalH.value
 const currentlyPM = h >= 12
 if (pm === currentlyPM) return

 internalH.value = pm ? h + 12 : h - 12
 notify()
}

function onInputFocus(e: FocusEvent) {
 ;(e.target as HTMLInputElement).select()
}

function commitHours(e: FocusEvent) {
 const target = e.target as HTMLInputElement
 let val = parseInt(target.value, 10)
 if (isNaN(val)) {
 target.value = displayHour.value
 return
 }

 val = Math.max(1, Math.min(12, val))
 const pm = isPM.value
 let nextH24 = val
 if (val === 12) nextH24 = pm ? 12 : 0
 else if (pm) nextH24 = val + 12

 internalH.value = nextH24
 notify()
}

function commitMinutes(e: FocusEvent) {
 const target = e.target as HTMLInputElement
 let val = parseInt(target.value, 10)
 if (isNaN(val)) {
 target.value = displayMinute.value
 return
 }

 internalM.value = Math.max(0, Math.min(59, val))
 notify()
}

// The AM / PM pill.
const periodTrack = ref<HTMLElement | null>(null)
const periodBlob = useBlob({ radius: '--radius-lg' })
const { canvas: periodCanvas, shapes: periodShapes } = useIndicator(
 periodTrack,
 computed(() => (isPM.value ? 'pm' : 'am')),
 { blob: periodBlob },
)
</script>

<template>
 <div class="flex items-center justify-center gap-1.5">
 <!-- Hour column -->
 <div class="flex flex-col items-center">
 <button
 type="button"
 class="flex size-8 items-center justify-center rounded-lg text-text-muted transition-all hover:bg-accent/10 hover:text-accent"
 aria-label="Increase hour"
 @click="adjustHour(1)"
 >
 <AppIcon name="icon-[heroicons-outline--chevron-up]" :size="1" />
 </button>
 <input
 ref="hourInputRef"
 :value="displayHour"
 type="text"
 inputmode="numeric"
 maxlength="2"
 aria-label="Hour"
 class="w-11 rounded-xl border border-border bg-surface py-2 text-center text-sm font-bold text-text tabular-nums shadow-sm transition-all focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
 @focus="onInputFocus"
 @blur="commitHours"
 @keydown.enter="($event.target as HTMLInputElement).blur()"
 @keydown.up.prevent="adjustHour(1)"
 @keydown.down.prevent="adjustHour(-1)"
 />
 <button
 type="button"
 class="flex size-8 items-center justify-center rounded-lg text-text-muted transition-all hover:bg-accent/10 hover:text-accent"
 aria-label="Decrease hour"
 @click="adjustHour(-1)"
 >
 <AppIcon name="icon-[heroicons-outline--chevron-down]" :size="1" />
 </button>
 </div>

 <span class="mb-1 self-center text-xl font-bold text-text-muted/20 select-none">:</span>

 <!-- Minute column -->
 <div class="flex flex-col items-center">
 <button
 type="button"
 class="flex size-8 items-center justify-center rounded-lg text-text-muted transition-all hover:bg-accent/10 hover:text-accent"
 aria-label="Increase minute"
 @click="adjustMinute(1)"
 >
 <AppIcon name="icon-[heroicons-outline--chevron-up]" :size="1" />
 </button>
 <input
 ref="minuteInputRef"
 :value="displayMinute"
 type="text"
 inputmode="numeric"
 maxlength="2"
 aria-label="Minute"
 class="w-11 rounded-xl border border-border bg-surface py-2 text-center text-sm font-bold text-text tabular-nums shadow-sm transition-all focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
 @focus="onInputFocus"
 @blur="commitMinutes"
 @keydown.enter="($event.target as HTMLInputElement).blur()"
 @keydown.up.prevent="adjustMinute(1)"
 @keydown.down.prevent="adjustMinute(-1)"
 />
 <button
 type="button"
 class="flex size-8 items-center justify-center rounded-lg text-text-muted transition-all hover:bg-accent/10 hover:text-accent"
 aria-label="Decrease minute"
 @click="adjustMinute(-1)"
 >
 <AppIcon name="icon-[heroicons-outline--chevron-down]" :size="1" />
 </button>
 </div>

 <!-- AM/PM -->
 <div class="ms-3 flex flex-col gap-1.5">
 <button
 type="button"
 class="rounded-xl px-3 py-1.5 text-xs font-bold tracking-tight transition-all"
 :class="!isPM ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-muted text-text-muted hover:bg-muted/80 hover:text-text'"
 @click="setPeriod(false)"
 >
 AM
 </button>
 <button
 type="button"
 class="rounded-xl px-3 py-1.5 text-xs font-bold tracking-tight transition-all"
 :class="isPM ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-muted text-text-muted hover:bg-muted/80 hover:text-text'"
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
</script>




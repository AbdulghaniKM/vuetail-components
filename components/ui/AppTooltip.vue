<template>
 <div
 class="group relative inline-flex"
 :aria-describedby="content && show ? tipId : undefined"
 @mouseenter="onEnter"
 @mouseleave="onLeave"
 @focusin="onEnter"
 @focusout="onLeave"
 >
 <slot />
 <!-- Warm (a neighbour was open a moment ago): the tip is already "out", so it only fades. -->
 <Transition
 enter-active-class="transition duration-(--vt-duration-enter) ease-standard"
 :enter-from-class="warmEntry ? 'opacity-0' : 'opacity-0 scale-95 motion-reduce:scale-100'"
 enter-to-class="opacity-100 scale-100"
 leave-active-class="transition duration-(--vt-duration-exit) ease-exit"
 leave-from-class="opacity-100 scale-100"
 leave-to-class="opacity-0 scale-95 motion-reduce:scale-100"
 >
 <span
 v-if="content && show"
 :id="tipId"
 role="tooltip"
 class="pointer-events-none absolute z-[9990] max-w-xs whitespace-normal rounded-md px-2.5 py-1.5 text-xs font-medium leading-snug shadow-lg"
 :class="[themeClass, placementClass]"
 >
 {{ content }}
 <!-- Arrow -->
 <span class="absolute size-2 rotate-45" :class="[arrowClass, arrowPositionClass]" />
 </span>
 </Transition>
 </div>
</template>

<script lang="ts">
/*
 * The tooltip group, shared by every AppTooltip on the page (module scope, not per instance).
 * While one tooltip is open, and for `skipDelay` ms after the last one closes, the group is
 * "warm": the next tooltip opens at once instead of waiting out its delay, so a pointer
 * sweeping along a toolbar reads each label without a pause. Radix calls this window
 * skipDelayDuration (300ms); interior.dev's TooltipGroup does the same per group.
 */
let openCount = 0
let warmUntil = 0

const isWarm = () => openCount > 0 || Date.now() < warmUntil
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'

interface Props {
 content?: string
 placement?: 'top' | 'bottom' | 'start' | 'end'
 dark?: boolean
 /** Ms the pointer or focus rests before a cold tooltip opens. */
 delay?: number
 /** Ms after this tooltip closes in which any other opens without its delay. 0 opts out. */
 skipDelay?: number
 disableOnMobile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
 content: '',
 placement: 'top',
 dark: true,
 delay: 200,
 skipDelay: 300,
 disableOnMobile: false,
})

const { isMobile } = useBreakpoint()
const show = ref(false)
const warmEntry = ref(false)
const tipId = useId()
let timeoutId: ReturnType<typeof setTimeout> | null = null

function onEnter() {
 if (props.disableOnMobile && isMobile.value) return
 if (show.value || timeoutId) return
 if (isWarm() || props.delay <= 0) {
 warmEntry.value = isWarm()
 show.value = true
 return
 }
 warmEntry.value = false
 timeoutId = setTimeout(() => {
 timeoutId = null
 show.value = true
 }, props.delay)
}

function onLeave() {
 if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
 show.value = false
}

// The group counts open tooltips, and a close starts the warm window.
watch(show, (open) => {
 if (open) {
 openCount++
 return
 }
 openCount = Math.max(0, openCount - 1)
 if (props.skipDelay > 0) warmUntil = Math.max(warmUntil, Date.now() + props.skipDelay)
})

onBeforeUnmount(() => {
 if (timeoutId) clearTimeout(timeoutId)
 if (show.value) openCount = Math.max(0, openCount - 1)
})

const themeClass = computed(() =>
 props.dark
 ? 'bg-text text-bg'
 : 'bg-surface-raised text-text border border-border'
)

const arrowClass = computed(() =>
 props.dark
 ? 'bg-text'
 : 'bg-surface-raised border border-border'
)

const placementClass = computed(() => ({
 top: 'bottom-full left-1/2 -translate-x-1/2 mb-2 origin-bottom',
 bottom: 'top-full left-1/2 -translate-x-1/2 mt-2 origin-top',
 start: 'end-full top-1/2 -translate-y-1/2 me-2 origin-right rtl:origin-left',
 end: 'start-full top-1/2 -translate-y-1/2 ms-2 origin-left rtl:origin-right',
})[props.placement])

const arrowPositionClass = computed(() => ({
 top: 'bottom-[-0.25rem] left-1/2 -translate-x-1/2 border-t-0 border-s-0',
 bottom: 'top-[-0.25rem] left-1/2 -translate-x-1/2 border-b-0 border-e-0',
 start: 'end-[-0.25rem] top-1/2 -translate-y-1/2 border-b-0 border-s-0',
 end: 'start-[-0.25rem] top-1/2 -translate-y-1/2 border-t-0 border-e-0',
})[props.placement])
</script>

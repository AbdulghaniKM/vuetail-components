<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-(--vt-duration-enter) ease-standard"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-(--vt-duration-exit) ease-exit"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-[9999] bg-overlay" aria-hidden="true" @click="onBackdrop" />
    </Transition>

    <!-- Slides on transform from its own edge; under reduced motion it fades in place instead. -->
    <Transition v-bind="reduced ? FADE : SLIDE">
      <div
        v-if="open"
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        :aria-label="title ? undefined : label"
        :aria-describedby="description ? descId : undefined"
        :data-side="side"
        class="vt-drawer fixed z-[9999] flex flex-col border-border bg-surface-raised text-text shadow-xl"
        :class="[SIDE[side], sizeClass, size === 'full' ? '' : ROUND[side]]"
        v-bind="$attrs"
      >
        <div
          v-if="title || $slots.header || !hideClose"
          class="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-4"
        >
          <slot name="header" :close="close">
            <div class="min-w-0 pt-1.5">
              <h2 v-if="title" :id="titleId" class="text-lg font-semibold text-balance text-text">{{ title }}</h2>
              <p v-if="description" :id="descId" class="mt-1 text-sm text-text-muted">{{ description }}</p>
            </div>
          </slot>
          <!-- 44px hit area around a control-sized button (bible §2). -->
          <button
            v-if="!hideClose"
            type="button"
            class="relative -me-2 inline-flex size-control-md shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-(--vt-duration) ease-standard after:absolute after:-inset-0.5 hover:bg-muted hover:text-text"
            :aria-label="closeLabel"
            @click="close"
          >
            <AppIcon name="icon-[heroicons--x-mark]" :size="1.125" aria-hidden="true" />
          </button>
        </div>

        <!-- A body that overflows becomes a named Tab stop, so keyboard users can scroll it (bible §11). -->
        <div
          ref="bodyRef"
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3"
          :tabindex="scrollable ? 0 : undefined"
          :role="scrollable ? 'group' : undefined"
          :aria-labelledby="scrollable && title ? titleId : undefined"
          :aria-label="scrollable && !title ? label : undefined"
        >
          <div ref="contentRef">
            <slot :close="close" />
          </div>
        </div>

        <div v-if="$slots.footer" class="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border px-5 py-4">
          <slot name="footer" :close="close" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import { useOverlay } from '@/composables/useOverlay';
import { useReducedMotion } from '@/composables/useReducedMotion';

defineOptions({ inheritAttrs: false });

export type DrawerSide = 'start' | 'end' | 'top' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'full';

const props = withDefaults(
  defineProps<{
    /** The edge it slides from. `start` and `end` follow the text direction, so RTL flips them. */
    side?: DrawerSide;
    /** Width for `start` / `end`, largest height for `top` / `bottom`. `full` covers the screen. */
    size?: DrawerSize;
    /** Heading at the top, and the dialog's name. */
    title?: string;
    description?: string;
    /** The dialog's name when there is no `title`. */
    label?: string;
    closeLabel?: string;
    hideClose?: boolean;
    /** Ignore Escape and backdrop clicks; only the close button or your code closes it. */
    persistent?: boolean;
  }>(),
  {
    side: 'end',
    size: 'md',
    title: '',
    description: '',
    label: undefined,
    closeLabel: 'Close',
    hideClose: false,
    persistent: false,
  },
);

/** Open or closed (v-model). */
const open = defineModel<boolean>({ default: false });

const uid = useId();
const titleId = `drawer-title-${uid}`;
const descId = `drawer-desc-${uid}`;

const panelRef = ref<HTMLElement | null>(null);
const bodyRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const reduced = useReducedMotion();

const close = () => {
  open.value = false;
};

const onBackdrop = () => {
  if (!props.persistent) close();
};

// Focus trap and return, scroll lock and Escape come from the shared overlay stack, as in
// AppModal: a menu or a dialog opened from the drawer takes Escape and Tab first.
useOverlay(panelRef, () => open.value, {
  onEscape: () => {
    if (!props.persistent) close();
  },
});

const SIDE: Record<DrawerSide, string> = {
  start: 'vt-drawer-start inset-y-0 start-0 border-e',
  end: 'vt-drawer-end inset-y-0 end-0 border-s',
  top: 'vt-drawer-top inset-x-0 top-0 border-b',
  bottom: 'vt-drawer-bottom inset-x-0 bottom-0 border-t',
};

// Only the edge that faces the page is rounded; the others sit on the screen's edge.
const ROUND: Record<DrawerSide, string> = {
  start: 'rounded-e-2xl',
  end: 'rounded-s-2xl',
  top: 'rounded-b-2xl',
  bottom: 'rounded-t-2xl',
};

// Side sheets leave a strip of the page showing on a phone, so there is always backdrop to tap.
const WIDTH: Record<DrawerSize, string> = {
  sm: 'w-[calc(100%-3rem)] max-w-xs',
  md: 'w-[calc(100%-3rem)] max-w-md',
  lg: 'w-[calc(100%-3rem)] max-w-2xl',
  full: 'w-full',
};
const HEIGHT: Record<DrawerSize, string> = {
  sm: 'max-h-[40dvh]',
  md: 'max-h-[60dvh]',
  lg: 'max-h-[85dvh]',
  full: 'h-dvh',
};

const sizeClass = computed(() =>
  props.side === 'start' || props.side === 'end' ? WIDTH[props.size] : HEIGHT[props.size],
);

// Module-stable transition props: Tailwind classes for the timing, the scoped .vt-drawer-off for
// the off-screen transform of each side.
const SLIDE = {
  enterActiveClass: 'transition-transform duration-(--vt-duration-enter) ease-standard',
  enterFromClass: 'vt-drawer-off',
  leaveActiveClass: 'transition-transform duration-(--vt-duration-exit) ease-exit',
  leaveToClass: 'vt-drawer-off',
};
const FADE = {
  enterActiveClass: 'transition-opacity duration-(--vt-duration-enter) ease-standard',
  enterFromClass: 'opacity-0',
  leaveActiveClass: 'transition-opacity duration-(--vt-duration-exit) ease-exit',
  leaveToClass: 'opacity-0',
};

// The body is a Tab stop only while it can scroll.
const scrollable = ref(false);
const measure = () => {
  const el = bodyRef.value;
  scrollable.value = !!el && el.scrollHeight > el.clientHeight + 1;
};
watch(bodyRef, (el, _old, onCleanup) => {
  if (!el) {
    scrollable.value = false;
    return;
  }
  measure();
  if (typeof ResizeObserver === 'undefined') return;
  const observer = new ResizeObserver(measure);
  observer.observe(el);
  if (contentRef.value) observer.observe(contentRef.value);
  onCleanup(() => observer.disconnect());
});

defineExpose({ close });
</script>

<style scoped>
/* Where each side waits off screen. start and end read the text direction, so RTL flips them. */
.vt-drawer-start { --vt-drawer-from: translateX(-100%); }
.vt-drawer-start:dir(rtl) { --vt-drawer-from: translateX(100%); }
.vt-drawer-end { --vt-drawer-from: translateX(100%); }
.vt-drawer-end:dir(rtl) { --vt-drawer-from: translateX(-100%); }
.vt-drawer-top { --vt-drawer-from: translateY(-100%); }
.vt-drawer-bottom { --vt-drawer-from: translateY(100%); }
.vt-drawer-off { transform: var(--vt-drawer-from); }
</style>

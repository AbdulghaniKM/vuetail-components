<template>
  <div ref="triggerContainerRef" class="inline-block w-fit">
    <!-- Bind `trigger-attrs` on the trigger button: it carries aria-expanded and aria-controls. -->
    <slot name="trigger" :toggle="toggle" :close="close" :is-open="internalOpen" :trigger-attrs="triggerAttrs"></slot>
  </div>

  <Teleport :to="teleportTo">
    <Transition
      enter-active-class="transition duration-(--vt-duration-enter) ease-standard"
      enter-from-class="scale-95 opacity-0 motion-reduce:scale-100"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="transition duration-(--vt-duration-exit) ease-exit"
      leave-from-class="scale-100 opacity-100"
      leave-to-class="scale-95 opacity-0 motion-reduce:scale-100"
    >
      <div
        v-if="internalOpen"
        :id="panelId"
        ref="panelRef"
        class="fixed z-[9999]"
        :class="panelClass"
        :style="dropdownStyle"
        @click="onPanelClick"
        @focusout="onPanelFocusOut"
        @keydown="onPanelKeydown"
      >
        <slot :close="close"></slot>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount, useId } from 'vue';

interface Props {
  open?: boolean;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  offset?: number;
  matchWidth?: boolean;
  disabled?: boolean;
  closeOnContentClick?: boolean;
  panelClass?: string | Record<string, any> | any[];
  teleportTo?: string;
}

const props = withDefaults(defineProps<Props>(), {
  open: undefined,
  placement: 'bottom-start',
  offset: 4,
  matchWidth: false,
  disabled: false,
  closeOnContentClick: true,
  panelClass: '',
  teleportTo: 'body',
});

const emit = defineEmits<{
  'update:open': [value: boolean];
  open: [];
  close: [];
}>();

const internalOpen = ref(props.open ?? false);
const previousFocus = ref<HTMLElement | null>(null);

const triggerContainerRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

const panelId = useId();
const triggerAttrs = computed(() => ({
  'aria-expanded': internalOpen.value,
  'aria-controls': internalOpen.value ? panelId : undefined,
}));

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

const toRem = (px: number) => `${px / 16}rem`;

watch(() => props.open, (val) => {
  if (val !== undefined && val !== internalOpen.value) {
    if (val) doOpen();
    else doClose();
  }
});

function toggle() {
  if (props.disabled) return;
  internalOpen.value ? close() : open();
}

function open() {
  if (props.disabled || internalOpen.value) return;
  doOpen();
  if (props.open !== undefined) emit('update:open', true);
}

function close() {
  dismiss();
}

// `restoreFocus` is false when focus or a click already went somewhere else on purpose.
function dismiss(restoreFocus = true) {
  if (!internalOpen.value) return;
  doClose(restoreFocus);
  if (props.open !== undefined) emit('update:open', false);
}

function doOpen() {
  internalOpen.value = true;
  emit('open');
  nextTick(() => {
    updatePosition();
    previousFocus.value = document.activeElement as HTMLElement | null;
    // The panel is teleported, so Tab from the trigger would never reach it: move focus in.
    panelRef.value?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
  });
}

function doClose(restoreFocus = true) {
  internalOpen.value = false;
  emit('close');
  if (restoreFocus && previousFocus.value) previousFocus.value.focus();
  previousFocus.value = null;
}

function updatePosition() {
  if (!triggerContainerRef.value || !panelRef.value) return;

  const triggerEl = (triggerContainerRef.value.firstElementChild as HTMLElement) || triggerContainerRef.value;
  const rect = triggerEl.getBoundingClientRect();
  const panelHeight = panelRef.value.offsetHeight;

  const isRtl = getComputedStyle(triggerEl).direction === 'rtl';

  let isTop = false;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  const [basePlacement, alignPlacement] = props.placement.split('-');

  if (basePlacement === 'bottom') {
    if (spaceBelow < panelHeight + props.offset && spaceAbove > spaceBelow) {
      isTop = true;
    }
  } else {
    if (spaceAbove < panelHeight + props.offset && spaceBelow > spaceAbove) {
      isTop = false;
    } else {
      isTop = true;
    }
  }

  let isAlignRight = alignPlacement === 'end';
  if (isRtl) {
    isAlignRight = alignPlacement === 'start';
  }

  const style: Record<string, string> = {
    position: 'fixed',
  };

  if (props.matchWidth) {
    style.width = toRem(rect.width);
  }

  if (isTop) {
    style.bottom = toRem(window.innerHeight - rect.top + props.offset);
    style.transformOrigin = isAlignRight ? 'bottom right' : 'bottom left';
  } else {
    style.top = toRem(rect.bottom + props.offset);
    style.transformOrigin = isAlignRight ? 'top right' : 'top left';
  }

  if (isAlignRight) {
    style.right = toRem(window.innerWidth - rect.right);
  } else {
    style.left = toRem(rect.left);
  }

  dropdownStyle.value = style;
}

function onPanelClick() {
  if (props.closeOnContentClick) {
    close();
  }
}

function onClickOutside(e: MouseEvent) {
  if (!internalOpen.value) return;
  const target = e.target as Node;
  const isTrigger = triggerContainerRef.value?.contains(target);
  const isPanel = panelRef.value?.contains(target);
  
  if (!isTrigger && !isPanel) {
    dismiss(false);
  }
}

// Tab past either end of the panel closes it and continues from the trigger, as if the panel sat
// right after it in the page: Shift+Tab lands on the trigger, Tab on whatever follows it.
function onPanelKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !panelRef.value) return;
  const items = [...panelRef.value.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const atEdge = e.shiftKey ? document.activeElement === items[0] : document.activeElement === items[items.length - 1];
  if (items.length && !atEdge) return;
  e.preventDefault();
  const trigger = previousFocus.value;
  const panel = panelRef.value;
  close();
  if (e.shiftKey || !trigger) return;
  // The panel is still in the DOM while it fades out; skip its items.
  const order = [...document.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !panel.contains(el) && (el.offsetParent !== null || el === trigger),
  );
  order[order.indexOf(trigger) + 1]?.focus();
}

// Focus leaving the panel any other way closes it, so it never floats over content focus has moved past.
function onPanelFocusOut(e: FocusEvent) {
  const next = e.relatedTarget as Node | null;
  if (!next) return;
  if (panelRef.value?.contains(next) || triggerContainerRef.value?.contains(next)) return;
  dismiss(false);
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && internalOpen.value) {
    close();
  }
}

function onReposition() {
  if (internalOpen.value) updatePosition();
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside);
  document.addEventListener('keydown', onEscape);
  window.addEventListener('scroll', onReposition, true);
  window.addEventListener('resize', onReposition);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside);
  document.removeEventListener('keydown', onEscape);
  window.removeEventListener('scroll', onReposition, true);
  window.removeEventListener('resize', onReposition);
});
</script>

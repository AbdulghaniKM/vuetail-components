<template>
  <div ref="triggerContainerRef" class="inline-block w-fit">
    <slot name="trigger" :toggle="toggle" :close="close" :is-open="internalOpen"></slot>
  </div>

  <Teleport :to="teleportTo">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="scale-95 opacity-0"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="scale-100 opacity-100"
      leave-to-class="scale-95 opacity-0"
    >
      <div
        v-if="internalOpen"
        ref="panelRef"
        class="fixed z-[9999]"
        :class="panelClass"
        :style="dropdownStyle"
        @click="onPanelClick"
      >
        <slot :close="close"></slot>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';

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
  if (!internalOpen.value) return;
  doClose();
  if (props.open !== undefined) emit('update:open', false);
}

function doOpen() {
  internalOpen.value = true;
  emit('open');
  nextTick(() => {
    updatePosition();
    previousFocus.value = document.activeElement as HTMLElement | null;
  });
}

function doClose() {
  internalOpen.value = false;
  emit('close');
  if (previousFocus.value) {
    previousFocus.value.focus();
    previousFocus.value = null;
  }
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

function onPanelClick(e: MouseEvent) {
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
    close();
  }
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

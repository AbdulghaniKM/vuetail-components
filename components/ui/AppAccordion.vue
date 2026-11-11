<template>
  <div
    ref="root"
    data-accordion
    class="flex flex-col"
    :class="variant === 'card' ? 'divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface' : 'divide-y divide-border'"
    @keydown="onKeydown"
  >
    <div v-for="item in items" :key="item.key">
      <component :is="`h${headingLevel}`" class="m-0 text-base font-semibold">
        <button
          :id="headerId(item.key)"
          type="button"
          data-accordion-header
          :aria-expanded="isOpen(item.key)"
          :aria-controls="panelId(item.key)"
          :disabled="item.disabled"
          class="flex min-h-11 w-full items-center gap-3 py-3 text-start text-control font-medium text-text transition-colors duration-(--vt-duration) focus-visible:-outline-offset-2 enabled:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
          :class="variant === 'card' ? 'px-4' : 'px-1'"
          @click="toggle(item.key)"
        >
          <AppIcon v-if="item.icon" :name="item.icon" :size="1.125" class="shrink-0 text-text-muted" aria-hidden="true" />
          <span class="min-w-0 flex-1">{{ item.title }}</span>
          <AppIcon
            name="icon-[heroicons--chevron-down]"
            :size="1"
            class="shrink-0 text-text-muted transition-transform duration-(--vt-duration) ease-standard motion-reduce:transition-none"
            :class="isOpen(item.key) ? 'rotate-180' : ''"
            aria-hidden="true"
          />
        </button>
      </component>
      <!-- Opens at its full height at once and fades its content in (bible §10: no height
           animation). Closing is instant, so the page below never waits on a fade. -->
      <Transition
        enter-active-class="transition-opacity duration-(--vt-duration-enter) ease-standard"
        enter-from-class="opacity-0"
      >
        <div
          v-show="isOpen(item.key)"
          :id="panelId(item.key)"
          :role="items.length <= REGION_LIMIT ? 'region' : undefined"
          :aria-labelledby="items.length <= REGION_LIMIT ? headerId(item.key) : undefined"
          class="text-sm text-text-muted"
          :class="variant === 'card' ? 'px-4 pb-4' : 'px-1 pb-3'"
        >
          <slot :name="item.key" :item="item">
            <slot :item="item">{{ item.content }}</slot>
          </slot>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue';
import AppIcon from './AppIcon.vue';

export interface AccordionItem {
  key: string;
  title: string;
  /** Plain text body. A slot named after the key, or the default slot, replaces it. */
  content?: string;
  icon?: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    items: AccordionItem[];
    /** Let several panels stay open. Off: opening one closes the others. */
    multiple?: boolean;
    /** The heading level around each header button, to fit the page outline. */
    headingLevel?: 2 | 3 | 4 | 5 | 6;
    variant?: 'card' | 'plain';
  }>(),
  { multiple: false, headingLevel: 3, variant: 'card' },
);

/** Keys of the open panels. */
const open = defineModel<string[]>({ default: () => [] });

const emit = defineEmits<{ toggle: [key: string, open: boolean] }>();

// APG: region landmarks help with a few panels and clutter the landmark list with many.
const REGION_LIMIT = 6;

const id = useId();
const headerId = (key: string) => `${id}-${key}-header`;
const panelId = (key: string) => `${id}-${key}-panel`;

const isOpen = (key: string) => open.value.includes(key);

function toggle(key: string) {
  const opening = !isOpen(key);
  if (opening) open.value = props.multiple ? [...open.value, key] : [key];
  else open.value = open.value.filter((k) => k !== key);
  emit('toggle', key, opening);
}

// The optional APG keys: Up / Down between headers, Home / End to the first and last. Every
// header stays in the Tab order, so this is not a roving tab stop.
const root = ref<HTMLElement | null>(null);
function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  // A nested accordion handles its own headers.
  const own = (el: Element) => el.closest('[data-accordion]') === root.value;
  if (!target.matches('[data-accordion-header]') || !own(target)) return;
  const headers = [...(root.value?.querySelectorAll<HTMLButtonElement>('[data-accordion-header]:not(:disabled)') ?? [])].filter(own);
  const at = headers.indexOf(target as HTMLButtonElement);
  const n = headers.length;
  const next =
    e.key === 'ArrowDown' ? (at + 1) % n : e.key === 'ArrowUp' ? (at - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
  if (next < 0 || at < 0) return;
  e.preventDefault();
  headers[next].focus();
}
</script>

<template>
  <div class="flex min-w-0" :class="orientation === 'vertical' ? 'flex-row' : 'flex-col'">
    <div
      ref="tablist"
      role="tablist"
      :aria-label="label"
      :aria-orientation="orientation"
      class="relative flex shrink-0 gap-1 p-1"
      :class="[
        orientation === 'vertical' ? 'flex-col' : 'scrollbar-thin flex-row overflow-x-auto',
        variant === 'line' ? (orientation === 'vertical' ? 'border-e border-border' : 'border-b border-border') : '',
        listClass,
      ]"
      @keydown="onKeydown"
      @focusout="onFocusout"
    >
      <!-- Pill: one AppBlob behind the tabs that stretches from the old tab to the new one and
           settles. The line variant keeps its sliding bar: a 2px bar is too thin for the goo. -->
      <AppBlob
        v-if="variant === 'pill'"
        class="absolute top-0 left-0"
        v-bind="canvas"
        :shapes="shapes"
        fill="var(--color-accent-subtle)"
        :blur="blob.blur.value"
      />
      <button
        v-for="(item, index) in items"
        :id="tabId(item.key)"
        :key="item.key"
        type="button"
        role="tab"
        :aria-selected="item.key === current"
        :aria-controls="panelId(item.key)"
        :data-indicator="item.key"
        :tabindex="roving.tabindex(index)"
        :disabled="item.disabled"
        class="relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 font-medium transition-colors duration-(--vt-duration) after:absolute after:inset-x-0 disabled:cursor-not-allowed disabled:opacity-45"
        :class="[
          SIZE[size],
          orientation === 'vertical' ? 'justify-start' : 'justify-center',
          item.key === current ? 'text-text' : 'text-text-muted enabled:hover:bg-muted enabled:hover:text-text',
        ]"
        @click="select(item.key)"
      >
        <!-- One indicator that travels between tabs (a FLIP transform through layout-id), instead
             of a fill fading out under one tab and in under the next. -->
        <motion.span
          v-if="variant === 'line' && item.key === current"
          :layout-id="indicatorId"
          aria-hidden="true"
          class="pointer-events-none absolute"
          :class="INDICATOR[orientation]"
          :transition="indicatorTransition()"
        />
        <AppIcon v-if="item.icon" :name="item.icon" :size="1" class="relative" aria-hidden="true" />
        <span class="relative">{{ item.label }}</span>
      </button>
    </div>

    <div
      v-for="item in items"
      :id="panelId(item.key)"
      :key="item.key"
      role="tabpanel"
      :aria-labelledby="tabId(item.key)"
      :hidden="item.key !== current"
      tabindex="0"
      class="min-w-0 flex-1 rounded-md"
      :class="panelClass ?? (orientation === 'vertical' ? 'ps-4' : 'pt-3')"
    >
      <slot v-if="!lazy || visited.has(item.key)" :name="item.key" :item="item">
        <slot :item="item" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue';
import { motion } from 'motion-v';
import AppBlob from './AppBlob.vue';
import AppIcon from './AppIcon.vue';
import { useBlob } from '@/composables/useBlob';
import { useIndicator } from '@/composables/useIndicator';
import { useRovingFocus } from '@/composables/useRovingFocus';
import { useMotionTokens } from '@/composables/useMotionTokens';
import { useReducedMotion } from '@/composables/useReducedMotion';

export interface TabItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    items: TabItem[];
    /** Names the tab list. Required unless a heading right above names the tabs. */
    label?: string;
    /** `pill`: a filled shape behind the tab. `line`: a bar under it, on a rule. */
    variant?: 'pill' | 'line';
    orientation?: 'horizontal' | 'vertical';
    /** `automatic`: the arrows select. `manual`: the arrows move focus; Enter or Space selects. */
    activation?: 'automatic' | 'manual';
    size?: 'sm' | 'md';
    /** Render a panel only once it has been shown, then keep it. */
    lazy?: boolean;
    /** Added to the tab list, for a bar of its own (a fill, an edge). */
    listClass?: string;
    /** Replaces the panels' spacing from the list (`pt-3`, or `ps-4` when vertical). */
    panelClass?: string;
  }>(),
  { variant: 'pill', orientation: 'horizontal', activation: 'automatic', size: 'md', lazy: false, listClass: '', panelClass: undefined },
);

/** The selected tab's key. Without v-model the first enabled tab starts selected. */
const model = defineModel<string>();

const emit = defineEmits<{ change: [key: string] }>();

// The after: box takes every size to a 44px hit area (bible §2).
const SIZE = { sm: 'min-h-control-sm text-sm after:-inset-y-1.5', md: 'min-h-control-md text-control after:-inset-y-0.5' } as const;
// The line variant's bar; it sits on the list's rule: 4px of padding plus the 1px edge below the
// tab. The pill variant is the AppBlob in the template.
const INDICATOR = {
  horizontal: 'inset-x-2 -bottom-[0.3125rem] h-0.5 rounded-full bg-accent',
  vertical: '-end-[0.3125rem] inset-y-1.5 w-0.5 rounded-full bg-accent',
} as const;

const id = useId();
const indicatorId = `tabs-indicator-${id}`;
const tabId = (key: string) => `${id}-${key}-tab`;
const panelId = (key: string) => `${id}-${key}-panel`;

const firstEnabled = () => props.items.find((i) => !i.disabled)?.key;
const current = computed(() => (props.items.some((i) => i.key === model.value) ? model.value : firstEnabled()));
const indexOf = (key: string | undefined) => props.items.findIndex((i) => i.key === key);

const visited = reactive(new Set<string>());
watch(current, (key) => key && visited.add(key), { immediate: true });

function select(key: string) {
  if (key === current.value) return;
  model.value = key;
  emit('change', key);
}

const tablist = ref<HTMLElement | null>(null);
const roving = useRovingFocus({
  count: () => props.items.length,
  orientation: props.orientation,
  container: tablist,
  initial: Math.max(0, indexOf(current.value)),
  disabled: (i) => !!props.items[i]?.disabled,
  onChange: (i) => props.activation === 'automatic' && select(props.items[i].key),
});
const onKeydown = (e: KeyboardEvent) => roving.onKeydown(e);

// The one Tab stop is the selected tab. In manual mode focus may have wandered; when it leaves
// the list, it comes back to the selected tab next time.
watch(current, (key) => roving.set(Math.max(0, indexOf(key)), { focus: false }));
function onFocusout(e: FocusEvent) {
  if (!tablist.value?.contains(e.relatedTarget as Node | null)) roving.set(Math.max(0, indexOf(current.value)), { focus: false });
}

const reduced = useReducedMotion();
const { state } = useMotionTokens();
// Read per move, so a preset switch reaches the next one.
const indicatorTransition = () => (reduced.value ? { duration: 0 } : state());

const blob = useBlob({ radius: '--radius-md' });
const { canvas, shapes } = useIndicator(tablist, computed(() => current.value ?? null), { blob });
</script>

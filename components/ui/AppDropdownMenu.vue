<template>
  <AppPopover
    v-model:open="isOpen"
    :placement="placement"
    :close-on-content-click="false"
    :disabled="disabled"
    panel-class="min-w-48 max-w-[min(20rem,calc(100vw-1rem))] rounded-lg border border-border bg-surface-raised p-1 shadow-lg"
  >
    <template #trigger="{ triggerAttrs }">
      <!-- A custom trigger binds `attrs`: ARIA, id, and the click and arrow-key handlers. -->
      <slot name="trigger" :attrs="{ ...triggerAttrs, ...menuTrigger }" :open="isOpen">
        <button
          type="button"
          v-bind="{ ...triggerAttrs, ...menuTrigger }"
          :disabled="disabled"
          class="inline-flex h-control-md items-center gap-2 rounded-md border border-border-strong bg-surface px-control-pad text-control font-medium text-text transition-colors duration-(--vt-duration) enabled:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
        >
          <AppIcon v-if="icon" :name="icon" :size="1.125" aria-hidden="true" />
          {{ label }}
          <AppIcon name="icon-[heroicons--chevron-down]" :size="1" class="text-text-muted" aria-hidden="true" />
        </button>
      </slot>
    </template>

    <div
      :id="menuId"
      ref="menu"
      role="menu"
      :aria-labelledby="triggerId"
      aria-orientation="vertical"
      class="flex flex-col outline-none"
      @keydown="onMenuKeydown"
    >
      <template v-for="(entry, e) in entries" :key="e">
        <div v-if="entry.kind === 'separator'" role="separator" class="-mx-1 my-1 h-px bg-border" />
        <div v-else-if="entry.kind === 'heading'" :id="entry.id" class="px-2 pb-1 pt-2 text-xs font-medium text-text-muted">{{ entry.label }}</div>
        <div v-else role="group" :aria-labelledby="entry.labelledBy" class="flex flex-col">
          <div
            v-for="row in entry.rows"
            :key="row.index"
            :role="ROLE[row.item.type ?? 'item']"
            tabindex="-1"
            :aria-disabled="row.item.disabled ? 'true' : undefined"
            :aria-checked="row.item.type === 'checkbox' || row.item.type === 'radio' ? !!row.item.checked : undefined"
            class="flex min-h-11 cursor-default select-none items-center gap-2.5 rounded-md px-2 text-control -outline-offset-2 focus:bg-muted [[data-vt-preset=console]_&]:min-h-control-sm"
            :class="[
              row.item.danger ? 'text-danger-text' : 'text-text',
              row.item.disabled ? 'opacity-45' : '',
            ]"
            @click="activate(row.index)"
            @pointermove="hover(row.index)"
          >
            <span v-if="hasMarks" class="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
              <AppIcon v-if="row.item.type === 'checkbox' && row.item.checked" name="icon-[heroicons--check]" :size="1" />
              <span v-else-if="row.item.type === 'radio' && row.item.checked" class="size-1.5 rounded-full bg-current" />
            </span>
            <AppIcon v-if="row.item.icon" :name="row.item.icon" :size="1.125" class="shrink-0" :class="row.item.danger ? '' : 'text-text-muted'" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ row.item.label }}</span>
            <kbd v-if="row.item.shortcut" class="ms-4 font-mono text-xs text-text-muted">{{ row.item.shortcut }}</kbd>
          </div>
        </div>
      </template>
    </div>
  </AppPopover>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue';
import AppIcon from './AppIcon.vue';
import AppPopover from './AppPopover.vue';
import { useRovingFocus } from '@/composables/useRovingFocus';

export interface MenuItem {
  label: string;
  /** `item` (default) runs and closes; `checkbox` and `radio` toggle and keep the menu open. */
  type?: 'item' | 'checkbox' | 'radio';
  icon?: string;
  /** Shown at the end, for reading only: the shortcut itself is the app's to bind. */
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  /** For checkbox and radio items. */
  checked?: boolean;
  onSelect?: () => void;
}

export interface MenuGroup {
  /** A heading for the group. Without one the group is only spaced by separators. */
  label?: string;
  items: MenuItem[];
}

const props = withDefaults(
  defineProps<{
    /** Groups are split by separators. A flat list of items is one group. */
    items: (MenuItem | MenuGroup)[];
    /** The default trigger's text. A custom trigger goes in the `trigger` slot. */
    label?: string;
    icon?: string;
    placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
    disabled?: boolean;
  }>(),
  { label: 'Options', placement: 'bottom-start', disabled: false },
);

const emit = defineEmits<{ select: [item: MenuItem] }>();

const ROLE = { item: 'menuitem', checkbox: 'menuitemcheckbox', radio: 'menuitemradio' } as const;

const id = useId();
const menuId = `${id}-menu`;
const triggerId = `${id}-trigger`;
const isOpen = ref(false);

const menuTrigger = computed(() => ({
  id: triggerId,
  'aria-haspopup': 'menu' as const,
  'aria-controls': isOpen.value ? menuId : undefined,
  onClick: toggle,
  onKeydown: onTriggerKeydown,
}));

const isGroup = (x: MenuItem | MenuGroup): x is MenuGroup => 'items' in x;
const groups = computed<MenuGroup[]>(() => {
  const out: MenuGroup[] = [];
  let loose: MenuItem[] = [];
  for (const x of props.items) {
    if (isGroup(x)) {
      if (loose.length) out.push({ items: loose });
      loose = [];
      out.push(x);
    } else loose.push(x);
  }
  if (loose.length) out.push({ items: loose });
  return out;
});

/** Every item in DOM order, which is the order the arrows walk. */
const flat = computed(() => groups.value.flatMap((g) => g.items));

type Entry =
  | { kind: 'separator' }
  | { kind: 'heading'; id: string; label: string }
  | { kind: 'rows'; labelledBy?: string; rows: { item: MenuItem; index: number }[] };

const entries = computed<Entry[]>(() => {
  const out: Entry[] = [];
  let index = 0;
  groups.value.forEach((g, gi) => {
    if (gi > 0) out.push({ kind: 'separator' });
    const headingId = g.label ? `${id}-group-${gi}` : undefined;
    if (g.label) out.push({ kind: 'heading', id: headingId!, label: g.label });
    out.push({ kind: 'rows', labelledBy: headingId, rows: g.items.map((item) => ({ item, index: index++ })) });
  });
  return out;
});

// The check column appears once any item can be checked, so labels stay aligned.
const hasMarks = computed(() => flat.value.some((i) => i.type === 'checkbox' || i.type === 'radio'));

const menu = ref<HTMLElement | null>(null);
const roving = useRovingFocus({
  count: () => flat.value.length,
  orientation: 'vertical',
  container: menu,
  disabled: (i) => !!flat.value[i]?.disabled,
  label: (i) => flat.value[i]?.label ?? '',
});

const firstEnabled = () => flat.value.findIndex((i) => !i.disabled);
const lastEnabled = () => {
  for (let i = flat.value.length - 1; i >= 0; i--) if (!flat.value[i].disabled) return i;
  return -1;
};

// AppPopover records the element to return focus to in its own nextTick after opening, so the
// move into the menu waits one tick more, or focus would return to a menu item.
async function openAt(which: 'first' | 'last') {
  isOpen.value = true;
  await nextTick();
  await nextTick();
  roving.set(which === 'first' ? firstEnabled() : lastEnabled());
}

// Enter and Space reach the menu through the button's own click; the arrows open it from here.
function onTriggerKeydown(e: KeyboardEvent) {
  if (props.disabled || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
  e.preventDefault();
  openAt(e.key === 'ArrowDown' ? 'first' : 'last');
}

// Opening by click puts focus on the first item too (APG).
function toggle() {
  if (props.disabled) return;
  if (isOpen.value) close();
  else openAt('first');
}

function close() {
  isOpen.value = false;
}

function activate(index: number) {
  const item = flat.value[index];
  if (!item || item.disabled) return;
  item.onSelect?.();
  emit('select', item);
  // Checkbox and radio items stay open, so several can be set in one visit.
  if (!item.type || item.type === 'item') close();
}

function hover(index: number) {
  if (flat.value[index]?.disabled || roving.active.value === index) return;
  roving.set(index);
}

function onMenuKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    activate(roving.active.value);
    return;
  }
  roving.onKeydown(e);
}

defineExpose({ open: () => openAt('first'), close });
</script>

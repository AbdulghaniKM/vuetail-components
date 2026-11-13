<template>
  <ul
    ref="listEl"
    role="list"
    class="app-avatar-group relative flex items-center"
    :class="reveal === 'blob' && 'rounded-full'"
    :aria-label="label"
    :tabindex="reveal === 'blob' && entries.length ? 0 : undefined"
    @mouseover="onPointer"
    @mouseleave="close"
    @focus="onFocus"
    @blur="close"
    @keydown="onKeydown"
  >
    <!--
      The reveal (first, so :last-child is still the +N tile): one AppBlob behind the hovered face (above its neighbours), a ring around it and
      a name pill that drips out of it. Decoration only: every name is already in its avatar's
      accessible name, so this item is aria-hidden. The pill takes the pointer, so moving onto it
      keeps it open (WCAG 1.4.13).
    -->
    <li v-if="reveal === 'blob' && box" class="pointer-events-none absolute z-10" :style="canvasStyle" aria-hidden="true">
      <AppBlob :width="canvas.width" :height="canvas.height" :shapes="shapes" fill="var(--color-text)" :transition="motionFor" />
      <motion.div
        class="pointer-events-auto absolute top-0 left-0 flex items-center"
        :style="{ height: `${PILL_H}px` }"
        :initial="false"
        :animate="{ x: pill.x, y: pill.y, opacity: active === null ? 0 : 1 }"
        :transition="labelMotion"
      >
        <span ref="labelEl" class="block px-3 text-xs leading-none font-medium whitespace-nowrap text-bg">
          <!-- The ellipsis needs a block of its own: AppSwap's copies are inline-flex boxes. -->
          <AppSwap :swap-key="activeText"><span class="block max-w-60 truncate py-0.5">{{ activeText }}</span></AppSwap>
        </span>
      </motion.div>
    </li>
    <li
      v-for="(item, index) in shown"
      :key="item.key ?? `${item.name}-${index}`"
      class="app-avatar-group-item flex"
      :class="[cutShape, index > 0 && OVERLAP[size], liftClass(index)]"
      :data-index="index"
    >
      <component :is="reveal === 'tooltip' ? AppTooltip : Passthrough" v-bind="reveal === 'tooltip' ? { content: entries[index].text } : {}">
        <AppAvatar
          :name="item.name"
          :src="item.src"
          :alt="item.alt"
          :status="item.status"
          :status-label="item.statusLabel"
          :hue="item.hue"
          :seed="item.seed"
          :size="size"
          :shape="shape"
        />
      </component>
    </li>
    <li
      v-if="hiddenCount > 0"
      class="app-avatar-group-item flex"
      :class="[cutShape, shown.length > 0 && OVERLAP[size], liftClass(shown.length)]"
      :data-index="shown.length"
    >
      <component :is="reveal === 'tooltip' ? AppTooltip : Passthrough" v-bind="reveal === 'tooltip' ? { content: entries[shown.length].text } : {}">
        <slot name="overflow" :count="hiddenCount" :hidden="hidden">
          <span
            role="img"
            :aria-label="overflowLabel"
            :title="reveal === 'none' ? hiddenNames || undefined : undefined"
            class="flex select-none items-center justify-center border border-border bg-muted font-semibold leading-none text-text-muted tabular-nums"
            :class="[SIZE[size], TEXT[size], shape === 'square' ? 'rounded-lg' : 'rounded-full']"
          >
            <span aria-hidden="true">+{{ hiddenCount }}</span>
          </span>
        </slot>
      </component>
    </li>

  </ul>
</template>

<script setup lang="ts">
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { motion } from 'motion-v';
import AppAvatar, { AVATAR_STATUS_LABELS, type AvatarHue, type AvatarShape, type AvatarSize, type AvatarStatus } from '@/components/ui/AppAvatar.vue';
import AppBlob, { type BlobShape } from '@/components/ui/AppBlob.vue';
import AppSwap from '@/components/ui/AppSwap.vue';
import AppTooltip from '@/components/ui/AppTooltip.vue';
import { useBlob } from '@/composables/useBlob';

export interface AvatarGroupItem {
  name: string;
  src?: string;
  alt?: string;
  status?: AvatarStatus;
  statusLabel?: string;
  hue?: AvatarHue;
  seed?: string;
  /** Stable key for the list. Defaults to the name and position. */
  key?: string | number;
}

const props = withDefaults(
  defineProps<{
    items: AvatarGroupItem[];
    /** How many avatars to show before the "+N" tile. */
    max?: number;
    /** The real total when `items` is only the first page (a server count). Raises the "+N". */
    total?: number;
    /** Names the list ("Project members"). */
    label?: string;
    size?: AvatarSize;
    shape?: AvatarShape;
    /**
     * What hovering a face shows. `blob`: a ring and a name pill that drips out of the face and
     * slides along the row (the group is one tab stop; arrows walk it). `tooltip`: an AppTooltip
     * per face. `none`: nothing.
     */
    reveal?: 'blob' | 'tooltip' | 'none';
    /** Which side of the row the name pill drips to. */
    revealPlacement?: 'bottom' | 'top';
  }>(),
  { max: 4, size: 'md', shape: 'circle', reveal: 'blob', revealPlacement: 'bottom' },
);

const Passthrough = defineComponent({ setup: (_, { slots }) => () => slots.default?.() });

const SIZE: Record<AvatarSize, string> = { xs: 'size-6', sm: 'size-8', md: 'size-10', lg: 'size-12', xl: 'size-16' };
const TEXT: Record<AvatarSize, string> = { xs: 'text-xs', sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-lg' };
// Logical margin, so the stack overlaps the other way in RTL.
const OVERLAP: Record<AvatarSize, string> = { xs: '-ms-1.5', sm: '-ms-2', md: '-ms-2.5', lg: '-ms-3', xl: '-ms-4' };

const limit = computed(() => Math.max(0, Math.floor(props.max)));
const shown = computed(() => props.items.slice(0, limit.value));
const hidden = computed(() => props.items.slice(limit.value));
const hiddenCount = computed(() => Math.max(hidden.value.length, (props.total ?? 0) - shown.value.length));
const hiddenNames = computed(() => hidden.value.map((item) => item.name).join(', '));
const overflowLabel = computed(() => {
  const unnamed = hiddenCount.value - hidden.value.length;
  if (!hidden.value.length) return `${hiddenCount.value} more`;
  return `${hiddenCount.value} more: ${hiddenNames.value}${unnamed > 0 ? ` and ${unnamed} others` : ''}`;
});
const cutShape = computed(() => (props.shape === 'square' ? 'rounded-xl' : 'rounded-full'));

/* ------------------------------- Reveal -------------------------------- */

// What each face says: the name and its status word; the "+N" tile names who it hides.
const entries = computed(() => {
  const faces = shown.value.map((item) => {
    const status = item.status ? (item.statusLabel ?? AVATAR_STATUS_LABELS[item.status]) : '';
    const name = (item.alt ?? item.name).trim() || item.name;
    return { text: status ? `${name} · ${status}` : name };
  });
  if (hiddenCount.value > 0) {
    const unnamed = hiddenCount.value - hidden.value.length;
    const names = hidden.value.map((item) => item.name);
    // Short enough for one pill: two names, or the first and a count.
    const text = !names.length
      ? `${hiddenCount.value} more`
      : names.length <= 2 && unnamed <= 0
        ? names.join(' and ')
        : `${names[0]} and ${hiddenCount.value - 1} more`;
    faces.push({ text });
  }
  return faces;
});

const listEl = ref<HTMLElement | null>(null);
const labelEl = ref<HTMLElement | null>(null);
const active = ref<number | null>(null);
// The last face shown, so the pill keeps its words while it fades out.
const last = ref(0);
const activeText = computed(() => entries.value[active.value ?? last.value]?.text ?? '');

const { spring, quick, reduced } = useBlob();
// Appearing from nothing springs (Pine bounces); moving along the row follows the pointer on a
// short tween, so the drop never trails behind it.
const fromClosed = ref(true);
// True for the one frame in which the closed shapes jump, unseen, onto the face about to open.
const jump = ref(false);
const motionFor = computed(() => (jump.value ? { duration: 0 } : fromClosed.value ? spring(true) : quick()));
const labelMotion = computed(() =>
  jump.value || fromClosed.value ? { ...motionFor.value, x: { duration: 0 }, y: { duration: 0 } } : motionFor.value,
);

const PILL_H = 28;
const RING = 4;
const NECK = 4;
// Room the canvas keeps around the row for a pill wider than the group.
const MX = 128;

const box = ref<{ width: number; height: number } | null>(null);
const faces = ref<{ x: number; y: number; width: number; height: number }[]>([]);
const labelWidth = ref(0);
// The box the pill must stay inside, in viewport px: the viewport, narrowed to the nearest
// ancestor that clips (a card, a scroller), so the pill is never cut off at either.
const bounds = ref({ left: -Infinity, right: Infinity });
const listLeft = ref(0);

function clipBounds(el: HTMLElement) {
  let left = 0;
  let right = document.documentElement.clientWidth;
  let node = el.parentElement;
  while (node && node !== document.body && getComputedStyle(node).overflowX === 'visible') node = node.parentElement;
  if (node && node !== document.body) {
    const r = node.getBoundingClientRect();
    left = Math.max(left, r.left);
    right = Math.min(right, r.right);
  }
  return { left, right };
}

function measure() {
  const list = listEl.value;
  if (!list) return;
  const outer = list.getBoundingClientRect();
  box.value = { width: outer.width, height: outer.height };
  listLeft.value = outer.left;
  bounds.value = clipBounds(list);
  faces.value = [...list.querySelectorAll<HTMLElement>(':scope > li[data-index]')].map((li) => {
    const r = li.getBoundingClientRect();
    return { x: r.left - outer.left, y: r.top - outer.top, width: r.width, height: r.height };
  });
  if (labelEl.value) labelWidth.value = labelEl.value.offsetWidth;
}

const below = computed(() => props.revealPlacement === 'bottom');
const rowH = computed(() => box.value?.height ?? 0);
// The canvas, in the list's coordinates.
const canvasTop = computed(() => (below.value ? -RING - 2 : -(RING + NECK + PILL_H + 4)));
const canvas = computed(() => ({
  width: Math.round((box.value?.width ?? 0) + MX * 2),
  height: Math.round(rowH.value + RING * 2 + NECK + PILL_H + 8),
}));
const canvasStyle = computed(() => ({ left: `${-MX}px`, top: `${canvasTop.value}px`, width: `${canvas.value.width}px`, height: `${canvas.value.height}px` }));

const face = computed(() => faces.value[active.value ?? last.value]);
const roundFace = computed(() => props.shape !== 'square');

// The pill, centred on the face, kept inside the canvas.
const pill = computed(() => {
  const f = face.value;
  if (!f) return { x: 0, y: 0, width: 0 };
  const width = Math.max(PILL_H, labelWidth.value);
  const cx = f.x + f.width / 2 + MX;
  // Inside the canvas, and 8px inside the clip bounds (canvas x 0 is the list's left edge − MX).
  const toCanvas = listLeft.value - MX;
  const min = Math.max(4, bounds.value.left + 8 - toCanvas);
  const max = Math.min(canvas.value.width - width - 4, bounds.value.right - 8 - width - toCanvas);
  const x = Math.min(Math.max(cx - width / 2, min), Math.max(min, max));
  const ringTop = f.y - RING - canvasTop.value;
  const ringBottom = f.y + f.height + RING - canvasTop.value;
  const y = below.value ? ringBottom + NECK : ringTop - NECK - PILL_H;
  return { x, y, width };
});

const shapes = computed<BlobShape[]>(() => {
  const f = face.value;
  if (!f) return [];
  const x = f.x + MX;
  const y = f.y - canvasTop.value;
  const open = active.value !== null;
  const ringRadius = roundFace.value ? (f.height + RING * 2) / 2 : 12 + RING;
  const p = pill.value;
  return [
    open
      ? { key: 'ring', x: x - RING, y: y - RING, width: f.width + RING * 2, height: f.height + RING * 2, radius: ringRadius }
      : { key: 'ring', x, y, width: f.width, height: f.height, radius: ringRadius - RING, opacity: 0 },
    open
      ? { key: 'pill', x: p.x, y: p.y, width: p.width, height: PILL_H, radius: PILL_H / 2 }
      : {
          key: 'pill',
          x: x + f.width / 2 - 8,
          y: below.value ? y + f.height - 8 : y,
          width: 16,
          height: 8,
          radius: 4,
          opacity: 0,
        },
  ];
});

let pending = 0;
async function show(index: number) {
  if (index < 0 || index >= entries.value.length) return;
  const ticket = ++pending;
  fromClosed.value = active.value === null;
  if (fromClosed.value && last.value !== index) {
    // Move the closed (invisible) shapes onto this face first, so they grow out of it instead of
    // flying in from the last face shown.
    measure();
    jump.value = true;
    last.value = index;
    await nextTick();
    if (labelEl.value) labelWidth.value = labelEl.value.offsetWidth;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    jump.value = false;
    if (ticket !== pending) return;
  } else if (fromClosed.value) measure();
  active.value = index;
  last.value = index;
  await nextTick();
  if (labelEl.value) labelWidth.value = labelEl.value.offsetWidth;
}

function close() {
  pending++;
  if (active.value === null) return;
  fromClosed.value = false;
  active.value = null;
}

function onPointer(event: MouseEvent) {
  if (props.reveal !== 'blob') return;
  const li = (event.target as HTMLElement).closest<HTMLElement>('li[data-index]');
  if (!li || li.parentElement !== listEl.value) return;
  const index = Number(li.dataset.index);
  if (index !== active.value) show(index);
}

function onFocus(event: FocusEvent) {
  // Only the list itself; focus inside a custom overflow slot is that control's own.
  if (props.reveal === 'blob' && event.target === listEl.value) show(0);
}

function onKeydown(event: KeyboardEvent) {
  if (props.reveal !== 'blob' || event.target !== listEl.value) return;
  const count = entries.value.length;
  const rtl = getComputedStyle(listEl.value!).direction === 'rtl';
  const current = active.value ?? last.value;
  let next: number | null = null;
  if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight') || event.key === 'ArrowDown') next = Math.min(count - 1, current + 1);
  else if (event.key === (rtl ? 'ArrowRight' : 'ArrowLeft') || event.key === 'ArrowUp') next = Math.max(0, current - 1);
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = count - 1;
  else if (event.key === 'Escape' && active.value !== null) {
    event.preventDefault();
    close();
    return;
  }
  if (next === null) return;
  event.preventDefault();
  show(next);
}

// WCAG 1.4.13: a pointer reveal is dismissable without moving the pointer.
const onDocKeydown = (e: KeyboardEvent) => e.key === 'Escape' && document.activeElement !== listEl.value && close();

// The hovered face lifts above its neighbours (and the canvas sits between them), so the ring
// overlaps the faces beside it instead of hiding under them.
const liftClass = (index: number) =>
  props.reveal !== 'blob'
    ? ''
    : [
        'transition-transform duration-(--vt-duration) ease-standard',
        active.value === index ? `relative z-20 ${reduced.value ? '' : below.value ? '-translate-y-0.5' : 'translate-y-0.5'}` : 'relative z-0',
      ].join(' ');

let observer: ResizeObserver | null = null;
onMounted(() => {
  measure();
  document.addEventListener('keydown', onDocKeydown);
  window.addEventListener('resize', measure);
  if (typeof ResizeObserver !== 'undefined' && listEl.value) {
    observer = new ResizeObserver(() => measure());
    observer.observe(listEl.value);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocKeydown);
  window.removeEventListener('resize', measure);
  observer?.disconnect();
});
watch(entries, () => nextTick(measure));
</script>

<style scoped>
/* Each avatar sits on a disc of the cut colour, 2px larger, so the next one in the stack
   reads as cut out of the one beneath. Set --vt-avatar-cut to the colour behind the group. */
.app-avatar-group-item {
  padding: 2px;
  background: var(--vt-avatar-cut, var(--color-surface));
}
</style>

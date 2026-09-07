<script lang="ts">
  /**
   * Floating macOS-style dock.
   *
   * A glass navigation pill that floats over the app, pinned to any edge. Tiles
   * are colour-tagged route links or actions; the bar drags between edges with a
   * live ghost preview and FLIPs into its new place with a spring.
   *
   * This block is plain `<script>` on purpose: the class maps below must be
   * literal strings in a file Tailwind scans, and they must be built once rather
   * than per instance.
   */

  import type { DockPosition } from '@/composables/useDockPosition';

  export type DockSize = 'sm' | 'md' | 'lg';

  /** Tile edge, in rem, per size. The grip's long axis is matched to it. */
  export const TILE_REM: Record<DockSize, number> = { sm: 2.25, md: 2.75, lg: 3.25 };

  /** Icon size, in rem, per tile size. */
  export const ICON_REM: Record<DockSize, number> = { sm: 1.125, md: 1.375, lg: 1.625 };

  /**
   * Accent that tags a destination. These are the app's own semantic tokens
   * rather than an invented palette, so the dock stays on-theme and follows a
   * light/dark swap with everything else.
   */
  export type DockHue =
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'success'
    | 'warning'
    | 'error'
    | 'info';

  export interface DockItem {
    /** Tile `aria-label` and hover label. */
    label: string;
    /**
     * RouterLink target. Also the tile's key, so it must be unique. Omit it and
     * pass `onClick` instead for an action that does not navigate — the tile
     * renders as a `<button>` and keys off `label`.
     */
    to?: string;
    /**
     * Iconify name. Use the `icon-[solar--home-2-linear]` form, not
     * `solar:home-2-linear` — Tailwind's iconify plugin only emits a class it can
     * find spelled out in scanned source, and the colon form never matches
     * because `AppIcon` converts it at runtime, long after Tailwind has run. Both
     * forms render in dev off a class some other file happened to pull in; only
     * the bracket form survives a production build.
     */
    icon: string;
    hue?: DockHue;
    /** Omit to show the item to everyone. */
    roles?: readonly string[];
    /** Fires on activation. The only thing an item without `to` can do. */
    onClick?: (item: DockItem) => void;
    /** Count or short string shown on the tile's corner. `0` renders nothing. */
    badge?: number | string;
    /** Match this route exactly instead of covering everything beneath it. */
    exact?: boolean;
    /** Dimmed, unfocusable, and inert. */
    disabled?: boolean;
  }

  export interface DockSection {
    items: readonly DockItem[];
  }

  // Tailwind only ships classes it can find as literal strings, so every position
  // variant is spelled out below instead of built from a template.

  /**
   * Fixed box that pins the dock to an edge. It never scrolls and never changes
   * size — overflow is handled inside the bar (see `DOCK_SCROLLER`), so this box
   * stays `overflow: visible` and hover labels are free to leave it.
   */
  export const DOCK_VIEWPORT: Record<DockPosition, string> = {
    bottom: 'inset-x-0 bottom-0 px-3 pt-12 pb-3 md:pb-4',
    top: 'inset-x-0 top-0 px-3 pb-12 pt-3 md:pt-4',
    left: 'inset-y-0 left-0 flex items-center py-3 pr-12 pl-3 md:pl-4',
    right: 'inset-y-0 right-0 flex items-center py-3 pl-12 pr-3 md:pr-4',
  };

  /**
   * The glass `<nav>` pill — row along a horizontal edge, column along a vertical
   * one. Capped at the viewport box so a crowded dock scrolls its tiles rather
   * than running off-screen; the pill keeps its resting place either way.
   */
  export const DOCK_BAR: Record<DockPosition, string> = {
    bottom: 'mx-auto w-max max-w-full items-end',
    top: 'mx-auto w-max max-w-full items-start',
    left: 'my-auto h-max max-h-full flex-col items-start',
    right: 'my-auto h-max max-h-full flex-col items-end',
  };

  /**
   * The tile strip inside the pill — the only thing that scrolls. The grip and
   * its separator sit outside it so the drag handle never scrolls away.
   *
   * The negative margin and matching padding are what keep hover labels, badges
   * and lifted tiles visible: setting overflow on one axis computes the other
   * from `visible` to `auto`, so this box would otherwise clip them against the
   * pill's inner edge. Padding is part of the clip region and the negative margin
   * cancels its contribution to layout, so the strip clips well outside the pill
   * while occupying exactly the space its tiles do — the pill's size is
   * unchanged. Widening `DOCK_LABEL`'s offsets or its `max-w-32` means widening
   * this cross-axis padding to match.
   */
  export const DOCK_SCROLLER: Record<DockPosition, string> = {
    bottom: '-my-14 min-w-0 overflow-x-auto overscroll-x-contain py-14',
    top: '-my-14 min-w-0 overflow-x-auto overscroll-x-contain py-14',
    left: '-mx-40 min-h-0 flex-col overflow-y-auto overscroll-y-contain px-40',
    right: '-mx-40 min-h-0 flex-col overflow-y-auto overscroll-y-contain px-40',
  };

  /**
   * Per-tile wrapper. It takes its size from the tile and keeps it: hover lifts a
   * tile within its own footprint rather than resizing it, so nothing reflows.
   */
  export const DOCK_SLOT: Record<DockPosition, string> = {
    bottom: 'justify-center',
    top: 'justify-center',
    left: 'items-center',
    right: 'items-center',
  };

  /** Hover label — floats away from the screen edge, clearing the tile's lift. */
  export const DOCK_LABEL: Record<DockPosition, string> = {
    bottom: '-top-12 left-1/2 -translate-x-1/2',
    top: '-bottom-12 left-1/2 -translate-x-1/2',
    left: 'top-1/2 left-full ml-6 -translate-y-1/2',
    right: 'top-1/2 right-full mr-6 -translate-y-1/2',
  };

  /** Active-tile dot — hugs the screen edge on every orientation. */
  export const DOCK_RUNNING_DOT: Record<DockPosition, string> = {
    bottom: '-bottom-1 left-1/2 -translate-x-1/2',
    top: '-top-1 left-1/2 -translate-x-1/2',
    left: 'top-1/2 -left-1 -translate-y-1/2',
    right: 'top-1/2 -right-1 -translate-y-1/2',
  };

  /** Section separator — vertical bar in a row, horizontal bar in a column. */
  export const DOCK_SEPARATOR: Record<DockPosition, string> = {
    bottom: 'mx-1 h-8 w-px',
    top: 'mx-1 h-8 w-px',
    left: 'my-1 h-px w-8',
    right: 'my-1 h-px w-8',
  };

  /** Grip hit area, cross-axis only — the long axis is matched to the tile inline. */
  export const DOCK_GRIP: Record<DockPosition, string> = {
    bottom: 'w-5',
    top: 'w-5',
    left: 'h-5',
    right: 'h-5',
  };

  /** The grabber bar itself, always drawn across the dock's own axis. */
  export const DOCK_GRIP_BAR: Record<DockPosition, string> = {
    bottom: 'h-6 w-1',
    top: 'h-6 w-1',
    left: 'h-1 w-6',
    right: 'h-1 w-6',
  };

  /**
   * Content-column padding that reserves space for the docked nav. For the page
   * layout, not the dock — see the mounting example in the README.
   */
  export const CONTENT_CLEARANCE: Record<DockPosition, string> = {
    bottom: 'pb-28 md:pb-32',
    top: 'pt-28 md:pt-32',
    left: 'pb-28 md:pb-12 md:pl-28',
    right: 'pb-28 md:pb-12 md:pr-28',
  };

  /**
   * Active tile: a tint of the hue with the hue itself as ink, plus a glow in the
   * same colour. Deliberately not a solid fill — the hues here are whatever the
   * app's tokens happen to be, and a solid fill would need ink chosen per token
   * to stay legible. A tint is readable against every one of them.
   */
  export const HUE_ACTIVE: Record<DockHue, string> = {
    primary:
      'bg-primary/25 text-primary ring-1 ring-primary/40 shadow-[0_0.375rem_1rem_-0.375rem_var(--color-primary)]',
    secondary:
      'bg-secondary/25 text-secondary ring-1 ring-secondary/40 shadow-[0_0.375rem_1rem_-0.375rem_var(--color-secondary)]',
    accent:
      'bg-accent/25 text-accent ring-1 ring-accent/40 shadow-[0_0.375rem_1rem_-0.375rem_var(--color-accent)]',
    success:
      'bg-success/25 text-success ring-1 ring-success/40 shadow-[0_0.375rem_1rem_-0.375rem_var(--color-success)]',
    warning:
      'bg-warning/25 text-warning ring-1 ring-warning/40 shadow-[0_0.375rem_1rem_-0.375rem_var(--color-warning)]',
    error:
      'bg-error/25 text-error ring-1 ring-error/40 shadow-[0_0.375rem_1rem_-0.375rem_var(--color-error)]',
    info: 'bg-info/25 text-info ring-1 ring-info/40 shadow-[0_0.375rem_1rem_-0.375rem_var(--color-info)]',
  };

  /** Idle icon tint — keeps the nav colourful even when nothing is selected. */
  export const HUE_ICON: Record<DockHue, string> = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info',
  };

  /** The running-app dot under an active tile. */
  export const HUE_DOT: Record<DockHue, string> = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-info',
  };

  /**
   * Entries nest (`/orders` and `/orders/refunds`), and a path under a nested one
   * is covered by both. Matching on a `/` boundary rather than a bare prefix is
   * what stops `/orders-archive` being read as `/orders`.
   */
  const covers = (item: DockItem, path: string): boolean => {
    if (!item.to) return false;
    if (item.exact || item.to === '/') return path === item.to;
    return path === item.to || path.startsWith(`${item.to}/`);
  };

  /** The most specific match wins, or a parent and its child light up together. */
  export const findDockItem = (items: readonly DockItem[], path: string): DockItem | undefined =>
    items
      .filter((item) => covers(item, path))
      .reduce<
        DockItem | undefined
      >((best, item) => (best && (best.to?.length ?? 0) >= (item.to?.length ?? 0) ? best : item), undefined);

  export const isVisibleTo = (item: DockItem, role: string | null): boolean => {
    if (!item.roles) return true;
    return role !== null && item.roles.includes(role);
  };

  /** Key for the `v-for`. Action items have no route to key off. */
  export const dockItemKey = (item: DockItem): string => item.to ?? `action:${item.label}`;
</script>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue';
  import { useRoute, RouterLink } from 'vue-router';
  import { useMediaQuery } from '@vueuse/core';
  import AppIcon from './AppIcon.vue';
  import {
    useDockPosition,
    createDockPosition,
    DOCK_POSITIONS,
  } from '@/composables/useDockPosition';
  import { useDockDrag } from '@/composables/useDockDrag';
  import { useDockFlight } from '@/composables/useDockFlight';

  // Two root nodes (the dock and its landing preview), so attribute fallthrough
  // has nowhere unambiguous to land.
  defineOptions({ inheritAttrs: false });

  const props = withDefaults(
    defineProps<{
      /** Flat, or grouped into sections that render with a separator between them. */
      items: readonly DockItem[] | readonly DockSection[];
      /** Filters items carrying `roles`. Leave null when the app has no roles. */
      role?: string | null;
      /** Accessible name for the `<nav>`. */
      ariaLabel?: string;
      /**
       * `'viewport'` pins the dock to the screen with `position: fixed`, shares
       * its edge with the page layout, and persists it — one per storage key.
       *
       * `'container'` pins it to the nearest positioned ancestor with
       * `position: absolute` instead, measures the drag edges against that box,
       * and keeps its edge to itself so several can coexist. Give the container
       * `position: relative` and `overflow: hidden`. Read once at setup.
       */
      scope?: 'viewport' | 'container';
      /** Optional `v-model:position`. Leave it off and the dock owns its edge. */
      position?: DockPosition;
      /**
       * Edges the dock may occupy. Narrow it to pin the dock down — a single
       * edge also hides the grip, since there is nowhere to move it to.
       */
      edges?: readonly DockPosition[];
      /** Tile scale. */
      size?: DockSize;
      /** `localStorage` key for a viewport dock's edge. Ignored when contained. */
      storageKey?: string;
      /** Hover lift, in rem. `0` disables it. Neighbours get a third of it. */
      lift?: number;
    }>(),
    {
      role: null,
      ariaLabel: 'Main',
      scope: 'viewport',
      size: 'md',
      storageKey: 'app-dock-position',
      lift: 0.375,
    },
  );

  const emit = defineEmits<{ 'update:position': [value: DockPosition] }>();

  defineSlots<{
    /** Replaces a tile's icon. */
    icon?: (props: { item: DockItem; active: boolean; index: number }) => unknown;
    /** Extra content pinned inside the pill, before the tile strip. */
    leading?: () => unknown;
    /** Extra content pinned inside the pill, after the tile strip. */
    trailing?: () => unknown;
  }>();

  const route = useRoute();

  // Read once: a dock does not change what it is pinned to at runtime.
  const contained = props.scope === 'container';

  const positionApi = contained ? createDockPosition() : useDockPosition(props.storageKey);
  const { dockPosition } = positionApi;

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const hasFinePointer = useMediaQuery('(pointer: fine)');
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const barRef = ref<HTMLElement | null>(null);
  const rootRef = ref<HTMLElement | null>(null);

  /**
   * The box the drag measures edges against. For a contained dock that is its
   * own containing block — the offsetParent of an absolutely-positioned element
   * is exactly the ancestor its `inset` resolves against, so the two can never
   * disagree about where the edges are.
   */
  const boundsRef = computed(() => (rootRef.value?.offsetParent as HTMLElement | null) ?? null);

  const allowedEdges = computed<readonly DockPosition[]>(() => {
    const edges = props.edges?.filter((e) => DOCK_POSITIONS.includes(e)) ?? DOCK_POSITIONS;
    return edges.length > 0 ? edges : DOCK_POSITIONS;
  });

  const {
    isDragging,
    previewPosition,
    dragStyle,
    takeLiftScale,
    onGripPointerdown,
    onGripPointermove,
    onGripPointerup,
    onGripPointercancel,
    onGripClick,
  } = useDockDrag(barRef, {
    edges: allowedEdges.value,
    ...(contained ? { position: positionApi, bounds: boundsRef, local: true } : {}),
  });

  /**
   * Below md a viewport dock is being judged against a phone, where a floating
   * side rail eats the screen — so it goes to the bottom whatever is stored. A
   * contained dock is as wide as its box, not the device, so it is left alone.
   */
  const position = computed<DockPosition>(() => {
    const edges = allowedEdges.value;
    const wanted = isDesktop.value || contained ? dockPosition.value : 'bottom';
    return edges.includes(wanted) ? wanted : edges[0];
  });

  /** The grip only earns its space when there is somewhere else to go. */
  const showGrip = computed(() => (isDesktop.value || contained) && allowedEdges.value.length > 1);

  // `v-model:position` is a mirror, not a second source of truth: the dock still
  // owns the edge, and a bound value is pushed in and echoed back out. Writing it
  // this way means an unbound dock behaves exactly as it did before.
  watch(
    () => props.position,
    (value) => {
      if (value && value !== dockPosition.value) positionApi.setDockPosition(value);
    },
    { immediate: true },
  );

  watch(dockPosition, (value) => emit('update:position', value), { immediate: true });

  useDockFlight(barRef, position, takeLiftScale);

  const hoveredIndex = ref<number | null>(null);

  const tileRem = computed(() => TILE_REM[props.size]);
  const iconRem = computed(() => ICON_REM[props.size]);

  /** The grip matches the tile on the dock's long axis so the two line up. */
  const gripStyle = computed(() =>
    position.value === 'left' || position.value === 'right'
      ? { width: `${tileRem.value}rem` }
      : { height: `${tileRem.value}rem` },
  );

  const tileStyle = computed(() => ({
    width: `${tileRem.value}rem`,
    height: `${tileRem.value}rem`,
  }));

  const sections = computed<readonly DockSection[]>(() => {
    // `items` is required in the type, so omitting it is a compile error. This
    // guard is for the runtime: a dock rendered before its config resolves —
    // or by a harness that mounts components with no props — should render
    // nothing rather than throw out of a computed and take the page with it.
    const items = props.items ?? [];
    if (items.length === 0) return [];
    return 'items' in items[0]
      ? (items as readonly DockSection[])
      : [{ items: items as readonly DockItem[] }];
  });

  const dockItems = computed(() =>
    sections.value.flatMap((section, sectionIndex) =>
      section.items
        .filter((item) => isVisibleTo(item, props.role))
        .map((item, itemIndex) => ({
          item,
          startsSection: sectionIndex > 0 && itemIndex === 0,
        })),
    ),
  );

  const activeItem = computed(() =>
    findDockItem(
      dockItems.value.map((entry) => entry.item),
      route.path,
    ),
  );

  const isActive = (item: DockItem): boolean => activeItem.value === item;

  const hueOf = (item: DockItem): DockHue => item.hue ?? 'primary';

  const badgeOf = (item: DockItem): string | null => {
    const badge = item.badge;
    if (badge === undefined || badge === null || badge === 0 || badge === '') return null;
    return typeof badge === 'number' && badge > 99 ? '99+' : String(badge);
  };

  const onTileClick = (item: DockItem, event: MouseEvent): void => {
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    item.onClick?.(item);
  };

  /**
   * Hover response: the tile rises off the dock's resting edge and its immediate
   * neighbours follow a little, in rem. Nothing is scaled — a tile that grows has
   * to resize its slot, which shoves the rest of the row around and reads as loud
   * at any amplitude worth seeing. A lift stays entirely within the tile's own
   * footprint, so the dock never reflows.
   */
  function hoverNudge(index: number): number {
    if (
      props.lift <= 0 ||
      hoveredIndex.value === null ||
      prefersReducedMotion.value ||
      !hasFinePointer.value ||
      isDragging.value
    )
      return 0;
    const distance = Math.abs(index - hoveredIndex.value);
    if (distance === 0) return props.lift;
    if (distance === 1) return props.lift / 3;
    return 0;
  }

  /** Away from the screen edge, so the direction flips with orientation. */
  function tileTransform(index: number): string {
    const nudge = hoverNudge(index);
    if (nudge === 0) return 'none';
    if (position.value === 'bottom') return `translateY(-${nudge}rem)`;
    if (position.value === 'top') return `translateY(${nudge}rem)`;
    return position.value === 'left' ? `translateX(${nudge}rem)` : `translateX(-${nudge}rem)`;
  }
</script>

<template>
  <!-- Inline overflow beats the scroll utility by specificity: a lifted bar must
       be free to leave this box entirely. -->
  <div
    v-if="dockItems.length > 0"
    ref="rootRef"
    class="dock-root pointer-events-none z-40"
    :class="[contained ? 'absolute' : 'fixed', DOCK_VIEWPORT[position]]"
    :style="isDragging ? { overflow: 'visible' } : undefined"
  >
    <nav
      ref="barRef"
      class="dock-pill pointer-events-auto flex gap-1 rounded-3xl p-2"
      :class="[DOCK_BAR[position], isDragging ? 'dock-lifted' : 'transition-shadow duration-200']"
      :aria-label="ariaLabel"
      :style="dragStyle"
      @mouseleave="hoveredIndex = null"
    >
      <button
        v-if="showGrip"
        type="button"
        class="dock-grip dock-focus flex shrink-0 touch-none items-center justify-center rounded-2xl transition-colors"
        :class="[
          DOCK_GRIP[position],
          isDragging ? 'dock-grip-held cursor-grabbing' : 'cursor-grab',
        ]"
        :style="gripStyle"
        :aria-label="`Move dock — currently ${position}. Drag to an edge, or click to cycle.`"
        @pointerdown="onGripPointerdown"
        @pointermove="onGripPointermove"
        @pointerup="onGripPointerup"
        @pointercancel="onGripPointercancel"
        @click="onGripClick"
      >
        <span
          class="dock-grip-bar rounded-full transition-colors"
          :class="DOCK_GRIP_BAR[position]"
          aria-hidden="true"
        />
      </button>

      <span
        v-if="showGrip"
        class="dock-line shrink-0 self-center"
        :class="DOCK_SEPARATOR[position]"
        aria-hidden="true"
      />

      <div v-if="$slots.leading" class="pointer-events-auto flex shrink-0 items-center">
        <slot name="leading" />
      </div>

      <div class="dock-scroller pointer-events-none flex gap-1" :class="DOCK_SCROLLER[position]">
        <template v-for="(entry, index) in dockItems" :key="dockItemKey(entry.item)">
          <span
            v-if="entry.startsSection"
            class="dock-line shrink-0 self-center"
            :class="DOCK_SEPARATOR[position]"
            aria-hidden="true"
          />

          <div
            class="group pointer-events-auto relative flex shrink-0"
            :class="DOCK_SLOT[position]"
            @mouseenter="hoveredIndex = index"
          >
            <span
              class="dock-label pointer-events-none absolute z-10 max-w-32 truncate rounded-lg px-2 py-1 text-xs font-medium opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
              :class="DOCK_LABEL[position]"
            >
              {{ entry.item.label }}
            </span>

            <component
              :is="entry.item.to ? RouterLink : 'button'"
              v-bind="entry.item.to ? { to: entry.item.to } : { type: 'button' }"
              :aria-current="isActive(entry.item) ? 'page' : undefined"
              :aria-label="entry.item.label"
              :aria-disabled="entry.item.disabled ? 'true' : undefined"
              :tabindex="entry.item.disabled ? -1 : undefined"
              class="dock-focus flex items-center justify-center rounded-2xl transition-[transform,background-color,color] duration-200 ease-out"
              :class="[
                isActive(entry.item)
                  ? HUE_ACTIVE[hueOf(entry.item)]
                  : `dock-tile-idle ${HUE_ICON[hueOf(entry.item)]}`,
                entry.item.disabled && 'dock-tile-disabled',
              ]"
              :style="{ ...tileStyle, transform: tileTransform(index) }"
              @click="onTileClick(entry.item, $event)"
            >
              <slot name="icon" :item="entry.item" :active="isActive(entry.item)" :index="index">
                <AppIcon :name="entry.item.icon" :size="iconRem" />
              </slot>
            </component>

            <span
              v-if="badgeOf(entry.item)"
              class="dock-badge pointer-events-none absolute -top-0.5 -right-0.5 z-10 flex min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-4 font-semibold"
            >
              {{ badgeOf(entry.item) }}
            </span>

            <span
              v-if="isActive(entry.item)"
              class="absolute size-1 rounded-full"
              :class="[DOCK_RUNNING_DOT[position], HUE_DOT[hueOf(entry.item)]]"
              aria-hidden="true"
            />
          </div>
        </template>
      </div>

      <div v-if="$slots.trailing" class="pointer-events-auto flex shrink-0 items-center">
        <slot name="trailing" />
      </div>
    </nav>
  </div>

  <!-- Landing preview: the real dock, faded, already wearing the orientation it
       will take. Together with the page reflowing behind it, the whole move is
       visible before the pointer is released. -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isDragging && previewPosition"
      class="dock-root pointer-events-none z-30"
      :class="[contained ? 'absolute' : 'fixed', DOCK_VIEWPORT[previewPosition]]"
      aria-hidden="true"
    >
      <div
        class="dock-pill dock-ghost flex gap-1 rounded-3xl p-2 opacity-50"
        :class="DOCK_BAR[previewPosition]"
      >
        <span
          class="dock-tile-idle shrink-0 rounded-2xl"
          :class="DOCK_GRIP[previewPosition]"
          :style="
            previewPosition === 'left' || previewPosition === 'right'
              ? { width: `${tileRem}rem` }
              : { height: `${tileRem}rem` }
          "
        />
        <span class="dock-line shrink-0 self-center" :class="DOCK_SEPARATOR[previewPosition]" />

        <div class="dock-scroller flex gap-1" :class="DOCK_SCROLLER[previewPosition]">
          <template v-for="entry in dockItems" :key="dockItemKey(entry.item)">
            <span
              v-if="entry.startsSection"
              class="dock-line shrink-0 self-center"
              :class="DOCK_SEPARATOR[previewPosition]"
            />
            <span
              class="flex shrink-0 items-center justify-center rounded-2xl"
              :class="
                isActive(entry.item)
                  ? HUE_ACTIVE[hueOf(entry.item)]
                  : `dock-tile-idle ${HUE_ICON[hueOf(entry.item)]}`
              "
              :style="tileStyle"
            >
              <AppIcon :name="entry.item.icon" :size="iconRem" />
            </span>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
  /*
   * The dock's own chrome, kept here rather than in the app's token file so the
   * component stays a single fetchable file. It is deliberately dark in both
   * themes: the pill floats over the page as a piece of system furniture rather
   * than a surface belonging to it. The tiles are the part that follows the
   * theme, through the `--color-*` tokens the hue maps reference.
   *
   * Every value is a custom property, so an app that wants a different dock can
   * override them from a parent rather than editing this block.
   */
  .dock-root {
    --dock-chrome: #12151c;
    --dock-ink: #e8ecf3;
    --dock-muted: #99a2b3;
    --dock-line: #262c37;
    --dock-accent: #3fd3b6;
    --dock-badge: #e5484d;
    --dock-badge-ink: #ffffff;
    --dock-glass: rgb(18 21 28 / 0.9);
    --dock-glass-line: rgb(232 236 243 / 0.12);
    --dock-shadow: rgb(23 26 33 / 0.28);
  }

  .dock-pill {
    background-color: var(--dock-glass);
    border: 0.0625rem solid var(--dock-glass-line);
    backdrop-filter: blur(1.5rem) saturate(1.5);
    -webkit-backdrop-filter: blur(1.5rem) saturate(1.5);
    box-shadow:
      inset 0 0.0625rem 0 0 var(--dock-glass-line),
      0 0.375rem 1rem -0.5rem var(--dock-shadow),
      0 1.5rem 3rem -1rem var(--dock-shadow);
  }

  .dock-lifted {
    box-shadow: 0 2rem 4rem -1rem var(--dock-shadow);
    outline: 0.125rem solid var(--dock-accent);
    outline-offset: -0.0625rem;
  }

  .dock-ghost {
    outline: 0.0625rem solid color-mix(in srgb, var(--dock-accent) 40%, transparent);
    outline-offset: -0.0625rem;
  }

  .dock-label {
    background-color: var(--dock-glass);
    border: 0.0625rem solid var(--dock-glass-line);
    color: var(--dock-ink);
    backdrop-filter: blur(1.25rem) saturate(1.7);
    -webkit-backdrop-filter: blur(1.25rem) saturate(1.7);
    box-shadow:
      inset 0 0.0625rem 0 0 var(--dock-glass-line),
      0 0.25rem 0.75rem -0.25rem var(--dock-shadow);
  }

  .dock-line {
    background-color: var(--dock-line);
  }

  .dock-grip-bar {
    background-color: var(--dock-line);
  }

  .dock-grip:hover {
    background-color: rgb(232 236 243 / 0.1);
  }

  .dock-grip:hover .dock-grip-bar {
    background-color: var(--dock-muted);
  }

  .dock-grip-held,
  .dock-grip-held:hover {
    background-color: rgb(232 236 243 / 0.1);
  }

  .dock-grip-held .dock-grip-bar {
    background-color: var(--dock-accent);
  }

  .dock-tile-idle {
    background-color: rgb(232 236 243 / 0.05);
  }

  a.dock-tile-idle:hover,
  button.dock-tile-idle:hover {
    background-color: rgb(232 236 243 / 0.1);
  }

  .dock-tile-disabled {
    pointer-events: none;
    opacity: 0.4;
  }

  .dock-badge {
    background-color: var(--dock-badge);
    color: var(--dock-badge-ink);
    box-shadow: 0 0 0 0.125rem var(--dock-chrome);
  }

  /* Ring drawn against the pill, not the page behind it. */
  .dock-focus:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 0.125rem var(--dock-chrome),
      0 0 0 0.25rem var(--dock-accent);
  }

  /*
   * The scrollbar is hidden for the same reason it would look wrong: it would be
   * drawn against the transparent overhang, not the pill. Wheel, touch and
   * keyboard scrolling are unaffected, and tabbing to an off-screen tile still
   * scrolls it into view.
   */
  .dock-scroller {
    scrollbar-width: none;
  }

  .dock-scroller::-webkit-scrollbar {
    display: none;
  }

  /* Opaque fallbacks — this is the accessibility story, keep them. */
  @supports not ((backdrop-filter: blur(0.0625rem)) or (-webkit-backdrop-filter: blur(0.0625rem))) {
    .dock-pill,
    .dock-label {
      background-color: var(--dock-chrome);
    }
  }

  @media (prefers-reduced-transparency: reduce) {
    .dock-pill,
    .dock-label {
      background-color: var(--dock-chrome);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  }
</style>

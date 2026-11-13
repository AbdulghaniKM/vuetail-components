<template>
  <div
    ref="triggerEl"
    class="group relative inline-flex"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focusin="onEnter"
    @focusout="onLeave"
  >
    <slot />
    <!--
      The tip lives on <body>, placed with fixed coordinates from the trigger's box. Inside the
      trigger it took the trigger's width as its own limit (one word per line under an icon button),
      was clipped by any overflow-hidden card or table, and could not flip at the viewport's edge.
    -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-[opacity,scale] duration-(--vt-duration-enter) ease-standard"
        :enter-from-class="warmEntry ? 'opacity-0' : 'opacity-0 scale-95 motion-reduce:scale-100'"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-[opacity,scale] duration-(--vt-duration-exit) ease-exit"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95 motion-reduce:scale-100"
      >
        <span
          v-if="content && show"
          :id="tipId"
          ref="tipEl"
          role="tooltip"
          class="fixed top-0 left-0 isolate z-[9990] w-max max-w-[min(20rem,calc(100vw-1rem))] px-2.5 py-1.5 text-xs leading-snug font-medium break-words whitespace-normal"
          :class="[dark ? 'text-bg' : 'text-text', ORIGIN[side]]"
          :style="{ translate: `${pos.x}px ${pos.y}px` }"
          @mouseenter="cancelHide"
          @mouseleave="onLeave"
        >
          <!-- The bubble and its nub are one AppBlob behind the text: the nub grows out of the
               side facing the trigger and fuses with the bubble through the goo, instead of a
               rotated square laid against it. Flat, with an edge on the light tip (bible §5). -->
          <AppBlob
            class="pointer-events-none absolute -z-10"
            :style="{ left: `${-PAD}px`, top: `${-PAD}px` }"
            :width="size.w + PAD * 2"
            :height="size.h + PAD * 2"
            :shapes="tipShapes"
            :fill="dark ? 'var(--color-text)' : 'var(--color-surface-raised)'"
            :edge="dark ? undefined : 'var(--color-border-strong)'"
            :radius="tipBlob.roundness.value"
            :blur="tipBlob.blur.value"
            :transition="tipBlob.quick()"
          />
          {{ content }}
        </span>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts">
  /*
   * The tooltip group, shared by every AppTooltip on the page (module scope, not per instance).
   * While one tooltip is open, and for `skipDelay` ms after the last one is left, the group is
   * "warm": the next tooltip opens at once instead of waiting out its delay, so a pointer sweeping
   * along a toolbar reads each label without a pause (Radix's skipDelayDuration). Only one tip
   * shows at a time: opening one closes the one before at once.
   */
  let openCount = 0;
  let warmUntil = 0;
  let closeCurrent: (() => void) | null = null;

  const isWarm = () => openCount > 0 || Date.now() < warmUntil;
</script>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from 'vue';
  import AppBlob, { type BlobShape } from './AppBlob.vue';
  import { useBlob } from '@/composables/useBlob';
  import { useBreakpoint } from '@/composables/useBreakpoint';

  type Side = 'top' | 'bottom' | 'left' | 'right';

  interface Props {
    content?: string;
    /** Preferred side. `start` / `end` follow the writing direction. It flips when there is no room. */
    placement?: 'top' | 'bottom' | 'start' | 'end';
    /** The inverse fill (the page's text colour). Off: a raised surface with a border. */
    dark?: boolean;
    /** Ms the pointer or focus rests before a cold tooltip opens. */
    delay?: number;
    /** Ms after this tooltip is left in which any other opens without its delay. 0 opts out. */
    skipDelay?: number;
    disableOnMobile?: boolean;
  }

  const props = withDefaults(defineProps<Props>(), {
    content: '',
    placement: 'top',
    dark: true,
    delay: 200,
    skipDelay: 300,
    disableOnMobile: false,
  });

  // Gap between trigger and tip, and the least room kept to the viewport's edge.
  const GAP = 8;
  const EDGE = 8;
  // Moving from the trigger onto the tip (WCAG 1.4.13: hoverable) crosses the gap; this long.
  const HIDE_GRACE = 100;

  const { isMobile } = useBreakpoint();
  const show = ref(false);
  const warmEntry = ref(false);
  const tipId = useId();
  const triggerEl = ref<HTMLElement | null>(null);
  const tipEl = ref<HTMLElement | null>(null);
  const side = ref<Side>('top');
  const pos = reactive({ x: 0, y: 0, arrow: 0 });

  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  // True from a leave until the tip is gone (or the pointer comes back): the group counts it closed.
  let leaving = false;
  // Whether this tip counts toward the group. Only one the reader rested for (it waited out a real
  // delay, or opened in a group already warm) does: a delay-0 tip opening says nothing about
  // intent, and letting it warm the group skipped a neighbour's long delay (Instant → Slow).
  let warms = false;

  const clearOpen = () => {
    if (openTimer) clearTimeout(openTimer);
    openTimer = null;
  };
  const clearHide = () => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
  };

  function open(warming: boolean) {
    if (closeCurrent && closeCurrent !== hideNow) closeCurrent();
    closeCurrent = hideNow;
    warms = warming;
    if (warms) openCount++;
    show.value = true;
  }

  function hideNow() {
    clearOpen();
    clearHide();
    if (show.value && !leaving && warms) openCount = Math.max(0, openCount - 1);
    leaving = false;
    show.value = false;
    if (closeCurrent === hideNow) closeCurrent = null;
  }

  function onEnter() {
    if (props.disableOnMobile && isMobile.value) return;
    if (show.value) {
      cancelHide();
      return;
    }
    if (openTimer) return;
    if (isWarm() || props.delay <= 0) {
      warmEntry.value = isWarm();
      open(warmEntry.value);
      return;
    }
    warmEntry.value = false;
    openTimer = setTimeout(() => {
      openTimer = null;
      open(true);
    }, props.delay);
  }

  function onLeave(event?: Event) {
    // Focus moving inside the trigger is not a leave.
    if (event instanceof FocusEvent && triggerEl.value?.contains(event.relatedTarget as Node | null)) return;
    clearOpen();
    if (!show.value || leaving) return;
    // The group sees the leave now; the tip itself waits a moment in case the pointer is heading onto it.
    leaving = true;
    if (warms) {
      openCount = Math.max(0, openCount - 1);
      if (props.skipDelay > 0) warmUntil = Math.max(warmUntil, Date.now() + props.skipDelay);
    }
    hideTimer = setTimeout(hideNow, HIDE_GRACE);
  }

  function cancelHide() {
    if (!leaving) return;
    clearHide();
    leaving = false;
    if (warms) openCount++;
  }

  /* ----------------------------- Placement ----------------------------- */

  const isRtl = () => !!triggerEl.value && getComputedStyle(triggerEl.value).direction === 'rtl';
  const preferred = (): Side => {
    if (props.placement === 'start') return isRtl() ? 'right' : 'left';
    if (props.placement === 'end') return isRtl() ? 'left' : 'right';
    return props.placement;
  };
  const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

  function place() {
    const trigger = triggerEl.value;
    const tip = tipEl.value;
    if (!trigger || !tip) return;
    const t = trigger.getBoundingClientRect();
    // offset sizes ignore the entrance scale, so the first measure is the settled size.
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    size.w = w;
    size.h = h;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const room: Record<Side, number> = { top: t.top, bottom: vh - t.bottom, left: t.left, right: vw - t.right };
    const need = (s: Side) => (s === 'top' || s === 'bottom' ? h : w) + GAP + EDGE;

    let s = preferred();
    if (room[s] < need(s) && room[OPPOSITE[s]] > room[s]) s = OPPOSITE[s];
    side.value = s;

    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));
    let x: number;
    let y: number;
    if (s === 'top' || s === 'bottom') {
      x = clamp(t.left + t.width / 2 - w / 2, EDGE, vw - w - EDGE);
      y = s === 'top' ? t.top - GAP - h : t.bottom + GAP;
      pos.arrow = clamp(t.left + t.width / 2 - x, 10, w - 10);
    } else {
      x = s === 'left' ? t.left - GAP - w : t.right + GAP;
      y = clamp(t.top + t.height / 2 - h / 2, EDGE, vh - h - EDGE);
      pos.arrow = clamp(t.top + t.height / 2 - y, 10, h - 10);
    }
    pos.x = Math.round(x);
    pos.y = Math.round(y);
  }

  const onKeydown = (e: KeyboardEvent) => {
    // WCAG 1.4.13: dismissable without moving the pointer or focus.
    if (e.key === 'Escape') hideNow();
  };

  const listen = (on: boolean) => {
    const method = on ? 'addEventListener' : 'removeEventListener';
    window[method]('scroll', place, { capture: true, passive: true } as AddEventListenerOptions);
    window[method]('resize', place);
    document[method]('keydown', onKeydown as EventListener);
  };

  // The description goes on the control itself (the button or link inside), not on the wrapper:
  // a screen reader reads aria-describedby from the focused element.
  const describedTarget = () =>
    triggerEl.value?.querySelector<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? triggerEl.value;

  watch(show, async (visible) => {
    const target = describedTarget();
    if (visible && props.content) {
      target?.setAttribute('aria-describedby', tipId);
      listen(true);
      await nextTick();
      place();
      // One frame with the nub folded into the bubble, then it grows toward the trigger.
      nubOut.value = false;
      requestAnimationFrame(() => requestAnimationFrame(() => (nubOut.value = show.value)));
    } else {
      nubOut.value = false;
      if (target?.getAttribute('aria-describedby') === tipId) target.removeAttribute('aria-describedby');
      listen(false);
    }
  });
  watch(() => props.content, () => show.value && nextTick(place));

  onBeforeUnmount(() => {
    if (show.value) hideNow();
    clearOpen();
    clearHide();
    listen(false);
  });

  /* ------------------------------- Look -------------------------------- */

  // The canvas reaches PAD past the bubble on every side, room for the nub and the goo's blur.
  const PAD = 10;
  // How far the nub stands out of the bubble, and its width; GAP leaves 2px to the trigger.
  const NUB_OUT = 6;
  const NUB_W = 10;
  // How far the nub overlaps the bubble.
  const IN = 5;
  const tipBlob = useBlob({ radius: '--radius-md', minBlur: 3 });
  const size = reactive({ w: 0, h: 0 });
  const nubOut = ref(false);

  const tipShapes = computed<BlobShape[]>(() => {
    const { w, h } = size;
    if (!w || !h) return [];
    const bubble: BlobShape = { key: 'bubble', x: PAD, y: PAD, width: w, height: h };
    const at = pos.arrow;
    const out = nubOut.value ? NUB_OUT : 0;
    // The nub reaches INTO the bubble and grows out of its edge, so it reads as growing and so
    // the light tip's fill layer (1px inside the edge layer) still overlaps the bubble's fill:
    // a nub that only touched the edge filled with the border colour.
    const across = PAD + at - NUB_W / 2;
    const long = IN + out;
    const r = NUB_W / 2;
    const nub: Record<Side, BlobShape> = {
      top: { key: 'nub', x: across, y: PAD + h - IN, width: NUB_W, height: long, radius: r },
      bottom: { key: 'nub', x: across, y: PAD - out, width: NUB_W, height: long, radius: r },
      left: { key: 'nub', x: PAD + w - IN, y: across, width: long, height: NUB_W, radius: r },
      right: { key: 'nub', x: PAD - out, y: across, width: long, height: NUB_W, radius: r },
    };
    return [bubble, nub[side.value]];
  });

  // The tip grows out of the side that faces the trigger.
  const ORIGIN: Record<Side, string> = {
    top: 'origin-bottom',
    bottom: 'origin-top',
    left: 'origin-right',
    right: 'origin-left',
  };
</script>

<script lang="ts">
  /**
   * A floating nav capsule that contracts past the hero.
   *
   * ## Why it floats
   *
   * A full-width bar with a hairline under it, pinned to the top of the viewport,
   * reads as a lid over whatever is behind it: if the page opens on an image, a
   * rule straight across the top of it cuts the frame in half. Hiding the bar
   * until you scrolled treats the symptom and costs the site its navigation on
   * first paint, which is the worse trade. Inset on all sides instead — the
   * graphic runs full bleed underneath and past it, and the bar reads as an
   * object sitting on the page rather than a frame around it. `floating: false`
   * is there for apps that want the flush bar anyway.
   *
   * ## Why it contracts
   *
   * Over the hero it is the width of the content column, so it belongs to the
   * composition. Once the hero is behind you it is just navigation, so it pulls
   * in and darkens. It never disappears.
   *
   * This block is plain `<script>` on purpose: the class maps must be literal
   * strings in a file Tailwind scans, and they must be built once per module
   * rather than once per instance.
   */

  export type NavWidth = 'sm' | 'md' | 'lg' | 'xl' | 'full';
  export type NavTone = 'dark' | 'surface';
  export type NavPosition = 'top' | 'bottom';

  export interface NavItem {
    label: string;
    /** RouterLink target. Also the key, so it must be unique. */
    to: string;
    /** Match this route exactly instead of covering everything beneath it. */
    exact?: boolean;
    disabled?: boolean;
  }

  export interface NavAction {
    label: string;
    /**
     * Iconify name. Use the `icon-[ph--translate]` form, not `ph:translate` —
     * Tailwind's iconify plugin only emits a class it can find spelled out in
     * scanned source, and the colon form never matches because `AppIcon`
     * converts it at runtime, long after Tailwind has run.
     */
    icon?: string;
    /** Renders a RouterLink. Omit and pass `onClick` for a button. */
    to?: string;
    onClick?: (action: NavAction) => void;
    /**
     * `'solid'` is the bar's one filled element. A header with a focal point
     * reads as designed; a row of evenly weighted links reads as a list — so use
     * it for a single call to action, not for every button.
     */
    variant?: 'ghost' | 'solid';
    exact?: boolean;
    /** Keep this label open when the bar contracts. */
    keepLabel?: boolean;
  }

  export const NAV_WIDTH: Record<NavWidth, string> = {
    sm: 'max-w-xl',
    md: 'max-w-3xl',
    lg: 'max-w-5xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  };

  /** Where the bar sits, floating or flush. */
  export const NAV_ANCHOR: Record<NavPosition, { floating: string; flush: string }> = {
    top: { floating: 'top-3 sm:top-4', flush: 'top-0' },
    bottom: { floating: 'bottom-3 sm:bottom-4', flush: 'bottom-0' },
  };

  /** Breakpoint at which the full nav replaces the menu button. */
  export const NAV_DESKTOP: Record<'md' | 'lg' | 'xl', { show: string; hide: string }> = {
    md: { show: 'md:flex', hide: 'md:hidden' },
    lg: { show: 'lg:flex', hide: 'lg:hidden' },
    xl: { show: 'xl:flex', hide: 'xl:hidden' },
  };

  /**
   * Entries nest (`/projects` and `/projects/atlas`), and a path under a nested
   * one is covered by both. Matching on a `/` boundary rather than a bare prefix
   * is what stops `/projects-archive` being read as `/projects`.
   */
  export const isNavActive = (item: { to?: string; exact?: boolean }, path: string): boolean => {
    if (!item.to) return false;
    if (item.exact || item.to === '/') return path === item.to;
    return path === item.to || path.startsWith(`${item.to}/`);
  };
</script>

<script setup lang="ts">
  import { ref, computed, watch, onMounted, onUnmounted, useId } from 'vue';
  import { useRoute, RouterLink } from 'vue-router';
  import { motion } from 'motion-v';
  import AppIcon from './AppIcon.vue';
  import { useReducedMotion } from '@/composables/useReducedMotion';

  const props = withDefaults(
    defineProps<{
      /** The centred nav links. */
      items?: readonly NavItem[];
      /** Trailing actions — a call to action, a theme toggle, a language switch. */
      actions?: readonly NavAction[];
      /** `'dark'` is a self-contained capsule that reads over any surface. */
      tone?: NavTone;
      /** Floating capsule, or a flush full-width bar. */
      floating?: boolean;
      position?: NavPosition;
      /** Measure at rest. */
      width?: NavWidth;
      /** Measure once contracted. */
      compactWidth?: NavWidth;
      /** Set false to pin the bar at its resting size. */
      contract?: boolean;
      /**
       * Scroll offset, in px, at which the bar contracts. Defaults to 80% of the
       * scroll container's height — a hero is usually exactly one screen tall.
       */
      contractAt?: number;
      /**
       * Element the bar measures its scroll against. Defaults to the window.
       * Pass a scroller when the page scrolls inside an app shell rather than
       * the document, or the bar will never know it has passed the hero.
       */
      scrollTarget?: HTMLElement | null;
      /** The travelling pill that rests on the current page. */
      pill?: boolean;
      /** Breakpoint at which the full nav replaces the menu button. */
      breakpoint?: 'md' | 'lg' | 'xl';
      /** Blur behind the capsule. Turn it off if the paint cost shows. */
      blur?: boolean;
      ariaLabel?: string;
    }>(),
    {
      items: () => [],
      actions: () => [],
      tone: 'dark',
      floating: true,
      position: 'top',
      width: 'xl',
      compactWidth: 'md',
      contract: true,
      pill: true,
      breakpoint: 'lg',
      blur: true,
      ariaLabel: 'Main',
    },
  );

  defineSlots<{
    /** The lockup. Receives `compact` so it can clip itself to a mark. */
    brand?: (props: { compact: boolean }) => unknown;
    /** Replaces the rendered `actions` entirely. */
    actions?: (props: { compact: boolean }) => unknown;
    /** Extra rows at the foot of the open menu panel. */
    menu?: (props: { close: () => void }) => unknown;
  }>();

  const route = useRoute();
  const reduced = useReducedMotion();

  // Unique per instance, so two navbars on a page do not animate one pill
  // between them.
  const pillId = `nav-pill-${useId()}`;

  const open = ref(false);
  const compact = ref(false);
  const hovered = ref<string | null>(null);

  /**
   * Measured against the viewport by default, because a hero is usually exactly
   * one viewport tall. Read inside rAF so a fast scroll cannot queue a state
   * write per scroll event.
   */
  let queued = false;

  /** Offset and viewport height of whatever the bar is measuring against. */
  const readScroll = () => {
    const el = props.scrollTarget;
    return el
      ? { offset: el.scrollTop, viewport: el.clientHeight }
      : { offset: window.scrollY, viewport: window.innerHeight };
  };

  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!props.contract) {
        compact.value = false;
        return;
      }
      const { offset, viewport } = readScroll();
      compact.value = offset > (props.contractAt ?? viewport * 0.8);
    });
  };

  let detach: (() => void) | null = null;

  const attach = () => {
    detach?.();
    const source: HTMLElement | Window = props.scrollTarget ?? window;
    source.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    detach = () => {
      source.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    onScroll();
  };

  onMounted(attach);
  // The target is usually a template ref, so it arrives null and fills in after
  // the parent mounts — rebind rather than listening to the wrong thing forever.
  watch(() => props.scrollTarget, attach);
  onUnmounted(() => detach?.());

  // A route change with the panel open would leave it covering the new page.
  watch(
    () => route.fullPath,
    () => (open.value = false),
  );

  const close = () => (open.value = false);

  const links = computed(() =>
    props.items.map((item) => ({ item, active: isNavActive(item, route.path) })),
  );

  const activeLink = computed(() => links.value.find((l) => l.active)?.item.to ?? null);

  // The pill rests on the current page and follows the pointer while it is over
  // the nav. One element that moves, rather than a background fading in and out
  // under each link in turn.
  const pillAt = computed(() => (props.pill ? (hovered.value ?? activeLink.value) : null));

  // Typed as a tuple, not an array: motion-v takes a four-point cubic bezier and
  // a widened `number[]` does not satisfy it.
  const EASE_STANDARD: [number, number, number, number] = [0.2, 0, 0, 1];

  const pillTransition = computed(() =>
    reduced.value ? { duration: 0 } : { duration: 0.28, ease: EASE_STANDARD },
  );

  const menuTransition = computed(() =>
    reduced.value ? { duration: 0 } : { duration: 0.25, ease: EASE_STANDARD },
  );

  const measure = computed(() => NAV_WIDTH[compact.value ? props.compactWidth : props.width]);
  const anchor = computed(() => NAV_ANCHOR[props.position][props.floating ? 'floating' : 'flush']);
  const desktop = computed(() => NAV_DESKTOP[props.breakpoint]);

  const actionKey = (action: NavAction) => action.to ?? `action:${action.label}`;

  const onActionClick = (action: NavAction, event: MouseEvent) => {
    if (!action.onClick) return;
    if (!action.to) event.preventDefault();
    action.onClick(action);
  };

  /** Rows in the open panel: the nav links, then any action that navigates. */
  const menuRows = computed(() => [
    ...links.value.map((l) => ({ label: l.item.label, to: l.item.to, active: l.active })),
    ...props.actions
      .filter((a) => a.to)
      .map((a) => ({ label: a.label, to: a.to as string, active: isNavActive(a, route.path) })),
  ]);

  defineExpose({ compact, open, close });
</script>

<template>
  <header
    :class="[
      'nav-root fixed inset-x-0 z-50 flex flex-col',
      anchor,
      floating ? 'px-5 sm:px-8' : '',
      position === 'bottom' ? 'flex-col-reverse' : '',
      tone === 'dark' ? 'nav-dark' : 'nav-surface',
    ]"
  >
    <div
      :class="[
        'nav-capsule mx-auto flex w-full items-center gap-2 border',
        blur ? 'backdrop-blur-xl' : '',
        floating ? ['rounded-full p-2', measure] : 'max-w-none border-x-0 px-5 py-2 sm:px-8',
        floating && position === 'bottom' ? '' : '',
        !floating && position === 'top' ? 'border-t-0' : '',
        !floating && position === 'bottom' ? 'border-b-0' : '',
        compact ? 'nav-capsule-compact' : '',
      ]"
    >
      <div v-if="$slots.brand" class="flex shrink-0 items-center">
        <slot name="brand" :compact="compact" />
      </div>

      <!-- Centred between the brand and the actions, so the bar has a middle
           instead of everything crowding one end. -->
      <nav :class="['hidden flex-1 justify-center', desktop.show]" :aria-label="ariaLabel">
        <ul class="flex items-center gap-1" @mouseleave="hovered = null">
          <li v-for="link in links" :key="link.item.to">
            <RouterLink
              :to="link.item.to"
              :aria-current="link.active ? 'page' : undefined"
              :aria-disabled="link.item.disabled ? 'true' : undefined"
              :tabindex="link.item.disabled ? -1 : undefined"
              :class="[
                'nav-link relative block rounded-full px-4 py-2 text-sm transition-colors',
                pillAt === link.item.to ? 'nav-link-on' : 'nav-link-off',
                link.item.disabled ? 'nav-disabled' : '',
              ]"
              @mouseenter="hovered = link.item.to"
              @focus="hovered = link.item.to"
              @blur="hovered = null"
            >
              <!-- `layout-id` is what makes it travel between items instead of
                   cross-fading. Motion animates the move with transforms, so
                   nothing here touches layout. -->
              <motion.span
                v-if="pillAt === link.item.to"
                :layout-id="pillId"
                class="nav-pill absolute inset-0 rounded-full"
                :transition="pillTransition"
                aria-hidden="true"
              />
              <span class="relative">{{ link.item.label }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>

      <div :class="['ms-auto flex shrink-0 items-center gap-1', desktop.show ? 'lg:ms-0' : '']">
        <slot name="actions" :compact="compact">
          <component
            :is="action.to ? RouterLink : 'button'"
            v-for="action in actions"
            :key="actionKey(action)"
            v-bind="action.to ? { to: action.to } : { type: 'button' }"
            :aria-current="action.to && isNavActive(action, route.path) ? 'page' : undefined"
            :aria-label="action.icon && !action.keepLabel ? action.label : undefined"
            :class="[
              'hidden items-center rounded-full px-4 py-2 text-sm transition-colors',
              desktop.show,
              action.variant === 'solid' ? 'nav-cta font-medium' : 'nav-ghost',
            ]"
            @click="onActionClick(action, $event)"
          >
            <AppIcon
              v-if="action.icon"
              :name="action.icon"
              :size="1"
              class="shrink-0"
              aria-hidden="true"
            />
            <!--
              Folds shut, but stays in the DOM — so the control keeps its
              accessible name once it is showing only an icon.

              The gap sits on the inner span, not this one. With
              `box-sizing: border-box` a padded box cannot be narrower than its
              own padding, so `max-w-0` on a `ps-2` span still measures 8px,
              which pushes the icon off centre by exactly that much. Padding on
              the child gets clipped by the parent instead.
            -->
            <span
              v-if="action.icon"
              :class="[
                'nav-collapse block overflow-hidden',
                compact && !action.keepLabel ? 'max-w-0 opacity-0' : 'max-w-32 opacity-100',
              ]"
            >
              <span class="block ps-2 whitespace-nowrap">{{ action.label }}</span>
            </span>
            <span v-else class="whitespace-nowrap">{{ action.label }}</span>
          </component>
        </slot>

        <button
          type="button"
          :aria-expanded="open"
          aria-controls="app-navbar-menu"
          :class="[
            'nav-ghost flex size-11 items-center justify-center rounded-full transition-colors',
            desktop.hide,
          ]"
          @click="open = !open"
        >
          <span class="sr-only">{{ open ? 'Close menu' : 'Open menu' }}</span>
          <AppIcon
            :name="open ? 'icon-[heroicons-outline--x]' : 'icon-[heroicons-outline--menu]'"
            :size="1.25"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>

    <!-- Its own capsule beside the bar. Animated on opacity and transform only,
         so opening it cannot reflow the page beneath. -->
    <motion.div
      id="app-navbar-menu"
      :initial="false"
      :animate="
        open
          ? { opacity: 1, y: 0, pointerEvents: 'auto' }
          : { opacity: 0, y: position === 'bottom' ? 8 : -8, pointerEvents: 'none' }
      "
      :transition="menuTransition"
      :class="[
        'nav-capsule mx-auto w-full rounded-xl border p-2',
        blur ? 'backdrop-blur-xl' : '',
        desktop.hide,
        position === 'bottom' ? 'mb-2' : 'mt-2',
        floating ? measure : 'max-w-none',
      ]"
      :aria-hidden="!open"
    >
      <ul class="flex flex-col gap-1">
        <li v-for="row in menuRows" :key="row.to">
          <RouterLink
            :to="row.to"
            :tabindex="open ? undefined : -1"
            :aria-current="row.active ? 'page' : undefined"
            :class="[
              'block rounded-lg px-4 py-3.5 text-sm transition-colors',
              row.active ? 'nav-row-on' : 'nav-row-off',
            ]"
          >
            {{ row.label }}
          </RouterLink>
        </li>

        <li
          v-for="action in actions.filter((a) => !a.to)"
          :key="actionKey(action)"
          class="contents"
        >
          <button
            type="button"
            :tabindex="open ? undefined : -1"
            class="nav-row-off block w-full rounded-lg px-4 py-3.5 text-start text-sm transition-colors"
            @click="onActionClick(action, $event)"
          >
            {{ action.label }}
          </button>
        </li>

        <li v-if="$slots.menu" class="nav-menu-divider mt-1 border-t pt-2">
          <slot name="menu" :close="close" />
        </li>
      </ul>
    </motion.div>
  </header>
</template>

<style scoped>
  /*
   * Two palettes, both as custom properties on the root, so an app that wants a
   * different bar overrides them from a parent rather than editing this block.
   *
   * `dark` is deliberately fixed in both themes. The bar crosses whatever the
   * page is made of — a hero image, the light body, a dark footer — and a bar
   * that restyles per surface has to know where it is. One dark capsule works
   * over all three, and it means a lockup inside it can stay on its dark artwork
   * everywhere instead of swapping mid-scroll.
   */
  .nav-dark {
    --nav-bg: rgb(10 21 18 / 0.85);
    --nav-bg-compact: rgb(10 21 18 / 0.94);
    --nav-border: rgb(38 44 55 / 0.7);
    --nav-border-compact: rgb(38 44 55 / 1);
    --nav-ink: #e8ecf3;
    --nav-ink-muted: #9aa4b2;
    --nav-pill: rgb(232 236 243 / 0.12);
    --nav-hover: rgb(232 236 243 / 0.08);
    --nav-shadow: rgb(8 12 20 / 0.35);
  }

  .nav-surface {
    --nav-bg: color-mix(in srgb, var(--color-surface) 85%, transparent);
    --nav-bg-compact: color-mix(in srgb, var(--color-surface) 96%, transparent);
    --nav-border: var(--color-border);
    --nav-border-compact: var(--color-border);
    --nav-ink: var(--color-text);
    --nav-ink-muted: var(--color-text-secondary, var(--color-text));
    --nav-pill: color-mix(in srgb, var(--color-primary) 16%, transparent);
    --nav-hover: color-mix(in srgb, var(--color-primary) 10%, transparent);
    --nav-shadow: rgb(0 0 0 / 0.1);
  }

  .nav-capsule {
    background-color: var(--nav-bg);
    border-color: var(--nav-border);
    color: var(--nav-ink);
    box-shadow: 0 0.5rem 1.5rem -0.5rem var(--nav-shadow);
    /* Measure, fill and shadow all move together, and only these — animating
       width would relayout the page under the bar on every scroll frame. */
    transition:
      max-width 320ms cubic-bezier(0.2, 0, 0, 1),
      background-color 320ms cubic-bezier(0.2, 0, 0, 1),
      border-color 320ms cubic-bezier(0.2, 0, 0, 1),
      box-shadow 320ms cubic-bezier(0.2, 0, 0, 1);
  }

  .nav-capsule-compact {
    background-color: var(--nav-bg-compact);
    border-color: var(--nav-border-compact);
    box-shadow: 0 1rem 2.5rem -0.75rem var(--nav-shadow);
  }

  /* The fold. Only these two properties, and never `display` or `width`, so the
     label keeps its box and its accessible name the whole way down. */
  .nav-collapse {
    transition:
      max-width 320ms cubic-bezier(0.2, 0, 0, 1),
      opacity 200ms cubic-bezier(0.2, 0, 0, 1);
  }

  .nav-link-off {
    color: var(--nav-ink-muted);
  }

  .nav-link-on {
    color: var(--nav-ink);
  }

  .nav-pill {
    background-color: var(--nav-pill);
  }

  .nav-ghost {
    color: var(--nav-ink-muted);
  }

  .nav-ghost:hover {
    background-color: var(--nav-hover);
    color: var(--nav-ink);
  }

  .nav-cta {
    background-color: var(--color-primary);
    color: var(--color-background, #fff);
    /* Hover brightens the fill and lays a ring outside it, so the button gains
       presence without changing size — buttons never scale here. */
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-primary) 30%, transparent);
    transition:
      background-color 200ms cubic-bezier(0.2, 0, 0, 1),
      box-shadow 200ms cubic-bezier(0.2, 0, 0, 1);
  }

  .nav-cta:hover {
    background-color: color-mix(in srgb, var(--color-primary) 88%, white);
    box-shadow: 0 0 0 0.25rem color-mix(in srgb, var(--color-primary) 30%, transparent);
  }

  .nav-row-off {
    color: var(--nav-ink-muted);
  }

  .nav-row-off:hover {
    background-color: var(--nav-hover);
    color: var(--nav-ink);
  }

  .nav-row-on {
    background-color: var(--nav-pill);
    color: var(--nav-ink);
  }

  .nav-menu-divider {
    border-color: var(--nav-border);
  }

  .nav-disabled {
    pointer-events: none;
    opacity: 0.45;
  }

  .nav-link:focus-visible,
  .nav-ghost:focus-visible,
  .nav-cta:focus-visible {
    outline: 0.125rem solid var(--color-primary);
    outline-offset: 0.125rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-capsule,
    .nav-collapse,
    .nav-cta {
      transition-duration: 0ms;
    }
  }
</style>

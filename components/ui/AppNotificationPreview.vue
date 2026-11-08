<template>
  <figure class="m-0 flex w-full flex-col gap-3">
    <!--
      The screen is a picture of a phone, not part of the app: its colours, radii and
      system font are the phone's, so it reads the same in every preset and theme.
    -->
    <div
      class="np-screen relative isolate flex flex-col overflow-hidden text-white"
      :class="[`np-${platform}`, `np-${appearance}`]"
      :style="wallpaper ? { '--np-wallpaper': wallpaper } : undefined"
      role="img"
      :aria-label="summary"
    >
      <div class="np-clock flex flex-col" :class="platform === 'ios' ? 'items-center' : 'items-start'" aria-hidden="true">
        <span class="np-date">{{ dateLabel }}</span>
        <span class="np-time">{{ timeLabel }}</span>
      </div>

      <div class="np-stack relative" aria-hidden="true">
        <!-- The cards behind say how many more are waiting; only the shape shows. -->
        <div v-for="n in stackDepth" :key="n" class="np-ghost" :style="{ '--np-depth': n }" />

        <div :key="arrivalKey" class="np-banner relative" :class="{ 'np-arrive': !reducedMotion }">
          <div class="np-app flex items-center gap-2">
            <span class="np-icon grid shrink-0 place-items-center overflow-hidden">
              <slot name="icon">
                <img v-if="iconSrc" :src="iconSrc" alt="" class="size-full object-cover" />
                <AppIcon v-else-if="icon" :name="icon" :size="0.75" />
                <span v-else class="text-[0.625rem] font-semibold">{{ initial }}</span>
              </slot>
            </span>
            <span class="truncate">{{ appName }}</span>
            <span v-if="platform === 'android'" class="np-sep">·</span>
            <span class="np-when shrink-0" :class="platform === 'ios' && 'ms-auto'">{{ when }}</span>
          </div>

          <div class="flex gap-3">
            <div class="min-w-0 flex-1">
              <p
                ref="titleRef"
                class="np-title"
                :class="{ 'np-empty': !hasTitle, 'np-clamp-1': !expanded }"
                dir="auto"
              >{{ hasTitle ? title!.trim() : titlePlaceholder }}</p>
              <p
                ref="messageRef"
                class="np-message"
                :class="[{ 'np-empty': !hasMessage }, !expanded && (platform === 'ios' ? 'np-clamp-4' : 'np-clamp-2')]"
                dir="auto"
              >{{ hasMessage ? message!.trim() : messagePlaceholder }}</p>
            </div>
            <!-- Android shows a collapsed image as a thumbnail beside the text. -->
            <img v-if="image && platform === 'android' && !expanded" :src="image" alt="" class="np-thumb shrink-0" />
          </div>

          <img v-if="image && (platform === 'ios' || expanded)" :src="image" alt="" class="np-image" />
        </div>
      </div>
    </div>

    <figcaption v-if="caption || $slots.caption || showCutoff" class="flex flex-col gap-1 text-sm leading-snug text-text-muted">
      <slot name="caption" :title-cut="cut.title" :message-cut="cut.message">
        <span v-if="caption">{{ caption }}</span>
      </slot>
      <span v-if="showCutoff" class="text-warning-text" role="status">{{ cutoffText }}</span>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import { useReducedMotion } from '@/composables/useReducedMotion';

const props = withDefaults(defineProps<{
  /** The app's name, as the phone prints it above the notification. */
  appName?: string;
  title?: string;
  message?: string;
  /** Iconify name for the app icon. `iconSrc` or the `icon` slot take precedence. */
  icon?: string;
  /** Image URL for the app icon, e.g. the app's logo. */
  iconSrc?: string;
  /** An attached image: below the text on iOS, a thumbnail beside it on Android until expanded. */
  image?: string;
  /** Which phone draws it. They clamp text differently, so check both before sending. */
  platform?: 'ios' | 'android';
  /** The notification card's own theme, separate from the site's. */
  appearance?: 'light' | 'dark';
  /** The long-press view: no line clamps, the full message and image. */
  expanded?: boolean;
  /** What the lock screen clock shows. Defaults to now, and keeps ticking while `live`. */
  time?: Date | string | number;
  /** Re-reads the clock every 30s when no `time` is given. */
  live?: boolean;
  /** BCP 47 locale for the clock. Defaults to the browser's. */
  locale?: string;
  /** The timestamp on the card. */
  when?: string;
  /** How many more notifications are stacked behind this one (shows up to 2). */
  stack?: number;
  /** Any CSS background, replacing the default wallpaper drawn from the preset's accent. Keep it dark enough for white text. */
  wallpaper?: string;
  titlePlaceholder?: string;
  messagePlaceholder?: string;
  /** A note under the phone. The `caption` slot replaces it. */
  caption?: string;
  /** Says when the lock screen will cut the text off. Off for a static picture. */
  warnCutoff?: boolean;
  /** The cut-off note. Gets `{part}` replaced with "title", "message" or "title and message". */
  cutoffLabel?: string;
}>(), {
  appName: 'App',
  title: '',
  message: '',
  icon: '',
  iconSrc: '',
  image: '',
  platform: 'ios',
  appearance: 'light',
  expanded: false,
  time: undefined,
  live: true,
  locale: undefined,
  when: 'now',
  stack: 0,
  wallpaper: '',
  titlePlaceholder: 'Your title',
  messagePlaceholder: 'Your message shows here.',
  caption: '',
  warnCutoff: true,
  cutoffLabel: 'The lock screen cuts the {part} off. Long-press shows the rest.',
});

const emit = defineEmits<{ truncate: [cut: { title: boolean; message: boolean }] }>();

const reducedMotion = useReducedMotion();

const hasTitle = computed(() => !!props.title?.trim());
const hasMessage = computed(() => !!props.message?.trim());
const initial = computed(() => props.appName.trim().charAt(0).toUpperCase());
const stackDepth = computed(() => Math.max(0, Math.min(2, Math.floor(props.stack))));

// The card drops in again when it changes platform or opens, as a real one would.
// Typing into the title must not replay it, so the text is not part of the key.
const arrivalKey = computed(() => `${props.platform}-${props.expanded}`);

// --- Clock ---
const tick = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
// A time that doesn't parse falls back to now: Intl throws on an Invalid Date.
const clock = computed(() => {
  const given = props.time !== undefined ? new Date(props.time) : null;
  return given && !Number.isNaN(given.getTime()) ? given : new Date(tick.value);
});

const timeLabel = computed(() =>
  new Intl.DateTimeFormat(props.locale, { hour: 'numeric', minute: '2-digit' }).format(clock.value),
);
const dateLabel = computed(() =>
  new Intl.DateTimeFormat(props.locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(clock.value),
);

const syncTimer = () => {
  clearInterval(timer);
  timer = undefined;
  if (props.live && props.time === undefined) timer = setInterval(() => (tick.value = Date.now()), 30_000);
};

// --- Cut-off detection ---
// The clamps are CSS, so the only way to know the phone hides text is to measure it.
const titleRef = ref<HTMLElement | null>(null);
const messageRef = ref<HTMLElement | null>(null);
const cut = reactive({ title: false, message: false });
let observer: ResizeObserver | undefined;

const overflows = (el: HTMLElement | null) => !!el && el.scrollHeight > el.clientHeight + 1;

const measure = () => {
  const next = {
    title: hasTitle.value && !props.expanded && overflows(titleRef.value),
    message: hasMessage.value && !props.expanded && overflows(messageRef.value),
  };
  if (next.title === cut.title && next.message === cut.message) return;
  Object.assign(cut, next);
  emit('truncate', { ...next });
};

const showCutoff = computed(() => props.warnCutoff && (cut.title || cut.message));
const cutoffText = computed(() => {
  const part = cut.title && cut.message ? 'title and message' : cut.title ? 'title' : 'message';
  return props.cutoffLabel.replace('{part}', part);
});

watch(
  () => [props.title, props.message, props.platform, props.expanded, props.image],
  () => nextTick(measure),
);
watch(() => [props.live, props.time], syncTimer);

onMounted(() => {
  syncTimer();
  measure();
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure);
    if (titleRef.value) observer.observe(titleRef.value);
    if (messageRef.value) observer.observe(messageRef.value);
  }
});

onBeforeUnmount(() => {
  clearInterval(timer);
  observer?.disconnect();
});

// Screen readers get the notification itself, not the clock and the decoration.
const summary = computed(() => {
  const parts = [`${props.platform === 'ios' ? 'iPhone' : 'Android'} lock-screen preview`, props.appName];
  parts.push(hasTitle.value ? props.title.trim() : 'no title yet');
  parts.push(hasMessage.value ? props.message.trim() : 'no message yet');
  if (props.image) parts.push('with an image');
  return parts.join('. ');
});
</script>

<style scoped>
/* Container units size the clock to the phone, not the viewport. */
.np-screen {
  container-type: inline-size;
  --np-wallpaper:
    radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--color-bg) 16%, transparent), transparent 60%),
    radial-gradient(90% 60% at 100% 100%, color-mix(in srgb, var(--color-ring) 55%, transparent), transparent 70%),
    color-mix(in srgb, var(--color-accent) 30%, black);
  gap: 1.75rem;
  min-height: 26rem;
  padding: 2.25rem 1rem 1.5rem;
  border-radius: 1.75rem;
  background: var(--np-wallpaper);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', Roboto, 'Segoe UI', system-ui, sans-serif;
}

.np-android {
  border-radius: 1.5rem;
  padding-inline: 1.25rem;
}

.np-date {
  font-size: clamp(0.8125rem, 4cqi, 1rem);
  font-weight: 500;
  opacity: 0.85;
}

.np-time {
  font-size: clamp(3rem, 19cqi, 5.5rem);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.025em;
  line-height: 1;
}

.np-android .np-time {
  font-weight: 300;
  letter-spacing: -0.01em;
}

/* --- Card --- */
.np-banner {
  --np-card: rgb(246 246 248 / 0.86);
  --np-ink: #1c1c1e;
  --np-meta: #4a4a50;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.75rem 0.875rem 0.875rem;
  border-radius: 1.125rem;
  background: var(--np-card);
  color: var(--np-ink);
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
}

.np-dark .np-banner {
  --np-card: rgb(30 30 34 / 0.82);
  --np-ink: #f5f5f7;
  --np-meta: #b4b4bc;
}

.np-android .np-banner {
  border-radius: 1.5rem;
  padding: 0.875rem 1rem 1rem;
}

.np-app {
  margin-block-end: 0.375rem;
  color: var(--np-meta);
  font-size: 0.8125rem;
}

.np-icon {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.3125rem;
  background: var(--color-accent);
  color: var(--color-accent-fg);
}

.np-android .np-icon {
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
}

.np-sep {
  opacity: 0.7;
}

.np-when {
  opacity: 0.8;
}

.np-title,
.np-message {
  margin: 0;
  overflow-wrap: anywhere;
}

.np-title {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
}

.np-message {
  font-size: 0.875rem;
  line-height: 1.4;
  white-space: pre-line;
}

.np-clamp-1,
.np-clamp-2,
.np-clamp-4 {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
}

.np-clamp-1 { -webkit-line-clamp: 1; }
.np-clamp-2 { -webkit-line-clamp: 2; }
.np-clamp-4 { -webkit-line-clamp: 4; }

/* Placeholders stay legible: 0.55 of the card's ink keeps them above 4.5:1. */
.np-empty {
  opacity: 0.55;
}

.np-image {
  width: 100%;
  max-height: 11.25rem;
  margin-block-start: 0.625rem;
  border-radius: 0.625rem;
  object-fit: cover;
}

.np-thumb {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.5rem;
  object-fit: cover;
}

/* --- Stack --- */
.np-ghost {
  --np-card: rgb(246 246 248 / 0.5);
  position: absolute;
  inset-inline: calc(var(--np-depth) * 0.625rem);
  inset-block-end: calc(var(--np-depth) * -0.4375rem);
  height: 2rem;
  border-radius: 1rem;
  background: var(--np-card);
  opacity: calc(1 - var(--np-depth) * 0.3);
  z-index: calc(1 - var(--np-depth));
}

/* A dark card's ghosts are lighter than it: dark on a dark wallpaper would vanish. */
.np-dark .np-ghost {
  --np-card: rgb(255 255 255 / 0.18);
}

/* --- Arrival --- */
.np-arrive {
  animation: np-arrive var(--vt-duration-enter, 320ms) cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes np-arrive {
  from {
    opacity: 0;
    transform: translateY(-0.75rem) scale(0.97);
  }
}
</style>

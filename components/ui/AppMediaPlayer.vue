<template>
  <div
    ref="root"
    role="group"
    :aria-label="name"
    tabindex="-1"
    :data-vt-media="uid"
    class="@container flex w-full min-w-0 flex-col bg-surface"
    :class="fullscreen ? 'h-full' : 'rounded-xl border border-border shadow-sm'"
    @keydown="onKeydown"
  >
    <!-- The stage: the picture, a play glyph before the first play, the buffering spinner and the
         error. A click plays or pauses; it is a pointer shortcut only, the bar holds the real
         button, so the stage is not focusable and its overlays are hidden from screen readers. -->
    <div
      v-if="kind === 'video'"
      class="relative flex min-h-0 items-center justify-center overflow-hidden bg-muted"
      :class="fullscreen ? 'flex-1' : 'aspect-video rounded-t-xl'"
      @click="togglePlay()"
    >
      <video
        ref="media"
        class="size-full object-contain"
        :poster="poster"
        :preload="preload"
        :loop="loop"
        :crossorigin="crossorigin"
        playsinline
        v-bind="mediaEvents"
      >
        <source v-for="s in sources" :key="s.src" :src="s.src" :type="s.type" />
        <track v-for="t in tracks" :key="t.src" :src="t.src" :srclang="t.srclang" :label="t.label" :kind="t.kind ?? 'captions'" />
      </video>

      <Transition
        enter-active-class="transition-opacity duration-(--vt-duration-enter) ease-standard"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-(--vt-duration-exit) ease-exit"
        leave-to-class="opacity-0"
      >
        <span
          v-if="!started && !error"
          aria-hidden="true"
          class="pointer-events-none absolute flex size-16 items-center justify-center rounded-full border border-border bg-surface-raised text-text shadow-lg"
        >
          <AppIcon name="icon-[heroicons--play-solid]" :size="1.75" />
        </span>
      </Transition>

      <span
        v-if="bufferingShown && !error"
        aria-hidden="true"
        class="pointer-events-none absolute flex size-16 items-center justify-center rounded-full border border-border bg-surface-raised text-text shadow-lg"
      >
        <AppSpinner size="lg" />
      </span>

      <p v-if="error" class="absolute inset-x-4 flex items-center justify-center gap-2 text-center text-sm text-text">
        <AppIcon name="icon-[heroicons--exclamation-circle]" :size="1.125" class="text-danger-text" aria-hidden="true" />
        {{ error }}
      </p>
    </div>

    <audio
      v-else
      ref="media"
      :preload="preload"
      :loop="loop"
      :crossorigin="crossorigin"
      v-bind="mediaEvents"
    >
      <source v-for="s in sources" :key="s.src" :src="s.src" :type="s.type" />
    </audio>

    <!-- The bar. Every control is a named button or a native range, so Tab walks them in order. -->
    <div class="flex flex-col gap-0.5 px-3 pb-2" :class="kind === 'video' ? 'pt-1' : 'pt-2'">
      <div class="flex items-center gap-3">
        <span aria-hidden="true" class="shrink-0 font-mono text-xs tabular-nums text-text-muted">{{ clock(current) }}</span>
        <div class="min-w-0 flex-1">
          <AppSlider
            :model-value="current"
            :min="0"
            :max="seekable ? duration : 0"
            :step="1"
            :show-value="false"
            :format="scrubText"
            :disabled="!seekable"
            aria-label="Seek"
            @update:model-value="seek($event as number)"
          />
        </div>
        <span aria-hidden="true" class="shrink-0 font-mono text-xs tabular-nums text-text-muted">{{ live ? 'Live' : clock(duration) }}</span>
      </div>

      <p v-if="error && kind === 'audio'" class="flex items-center gap-2 pb-1 text-sm text-text">
        <AppIcon name="icon-[heroicons--exclamation-circle]" :size="1.125" class="text-danger-text" aria-hidden="true" />
        {{ error }}
      </p>

      <div class="flex items-center gap-1">
        <AppButton
          icon-only
          size="md"
          :icon="paused ? 'icon-[heroicons--play]' : 'icon-[heroicons--pause]'"
          :label="paused ? 'Play' : 'Pause'"
          :tooltip="paused ? 'Play (k)' : 'Pause (k)'"
          aria-keyshortcuts="k Space"
          :class="HIT"
          @click="togglePlay()"
        />
        <AppSpinner v-if="kind === 'audio' && bufferingShown" size="sm" class="text-text-muted" aria-hidden="true" />
        <AppButton
          icon-only
          size="md"
          :icon="silent ? 'icon-[heroicons--speaker-x-mark]' : 'icon-[heroicons--speaker-wave]'"
          :label="muted ? 'Unmute' : 'Mute'"
          :tooltip="muted ? 'Unmute (m)' : 'Mute (m)'"
          aria-keyshortcuts="m"
          :class="HIT"
          @click="toggleMute()"
        />
        <!-- Narrow players drop the volume slider; Mute stays, and phones use their own buttons. -->
        <div class="hidden w-24 shrink-0 @sm:block">
          <AppSlider
            :model-value="muted ? 0 : volume"
            :min="0"
            :max="100"
            :step="5"
            :show-value="false"
            :format="(v: number) => `${v}%`"
            aria-label="Volume"
            @update:model-value="setVolume($event as number)"
          />
        </div>

        <div class="flex-1" />

        <template v-if="kind === 'video' && tracks.length === 1">
          <AppButton
            icon-only
            size="md"
            :icon="captionsOn ? 'icon-[heroicons--chat-bubble-bottom-center-text-solid]' : 'icon-[heroicons--chat-bubble-bottom-center-text]'"
            label="Captions"
            tooltip="Captions (c)"
            :aria-pressed="captionsOn"
            aria-keyshortcuts="c"
            :class="HIT"
            @click="toggleCaptions()"
          />
        </template>
        <AppDropdownMenu
          v-else-if="kind === 'video' && tracks.length > 1"
          :items="captionItems"
          placement="top-end"
          :teleport-to="menuTarget"
        >
          <template #trigger="{ attrs }">
            <AppButton
              v-bind="attrs"
              icon-only
              size="md"
              :icon="captionsOn ? 'icon-[heroicons--chat-bubble-bottom-center-text-solid]' : 'icon-[heroicons--chat-bubble-bottom-center-text]'"
              :aria-label="`Captions: ${captionsOn ? tracks[activeTrack].label : 'off'}`"
              tooltip="Captions (c)"
              aria-keyshortcuts="c"
              :class="HIT"
            />
          </template>
        </AppDropdownMenu>

        <AppDropdownMenu v-if="rates.length > 1" :items="rateItems" placement="top-end" :teleport-to="menuTarget">
          <template #trigger="{ attrs }">
            <AppButton
              v-bind="attrs"
              size="md"
              :label="`${rate}×`"
              :aria-label="`Playback speed ${rate}×`"
              tooltip="Playback speed"
              class="min-w-control-md justify-center px-2 font-mono tabular-nums"
              :class="HIT"
            />
          </template>
        </AppDropdownMenu>

        <AppButton
          v-if="kind === 'video' && pipSupported"
          icon-only
          size="md"
          icon="icon-[heroicons--square-2-stack]"
          :label="pip ? 'Exit picture-in-picture' : 'Picture-in-picture'"
          :tooltip="pip ? 'Exit picture-in-picture' : 'Picture-in-picture'"
          :class="HIT"
          @click="togglePip()"
        />
        <AppButton
          v-if="kind === 'video' && fullscreenSupported"
          icon-only
          size="md"
          :icon="fullscreen ? 'icon-[heroicons--arrows-pointing-in]' : 'icon-[heroicons--arrows-pointing-out]'"
          :label="fullscreen ? 'Exit full screen' : 'Full screen'"
          :tooltip="fullscreen ? 'Exit full screen (f)' : 'Full screen (f)'"
          aria-keyshortcuts="f"
          :class="HIT"
          @click="toggleFullscreen()"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import AppButton from './AppButton.vue';
import AppDropdownMenu, { type MenuGroup } from './AppDropdownMenu.vue';
import AppIcon from './AppIcon.vue';
import AppSlider from './AppSlider.vue';
import AppSpinner from './AppSpinner.vue';
import { useAnnouncer } from '@/composables/useAnnouncer';
import { useReducedMotion } from '@/composables/useReducedMotion';

export interface MediaFile {
  src: string;
  /** MIME type ("video/mp4"), so the browser skips files it cannot play without fetching them. */
  type?: string;
}

export interface MediaTrack {
  /** A WebVTT file. */
  src: string;
  srclang: string;
  /** The name in the captions menu ("English"). */
  label: string;
  kind?: 'captions' | 'subtitles';
  /** Shown from the start. */
  default?: boolean;
}

const props = withDefaults(
  defineProps<{
    /** One URL, or several files of the same media in different formats (the first playable wins). */
    src: string | MediaFile[];
    kind?: 'video' | 'audio';
    /** The player's accessible name ("Product tour"). Defaults to "Video player" / "Audio player". */
    label?: string;
    poster?: string;
    /** Caption or subtitle tracks (video). One track gets a toggle; several get a menu. */
    tracks?: MediaTrack[];
    /** The speeds offered. One value, or none, hides the menu. */
    rates?: number[];
    preload?: 'none' | 'metadata' | 'auto';
    /** Starts muted on load. Ignored under reduced motion: nothing plays until asked. */
    autoplay?: boolean;
    loop?: boolean;
    /** Seconds J and L move. */
    seekStep?: number;
    crossorigin?: 'anonymous' | 'use-credentials';
  }>(),
  {
    kind: 'video',
    label: undefined,
    poster: undefined,
    tracks: () => [],
    rates: () => [0.5, 0.75, 1, 1.25, 1.5, 2],
    preload: 'metadata',
    autoplay: false,
    loop: false,
    seekStep: 10,
    crossorigin: undefined,
  },
);

const emit = defineEmits<{
  play: [];
  pause: [];
  ended: [];
  error: [error: MediaError | null];
}>();

// Icon buttons are 40px in Ink and Pine; the pseudo-element takes the hit area to 44px, and the
// 4px gap between buttons keeps neighbouring areas from overlapping.
const HIT = 'relative after:absolute after:-inset-0.5';

// Buffering shorter than this never shows a spinner, and shorter than the second is never said.
const SPINNER_DELAY_MS = 300;
const ANNOUNCE_DELAY_MS = 1500;

const uid = useId();
const { announce } = useAnnouncer();
const reducedMotion = useReducedMotion();

const root = ref<HTMLElement | null>(null);
const media = ref<HTMLMediaElement | null>(null);

const name = computed(() => props.label ?? (props.kind === 'audio' ? 'Audio player' : 'Video player'));
const sources = computed<MediaFile[]>(() => (typeof props.src === 'string' ? [{ src: props.src }] : props.src));

const paused = ref(true);
const started = ref(false);
const current = ref(0);
const duration = ref(0);
const volume = ref(100);
const muted = ref(false);
const rate = ref(1);
const error = ref('');
const fullscreen = ref(false);
const pip = ref(false);
const fullscreenSupported = ref(false);
const pipSupported = ref(false);

const live = computed(() => duration.value === Infinity);
const seekable = computed(() => Number.isFinite(duration.value) && duration.value > 0);
const silent = computed(() => muted.value || volume.value === 0);

// ---- Time, in digits for the eye and in words for the ear ----

const parts = (seconds: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};

const clock = (seconds: number) => {
  const { h, m, s } = parts(seconds);
  const ss = String(s).padStart(2, '0');
  return h || duration.value >= 3600 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

/** "1 minute 5 seconds". */
const spoken = (seconds: number) => {
  const { h, m, s } = parts(seconds);
  const out = [h && plural(h, 'hour'), m && plural(m, 'minute'), s && plural(s, 'second')].filter(Boolean);
  return out.length ? out.join(' ') : '0 seconds';
};

/** The scrubber's aria-valuetext: "1 minute 5 seconds of 3 minutes". */
const scrubText = (seconds: number) => (seekable.value ? `${spoken(seconds)} of ${spoken(duration.value)}` : spoken(seconds));


// ---- Media events ----

let spinnerTimer: ReturnType<typeof setTimeout> | undefined;
let announceTimer: ReturnType<typeof setTimeout> | undefined;
const bufferingShown = ref(false);
let bufferingSaid = false;

function startBuffering() {
  if (spinnerTimer || paused.value) return;
  spinnerTimer = setTimeout(() => (bufferingShown.value = true), SPINNER_DELAY_MS);
  announceTimer = setTimeout(() => {
    bufferingSaid = true;
    announce('Buffering');
  }, ANNOUNCE_DELAY_MS);
}

// A stall that was said out loud says its end too; a short one says nothing either way.
function stopBuffering() {
  clearTimeout(spinnerTimer);
  clearTimeout(announceTimer);
  spinnerTimer = announceTimer = undefined;
  bufferingShown.value = false;
  if (bufferingSaid && !paused.value) announce('Playing');
  bufferingSaid = false;
}

function syncFromMedia() {
  const el = media.value;
  if (!el) return;
  current.value = el.currentTime;
  duration.value = el.duration || 0;
  volume.value = Math.round(el.volume * 100);
  muted.value = el.muted;
  rate.value = el.playbackRate;
}

const mediaEvents = {
  onLoadedmetadata: () => {
    syncFromMedia();
    applyTracks();
  },
  onDurationchange: () => (duration.value = media.value?.duration || 0),
  onTimeupdate: () => (current.value = media.value?.currentTime ?? 0),
  onPlay: () => {
    paused.value = false;
    started.value = true;
    error.value = '';
    emit('play');
  },
  onPause: () => {
    paused.value = true;
    stopBuffering();
    emit('pause');
  },
  onEnded: () => {
    paused.value = true;
    stopBuffering();
    emit('ended');
  },
  onWaiting: startBuffering,
  onPlaying: stopBuffering,
  onCanplay: stopBuffering,
  onSeeked: stopBuffering,
  onVolumechange: () => {
    const el = media.value;
    if (!el) return;
    volume.value = Math.round(el.volume * 100);
    muted.value = el.muted;
  },
  onRatechange: () => (rate.value = media.value?.playbackRate ?? 1),
  onError: () => {
    stopBuffering();
    error.value = 'This media could not be loaded.';
    announce(error.value);
    emit('error', media.value?.error ?? null);
  },
  onEnterpictureinpicture: () => (pip.value = true),
  onLeavepictureinpicture: () => (pip.value = false),
};

// ---- Actions ----

function play() {
  // play() rejects when autoplay is blocked or a pause interrupts it; the state follows the events.
  media.value?.play()?.catch(() => {});
}

function pause() {
  media.value?.pause();
}

function togglePlay(say = false) {
  const el = media.value;
  if (!el) return;
  const willPlay = el.paused;
  if (willPlay) play();
  else pause();
  if (say) announce(willPlay ? 'Playing' : 'Paused');
}

function seek(time: number) {
  const el = media.value;
  if (!el || !seekable.value) return;
  const to = Math.min(duration.value, Math.max(0, time));
  el.currentTime = to;
  current.value = to;
}

function seekBy(delta: number) {
  if (!seekable.value) return;
  seek(current.value + delta);
  announce(scrubText(current.value));
}

function setVolume(v: number) {
  const el = media.value;
  if (!el) return;
  el.volume = v / 100;
  volume.value = v;
  if (v > 0 && el.muted) el.muted = muted.value = false;
}

function toggleMute(say = false) {
  const el = media.value;
  if (!el) return;
  const next = !muted.value;
  // Unmuting at zero volume would still be silent.
  if (!next && volume.value === 0) setVolume(50);
  el.muted = muted.value = next;
  if (say) announce(next ? 'Muted' : 'Unmuted');
}

function setRate(r: number) {
  if (!media.value) return;
  media.value.playbackRate = r;
  rate.value = r;
}

// ---- Captions ----

const activeTrack = ref(props.tracks.findIndex((t) => t.default));
let lastTrack = Math.max(0, activeTrack.value);
const captionsOn = computed(() => activeTrack.value >= 0 && activeTrack.value < props.tracks.length);

// The modes are set by hand (no `default` attribute), so the browser and this state never disagree.
function applyTracks() {
  const list = media.value?.textTracks;
  if (!list) return;
  for (let i = 0; i < list.length; i++) list[i].mode = i === activeTrack.value ? 'showing' : 'disabled';
}

function setTrack(index: number) {
  activeTrack.value = index;
  if (index >= 0) lastTrack = index;
  applyTracks();
}

function toggleCaptions(say = false) {
  if (props.kind !== 'video' || !props.tracks.length) return;
  setTrack(captionsOn.value ? -1 : Math.min(lastTrack, props.tracks.length - 1));
  if (say) announce(captionsOn.value ? `Captions on, ${props.tracks[activeTrack.value].label}` : 'Captions off');
}

const captionItems = computed<MenuGroup[]>(() => [
  {
    label: 'Captions',
    items: [
      { label: 'Off', type: 'radio', checked: !captionsOn.value, onSelect: () => setTrack(-1) },
      ...props.tracks.map((t, i) => ({ label: t.label, type: 'radio' as const, checked: activeTrack.value === i, onSelect: () => setTrack(i) })),
    ],
  },
]);

const rateItems = computed<MenuGroup[]>(() => [
  {
    label: 'Playback speed',
    items: props.rates.map((r) => ({
      label: r === 1 ? 'Normal' : `${r}×`,
      type: 'radio' as const,
      checked: rate.value === r,
      onSelect: () => setRate(r),
    })),
  },
]);

// ---- Full screen and picture-in-picture ----

// The whole player goes full screen, not the <video>, so these controls stay. The menus then have
// to open inside it: the page outside a full-screen element is not drawn.
const menuTarget = computed(() => (fullscreen.value ? `[data-vt-media="${uid}"]` : undefined));

type WebkitVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

function toggleFullscreen() {
  const el = root.value;
  if (!el || props.kind !== 'video') return;
  if (document.fullscreenElement === el) {
    document.exitFullscreen?.().catch(() => {});
  } else if (document.fullscreenEnabled && el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else {
    // iOS Safari: only the video itself can go full screen, with the system's controls.
    (media.value as WebkitVideo | null)?.webkitEnterFullscreen?.();
  }
}

function togglePip() {
  const el = media.value as HTMLVideoElement | null;
  if (!el) return;
  if (document.pictureInPictureElement === el) document.exitPictureInPicture().catch(() => {});
  else el.requestPictureInPicture?.().catch(() => {});
}

function onFullscreenChange() {
  fullscreen.value = !!root.value && document.fullscreenElement === root.value;
}

// ---- Keyboard: only while focus is inside the player ----

function onKeydown(e: KeyboardEvent) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const target = e.target as HTMLElement;
  // In full screen the menus open inside the player; their keys (type-ahead too) are their own.
  if (target.closest('[role="menu"]')) return;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  switch (key) {
    case ' ':
      // A focused button presses itself with Space.
      if (target !== root.value && target.closest('button')) return;
      togglePlay(true);
      break;
    case 'k':
      togglePlay(true);
      break;
    case 'j':
      seekBy(-props.seekStep);
      break;
    case 'l':
      seekBy(props.seekStep);
      break;
    case 'm':
      toggleMute(true);
      break;
    case 'f':
      if (props.kind !== 'video' || !fullscreenSupported.value) return;
      toggleFullscreen();
      break;
    case 'c':
      if (props.kind !== 'video' || !props.tracks.length) return;
      toggleCaptions(true);
      break;
    default:
      return;
  }
  e.preventDefault();
}

// ---- Lifecycle ----

function detectSupport() {
  const el = media.value as WebkitVideo | null;
  if (props.kind !== 'video' || !el) {
    fullscreenSupported.value = pipSupported.value = false;
    return;
  }
  fullscreenSupported.value = !!(document.fullscreenEnabled && root.value?.requestFullscreen) || typeof el.webkitEnterFullscreen === 'function';
  pipSupported.value = !!document.pictureInPictureEnabled && !el.disablePictureInPicture && typeof el.requestPictureInPicture === 'function';
}

function reset() {
  stopBuffering();
  paused.value = true;
  started.value = false;
  current.value = 0;
  duration.value = 0;
  error.value = '';
}

// Keyed on the URLs, so a parent that re-renders with a new array of the same files does not reload.
const sourceKey = computed(() => `${props.kind}|${sources.value.map((s) => `${s.src} ${s.type ?? ''}`).join('|')}`);
const trackKey = computed(() => props.tracks.map((t) => `${t.src} ${t.srclang}`).join('|'));

watch(sourceKey, async () => {
    reset();
    await nextTick();
    media.value?.load();
    detectSupport();
});

watch(trackKey, async () => {
  if (activeTrack.value >= props.tracks.length) activeTrack.value = -1;
  await nextTick();
  applyTracks();
});

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange);
  detectSupport();
  syncFromMedia();
  applyTracks();
  if (props.autoplay && !reducedMotion.value && media.value) {
    media.value.muted = muted.value = true;
    play();
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  clearTimeout(spinnerTimer);
  clearTimeout(announceTimer);
  if (root.value && document.fullscreenElement === root.value) document.exitFullscreen?.().catch(() => {});
});

defineExpose({ media, play, pause, seek, toggleFullscreen });
</script>

<template>
  <component :is="tooltip && named ? AppTooltip : Passthrough" v-bind="tooltip && named ? { content: accessibleName, placement: tooltipPlacement } : {}">
  <span
    class="app-avatar relative inline-flex shrink-0 align-middle"
    :class="SIZE[size]"
    :data-hue="tint"
    :role="named ? 'img' : undefined"
    :aria-label="named ? accessibleName : undefined"
  >
    <span class="app-avatar-face flex size-full items-center justify-center overflow-hidden" :class="shape === 'square' ? 'rounded-lg' : 'rounded-full'">
      <img
        v-if="src && !failed"
        :src="src"
        alt=""
        class="size-full object-cover"
        loading="lazy"
        decoding="async"
        @error="failed = true"
      />
      <span v-else-if="initials" class="select-none font-semibold leading-none" :class="TEXT[size]" aria-hidden="true">
        {{ initials }}
      </span>
      <span v-else class="icon-[heroicons--user] size-3/5" aria-hidden="true" />
    </span>
    <span v-if="status" class="app-avatar-status absolute -bottom-px -end-px rounded-full" :class="DOT[size]" :data-status="status" :title="statusWord" aria-hidden="true" />
    <span v-if="status && !named" class="sr-only">{{ statusWord }}</span>
  </span>
  </component>
</template>

<script lang="ts">
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square';
export type AvatarStatus = 'online' | 'away' | 'busy' | 'offline';
export type AvatarHue = 'lime' | 'mint' | 'aqua' | 'sky' | 'violet' | 'rose' | 'peach' | 'amber';

/** The eight identity hues, the same set AdvancedAppTable tints its identity column with. */
export const AVATAR_HUES = ['lime', 'mint', 'aqua', 'sky', 'violet', 'rose', 'peach', 'amber'] as const satisfies readonly AvatarHue[];

/**
 * Stable hue for a seed: the same name or id lands on the same colour on every page and in
 * every session. The hash is AdvancedAppTable's `hueFor`, so a person keeps one colour in a
 * table and in an avatar.
 */
export const avatarHue = (seed: string): AvatarHue => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[hash % AVATAR_HUES.length];
};

/**
 * Initials for a name: the first letter of the first and last word ("Ada King Lovelace" → "AL"),
 * or one letter for one word. An email uses the part before the @. Letters are taken whole, so
 * an accented or non-Latin first letter survives.
 */
export const avatarInitials = (name: string, max: 1 | 2 = 2): string => {
  const words = name.trim().replace(/@.*$/, '').split(/[\s._-]+/).filter(Boolean);
  if (!words.length) return '';
  const first = (word: string) => Array.from(word)[0] ?? '';
  const letters = words.length > 1 && max === 2 ? first(words[0]) + first(words[words.length - 1]) : first(words[0]);
  return letters.toLocaleUpperCase();
};

export const AVATAR_STATUS_LABELS: Record<AvatarStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
};
</script>

<script setup lang="ts">
import { computed, defineComponent, ref, watch } from 'vue';
import AppTooltip from '@/components/ui/AppTooltip.vue';

const Passthrough = defineComponent({ setup: (_, { slots }) => () => slots.default?.() });

const props = withDefaults(
  defineProps<{
    /** The person or thing: drives the initials, the hue and the accessible name. */
    name: string;
    /** Picture URL. Falls back to the initials when missing or when it fails to load. */
    src?: string;
    /** Accessible name. Defaults to `name`; pass `''` when the name is already written beside the avatar. */
    alt?: string;
    size?: AvatarSize;
    shape?: AvatarShape;
    /** A dot at the bottom end corner. Each status has its own shape as well as its own colour. */
    status?: AvatarStatus;
    /** The word for the status (screen readers and the dot's tooltip). Defaults to "Online", "Away"… */
    statusLabel?: string;
    /** A fixed hue instead of one derived from `seed`. */
    hue?: AvatarHue;
    /** What the hue is derived from. Defaults to `name`; pass a user id to keep the colour when a name changes. */
    seed?: string;
    /** Show the name (and status) in an AppTooltip on hover. For a group, AppAvatarGroup's `reveal`. */
    tooltip?: boolean;
    tooltipPlacement?: 'top' | 'bottom' | 'start' | 'end';
  }>(),
  { size: 'md', shape: 'circle', tooltip: false, tooltipPlacement: 'top' },
);

const SIZE: Record<AvatarSize, string> = { xs: 'size-6', sm: 'size-8', md: 'size-10', lg: 'size-12', xl: 'size-16' };
const TEXT: Record<AvatarSize, string> = { xs: 'text-xs', sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-xl' };
const DOT: Record<AvatarSize, string> = { xs: 'size-2.5', sm: 'size-3', md: 'size-3.5', lg: 'size-4', xl: 'size-5' };

const failed = ref(false);
watch(
  () => props.src,
  () => (failed.value = false),
);

const tint = computed(() => props.hue ?? avatarHue(props.seed ?? props.name));
const initials = computed(() => avatarInitials(props.name, props.size === 'xs' ? 1 : 2));
const statusWord = computed(() => (props.status ? (props.statusLabel ?? AVATAR_STATUS_LABELS[props.status]) : ''));
const baseName = computed(() => (props.alt ?? props.name).trim());
const named = computed(() => baseName.value !== '');
const accessibleName = computed(() => (statusWord.value ? `${baseName.value}, ${statusWord.value}` : baseName.value));
</script>

<style scoped>
/* Eight equally weighted identity hues (AdvancedAppTable's). They are categories, not
   status: text mixes 55% toward --color-text so initials keep 4.5:1 on their tint in all six
   preset and theme combinations (tests/appAvatar.spec.ts). */
.app-avatar[data-hue='lime'] {
  --hue: #7cb305;
}
.app-avatar[data-hue='mint'] {
  --hue: #10b981;
}
.app-avatar[data-hue='aqua'] {
  --hue: #06b6d4;
}
.app-avatar[data-hue='sky'] {
  --hue: #3b82f6;
}
.app-avatar[data-hue='violet'] {
  --hue: #8b5cf6;
}
.app-avatar[data-hue='rose'] {
  --hue: #ec4899;
}
.app-avatar[data-hue='peach'] {
  --hue: #f97316;
}
.app-avatar[data-hue='amber'] {
  --hue: #d97706;
}

/* The colour that separates an avatar from its neighbours in a group and rings the status
   dot. Set it to the colour of whatever the avatar sits on. */
.app-avatar {
  --vt-avatar-cut-color: var(--vt-avatar-cut, var(--color-surface));
}

.app-avatar-face {
  /* Opaque tint, so overlapping avatars never show each other through. */
  background: color-mix(in srgb, var(--hue) 12%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--hue) 38%, var(--color-surface));
  color: color-mix(in srgb, var(--hue) 55%, var(--color-text));
}

/* Status: a word for screen readers and the tooltip, and a shape of its own for each state,
   so colour is never the only cue. Online is a disc, away a crescent, busy a disc with a bar,
   offline a ring. The *-text tokens keep the dot at 3:1 or better on the surface. */
.app-avatar-status {
  border: 2px solid var(--vt-avatar-cut-color);
  background: var(--dot);
}
.app-avatar-status::after {
  content: '';
  position: absolute;
}
.app-avatar-status[data-status='online'] {
  --dot: var(--color-success-text);
}
.app-avatar-status[data-status='away'] {
  --dot: var(--color-warning-text);
  overflow: hidden;
}
.app-avatar-status[data-status='away']::after {
  inset-block-start: -15%;
  inset-inline-start: -15%;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background: var(--vt-avatar-cut-color);
}
.app-avatar-status[data-status='busy'] {
  --dot: var(--color-danger-text);
}
.app-avatar-status[data-status='busy']::after {
  inset-inline: 20%;
  inset-block-start: calc(50% - 1px);
  height: 2px;
  border-radius: var(--radius-sm);
  background: var(--vt-avatar-cut-color);
}
.app-avatar-status[data-status='offline'] {
  --dot: var(--color-text-subtle);
}
.app-avatar-status[data-status='offline']::after {
  inset: 30%;
  border-radius: 50%;
  background: var(--vt-avatar-cut-color);
}
</style>

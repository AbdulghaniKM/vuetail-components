<template>
  <ul role="list" class="app-avatar-group flex items-center" :aria-label="label">
    <li v-for="(item, index) in shown" :key="item.key ?? `${item.name}-${index}`" class="app-avatar-group-item flex" :class="[cutShape, index > 0 && OVERLAP[size]]">
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
    </li>
    <li v-if="hiddenCount > 0" class="app-avatar-group-item flex" :class="[cutShape, shown.length > 0 && OVERLAP[size]]">
      <slot name="overflow" :count="hiddenCount" :hidden="hidden">
        <span
          role="img"
          :aria-label="overflowLabel"
          :title="hiddenNames || undefined"
          class="flex select-none items-center justify-center border border-border bg-muted font-semibold leading-none text-text-muted tabular-nums"
          :class="[SIZE[size], TEXT[size], shape === 'square' ? 'rounded-lg' : 'rounded-full']"
        >
          <span aria-hidden="true">+{{ hiddenCount }}</span>
        </span>
      </slot>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppAvatar, { type AvatarHue, type AvatarShape, type AvatarSize, type AvatarStatus } from '@/components/ui/AppAvatar.vue';

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
  }>(),
  { max: 4, size: 'md', shape: 'circle' },
);

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
</script>

<style scoped>
/* Each avatar sits on a disc of the cut colour, 2px larger, so the next one in the stack
   reads as cut out of the one beneath. Set --vt-avatar-cut to the colour behind the group. */
.app-avatar-group-item {
  padding: 2px;
  background: var(--vt-avatar-cut, var(--color-surface));
}
</style>

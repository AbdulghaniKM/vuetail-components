<template>
  <component :is="as" class="glass-container" :class="{ 'is-row': direction === 'row' }" :style="style">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, provide, toRef } from 'vue';
import { GlassContainerKey } from '@/composables/useLiquidGlass';

/**
 * Groups several glass panes.
 *
 * The adoption guide asks for this in two places. First, spacing: "Liquid Glass elements
 * need breathing room. Overcrowding or layering glass on glass creates visual noise" —
 * so the container owns the gap rather than leaving each caller to guess it. Second,
 * shape: controls should sit concentric to their container, which a pane cannot work out
 * alone because it does not know what it is inside. This hands its children that.
 *
 * It is also the answer to the guide's `GlassEffectContainer`, minus one thing: Apple's
 * version can fluidly morph adjacent glass shapes into each other during animation.
 * That needs a shared render target the web does not give us, so this does the grouping
 * and the geometry and stops short of the morph.
 */
interface Props {
  /** The container's own corner radius. Children with `concentric` derive theirs from it. */
  radius?: number;
  /** Space between panes, and the inset a concentric child measures itself against. */
  gap?: number;
  /** Padding inside the container. Defaults to `gap`, which is what makes a child concentric. */
  padding?: number;
  direction?: 'row' | 'column';
  /** Draw the container itself — off by default, since it is usually only a grouping. */
  filled?: boolean;
  as?: string;
}

const props = withDefaults(defineProps<Props>(), {
  radius: 28,
  gap: 12,
  padding: undefined,
  direction: 'row',
  filled: false,
  as: 'div',
});

const padding = computed(() => props.padding ?? props.gap);

// A child is concentric when the gap it measures against is the padding that actually
// separates it from the container's edge — not the gap between siblings.
provide(GlassContainerKey, {
  radius: toRef(props, 'radius'),
  gap: padding,
});

const style = computed(() => ({
  borderRadius: `${props.radius}px`,
  gap: `${props.gap}px`,
  padding: `${padding.value}px`,
  ...(props.filled
    ? {
        background: 'color-mix(in srgb, var(--color-surface, #fff) 40%, transparent)',
        border: '1px solid var(--color-border, rgba(255, 255, 255, 0.12))',
      }
    : {}),
}));
</script>

<style scoped>
.glass-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  /* One stacking context for the group, so panes composite against each other rather
     than punching through whatever happens to be behind the whole cluster. */
  isolation: isolate;
}

.glass-container.is-row {
  flex-direction: row;
  align-items: center;
}
</style>

<template>
  <AppLiquidGlass
    ref="glassRef"
    class="magnifier"
    :class="{ 'is-draggable': draggable, 'is-dragging': dragging }"
    :style="positionStyle"
    variant="clear"
    :dim="0"
    :dispersion="dispersion"
    :radius="size / 2"
    :bezel="resolvedBezel"
    :thickness="thickness"
    :refractive-index="refractiveIndex"
    :profile="profile"
    :magnification="magnification"
    :max-displacement="maxDisplacement"
    :resolution="resolution"
    :blur="blur"
    :fallback-blur="fallbackBlur"
    :saturate="saturate"
    :brightness="brightness"
    :tint="tint"
    :specular="specular"
    :shadow="shadow"
    :disabled="disabled"
    @pointerdown="onPointerDown"
  >
    <div class="magnifier-body">
      <slot />
    </div>
  </AppLiquidGlass>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppLiquidGlass from './AppLiquidGlass.vue';
import { DEFAULT_GLASS_PARAMS, type GlassProfile } from '@/composables/useLiquidGlass';

interface Props {
  /** Diameter in px. */
  size?: number;
  /** How much bigger the backdrop reads through the lens. */
  magnification?: number;
  /**
   * How far the curved rim reaches in. Defaults to the whole radius, which is what
   * makes this a lens rather than a pane — curve the entire surface and the refraction
   * bends across all of it instead of only at the edge.
   */
  bezel?: number;
  thickness?: number;
  refractiveIndex?: number;
  profile?: GlassProfile;
  maxDisplacement?: number;
  resolution?: number;
  /**
   * Chromatic dispersion, as a fraction of the bend. A real lens fringes at the rim,
   * and unlike a button this is big enough to see it.
   */
  dispersion?: number;

  blur?: number;
  fallbackBlur?: number;
  saturate?: number;
  brightness?: number;
  tint?: string;
  specular?: boolean;
  shadow?: boolean;
  disabled?: boolean;

  /** Drag the lens with a pointer. */
  draggable?: boolean;
  /** `v-model:x` / `v-model:y` — position of the lens centre, in px, within its parent. */
  x?: number;
  y?: number;
  /** Keep the lens inside its offset parent while dragging. */
  contain?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 160,
  magnification: 1.6,
  bezel: undefined,
  thickness: DEFAULT_GLASS_PARAMS.thickness,
  refractiveIndex: DEFAULT_GLASS_PARAMS.refractiveIndex,
  profile: 'convex',
  maxDisplacement: 96,
  resolution: DEFAULT_GLASS_PARAMS.resolution,
  dispersion: 0.06,
  blur: 0,
  fallbackBlur: 0,
  saturate: 1.15,
  brightness: 1.02,
  tint: 'rgba(255, 255, 255, 0.04)',
  specular: true,
  shadow: true,
  disabled: false,
  draggable: true,
  x: undefined,
  y: undefined,
  contain: true,
});

const emit = defineEmits<{
  'update:x': [value: number];
  'update:y': [value: number];
  dragStart: [];
  dragEnd: [payload: { x: number; y: number }];
}>();

const glassRef = ref<InstanceType<typeof AppLiquidGlass> | null>(null);
const dragging = ref(false);

// A lens is curved all the way across, not just at the rim.
const resolvedBezel = computed(() => props.bezel ?? props.size / 2);

const internalX = ref(props.x ?? 0);
const internalY = ref(props.y ?? 0);
const posX = computed(() => (props.x === undefined ? internalX.value : props.x));
const posY = computed(() => (props.y === undefined ? internalY.value : props.y));

const positionStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  // The model is the lens centre, which is what you actually aim.
  transform: `translate3d(${posX.value - props.size / 2}px, ${posY.value - props.size / 2}px, 0)`,
}));

let pointerId: number | null = null;
let grabOffsetX = 0;
let grabOffsetY = 0;

const move = (nextX: number, nextY: number) => {
  let x = nextX;
  let y = nextY;

  if (props.contain) {
    const parent = (glassRef.value?.$el as HTMLElement | undefined)?.offsetParent as HTMLElement | null;
    if (parent) {
      const half = props.size / 2;
      x = Math.max(half, Math.min(parent.clientWidth - half, x));
      y = Math.max(half, Math.min(parent.clientHeight - half, y));
    }
  }

  internalX.value = x;
  internalY.value = y;
  emit('update:x', x);
  emit('update:y', y);
};

const onPointerMove = (event: PointerEvent) => {
  if (!dragging.value) return;
  const parent = (glassRef.value?.$el as HTMLElement | undefined)?.offsetParent as HTMLElement | null;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  move(event.clientX - rect.left - grabOffsetX, event.clientY - rect.top - grabOffsetY);
};

const endDrag = (event: PointerEvent) => {
  if (!dragging.value) return;
  dragging.value = false;
  const element = glassRef.value?.$el as HTMLElement | undefined;
  if (pointerId !== null) element?.releasePointerCapture?.(pointerId);
  pointerId = null;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', endDrag);
  window.removeEventListener('pointercancel', endDrag);
  void event;
  emit('dragEnd', { x: posX.value, y: posY.value });
};

const onPointerDown = (event: PointerEvent) => {
  if (!props.draggable || event.button !== 0) return;
  const element = glassRef.value?.$el as HTMLElement | undefined;
  const parent = element?.offsetParent as HTMLElement | null;
  if (!element || !parent) return;

  event.preventDefault();
  const rect = parent.getBoundingClientRect();
  // Grab the lens where it was picked up, so it does not jump under the cursor.
  grabOffsetX = event.clientX - rect.left - posX.value;
  grabOffsetY = event.clientY - rect.top - posY.value;

  dragging.value = true;
  pointerId = event.pointerId;
  element.setPointerCapture?.(event.pointerId);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  emit('dragStart');
};

defineExpose({ moveTo: move });
</script>

<style scoped>
.magnifier {
  position: absolute;
  top: 0;
  left: 0;
  touch-action: none;
  will-change: transform;
}

.magnifier.is-draggable {
  cursor: grab;
}

.magnifier.is-dragging {
  cursor: grabbing;
}

.magnifier-body {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}
</style>

<template>
  <component :is="as" ref="rootRef" class="liquid-glass" :class="rootClass" :style="rootStyle">
    <!-- Apple's Clear variant is explicitly "placed on top of a dimming layer": with no
         frost of its own, legibility has to come from darkening what is underneath. -->
    <span v-if="resolved.dim > 0" class="lg-layer lg-dim" :style="dimStyle" />

    <!-- Two backdrop layers, not one. This one frosts and saturates; the next samples
         its output and bends it. Blurring after the bend would smear the refraction
         away, which is exactly the detail that separates glass from frosted plastic. -->
    <span class="lg-layer lg-blur" :style="blurStyle" />
    <span class="lg-layer lg-refract" :style="refractStyle" />

    <span v-if="showTint" class="lg-layer lg-tint" :style="tintStyle" />
    <span v-if="specular" class="lg-layer lg-specular" :class="{ 'is-painted': rim }" :style="specularStyle" />

    <div class="lg-content">
      <slot :supported="supported" :variant="variant" />
    </div>
  </component>
</template>

<script lang="ts">
import type { GlassProfile, GlassSource } from '@/composables/useLiquidGlass';

export type { GlassProfile, GlassSource };

/** Apple ships two: Regular is safe anywhere, Clear needs help. */
export type GlassVariant = 'regular' | 'clear';

export const GLASS_VARIANTS = ['regular', 'clear'] as const satisfies readonly GlassVariant[];

/**
 * Per-variant baselines, following Apple's guidance.
 *
 * **Regular** is "the most versatile and common variant… provides legibility regardless
 * of context" — it frosts, so it carries its own contrast anywhere.
 *
 * **Clear** is permanently transparent and only appropriate when three things hold: the
 * element sits over media-rich content, that content can take a dimming layer, and what
 * sits on the glass is bold and bright. It gets almost no frost, and a dimming layer
 * instead — without one, legibility noticeably fails.
 */
export const GLASS_VARIANT_PRESETS: Record<
  GlassVariant,
  { blur: number; toneStrength: number; dim: number; saturate: number; brightness: number }
> = {
  regular: { blur: 14, toneStrength: 18, dim: 0, saturate: 1.9, brightness: 1.08 },
  clear: { blur: 0, toneStrength: 5, dim: 0.18, saturate: 1.2, brightness: 1.02 },
};
</script>

<script setup lang="ts">
import { computed, inject, provide, ref } from 'vue';
import {
  concentricRadius,
  DEFAULT_GLASS_LIGHT,
  DEFAULT_GLASS_PARAMS,
  GlassContainerKey,
  GlassPaneKey,
  useLiquidGlass,
} from '@/composables/useLiquidGlass';

interface Props {
  /** `regular` frosts and is safe anywhere; `clear` is transparent and needs a dim layer. */
  variant?: GlassVariant;

  /** Corner radius in px. Half the short side makes it a circle. */
  radius?: number;
  /**
   * Derive the radius from the enclosing AppGlassContainer instead, so the two curves
   * stay concentric. Apple asks for this throughout: controls concentric to sheets,
   * sheets to windows, windows to the display.
   */
  concentric?: boolean;
  /** Width of the band round the rim that bends, in px. `auto` is a quarter of the short side. */
  bezel?: number | 'auto';
  /** Glass depth. With the index it sets the strength: 22 at 1.5 is glisse's tuning; 0 is flat. */
  thickness?: number;
  /** Index of refraction. Air is 1 (no bend), window glass ~1.5. */
  refractiveIndex?: number;
  /** The rim's dome: `squircle` steep at the edge, `convex` rounder, `concave` inverts, `lip` pulls straight across. */
  profile?: GlassProfile;
  /** Plain radial zoom layered on top of the refraction. 1 leaves the middle alone. */
  magnification?: number;
  /** Ceiling on displacement in px. 0 leaves it to the lens, which never pulls past half its reach. */
  maxDisplacement?: number;
  /** Map density in pixels per px. 0 follows the screen, up to 2. */
  resolution?: number;
  /**
   * How much further red bends than blue, as a fraction of the bend: 0.08 (glisse's
   * default) puts red 8% and green 4% further out. Past ~0.2 it stops reading as glass.
   */
  dispersion?: number;
  /**
   * What bends. `auto`: the live backdrop in Chromium; elsewhere the `[data-glass-backdrop]`
   * element behind the pane, filtered where the pane stands. `content` uses the marked
   * element in Chromium too; `backdrop` never filters content.
   */
  source?: GlassSource;

  /** Frost behind the glass. Defaults to the variant's baseline. */
  blur?: number;
  /** Blur used where the refraction cannot run — the fallback carries the effect alone. */
  fallbackBlur?: number;
  saturate?: number;
  brightness?: number;
  /** Darkens what is behind the glass, 0-1. Clear glass needs this; regular rarely does. */
  dim?: number;

  /**
   * The colour the glass takes on. One value in, three out — the fill, the lit rim and
   * the glow are all mixed from it.
   */
  tone?: string;
  /** How much of `tone` ends up in the fill, as a percentage. Defaults per variant. */
  toneStrength?: number;
  /** Overrides the derived fill outright. `''` removes the layer. */
  tint?: string;
  /** The lit rim, as iOS 26.1 draws it. */
  specular?: boolean;
  /** Width of the lit line in px; iOS's is 1.22. */
  rim?: number;
  /** Where the light comes from, as a CSS gradient angle: 135 lights the top and left. */
  lightAngle?: number;
  /** Drop shadow under the pane. */
  shadow?: boolean;
  /** Lifts on hover. */
  interactive?: boolean;
  /** Turns the refraction off and leaves the fallback blur. */
  disabled?: boolean;

  as?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'regular',
  concentric: false,
  radius: DEFAULT_GLASS_PARAMS.radius,
  bezel: DEFAULT_GLASS_PARAMS.bezel,
  thickness: DEFAULT_GLASS_PARAMS.thickness,
  refractiveIndex: DEFAULT_GLASS_PARAMS.refractiveIndex,
  profile: DEFAULT_GLASS_PARAMS.profile,
  magnification: DEFAULT_GLASS_PARAMS.magnification,
  maxDisplacement: DEFAULT_GLASS_PARAMS.maxDisplacement,
  resolution: DEFAULT_GLASS_PARAMS.resolution,
  dispersion: DEFAULT_GLASS_PARAMS.dispersion,
  source: 'auto',
  // Left undefined so the variant's baseline decides, and an explicit value still wins.
  blur: undefined,
  saturate: undefined,
  brightness: undefined,
  dim: undefined,
  toneStrength: undefined,
  fallbackBlur: 12,
  tone: 'var(--color-surface)',
  tint: undefined,
  specular: true,
  rim: DEFAULT_GLASS_LIGHT.width,
  lightAngle: DEFAULT_GLASS_LIGHT.angle,
  shadow: true,
  interactive: false,
  disabled: false,
  as: 'div',
});

const rootRef = ref<HTMLElement | null>(null);

const container = inject(GlassContainerKey, null);
const insideAnotherPane = inject(GlassPaneKey, false);

// Panes can tell whether they are nested; see the warning below.
provide(GlassPaneKey, true);

if (import.meta.env?.DEV && insideAnotherPane) {
  console.warn(
    "[AppLiquidGlass] A glass pane is nested inside another. Apple's guidance is that " +
      "layering glass on glass creates visual noise — the material is meant to be one " +
      "functional layer above the content, not a stack. Group panes as siblings in an " +
      "AppGlassContainer instead.",
  );
}

/** A concentric pane takes the container's radius less the gap between them. */
const effectiveRadius = computed(() =>
  props.concentric && container
    ? concentricRadius(container.radius.value, container.gap.value)
    : props.radius,
);

/** A variant is a set of defaults, not a lock — anything passed explicitly still wins. */
const resolved = computed(() => {
  const preset = GLASS_VARIANT_PRESETS[props.variant] ?? GLASS_VARIANT_PRESETS.regular;
  return {
    blur: props.blur ?? preset.blur,
    saturate: props.saturate ?? preset.saturate,
    brightness: props.brightness ?? preset.brightness,
    dim: props.dim ?? preset.dim,
    toneStrength: props.toneStrength ?? preset.toneStrength,
  };
});

const glassParams = computed(() => ({
  radius: effectiveRadius.value,
  bezel: props.bezel,
  thickness: props.thickness,
  refractiveIndex: props.refractiveIndex,
  profile: props.profile,
  magnification: props.magnification,
  maxDisplacement: props.maxDisplacement,
  resolution: props.resolution,
  dispersion: Math.max(0, Math.min(0.4, props.dispersion)),
}));

const { filter, mode, rim, map, width, supported, refresh } = useLiquidGlass(rootRef, glassParams, {
  enabled: () => !props.disabled,
  light: () => (props.specular ? { angle: props.lightAngle, width: props.rim } : null),
  source: () => props.source,
});

/**
 * Whether the pane refracts. Until its first measurement it is assumed to, so a Clear
 * pane does not flash the fallback frost for a frame on mount.
 */
const canRefract = computed(() => !props.disabled && (supported.value || width.value === 0));

const rootClass = computed(() => ({
  'is-interactive': props.interactive,
  'is-clear': props.variant === 'clear',
}));

/**
 * One colour in, three out. Everything that reads as "this glass is blue" — the fill,
 * the lit rim, the glow under it — is mixed from `tone`, so a caller sets its identity
 * once instead of tuning three layers that can drift apart.
 */
const rootStyle = computed(() => {
  const tone = props.tone || 'var(--color-surface)';
  const strength = Math.max(0, Math.min(100, resolved.value.toneStrength));
  return {
    borderRadius: `${effectiveRadius.value}px`,
    '--lg-tone': tone,
    '--lg-fill': `color-mix(in srgb, ${tone} ${strength}%, transparent)`,
    '--lg-edge': `color-mix(in srgb, ${tone} 55%, transparent)`,
    '--lg-glow': `color-mix(in srgb, ${tone} 40%, transparent)`,
    // Where transparency is refused outright, the pane still has to be readable.
    // Reduce Transparency and Increase Contrast both need a much denser fill than the
    // pane normally carries, and a border that is genuinely high-contrast.
    '--lg-fill-dense': `color-mix(in srgb, ${tone} ${Math.max(strength, 82)}%, var(--color-surface))`,
    '--lg-frost-heavy': `${Math.max(20, resolved.value.blur * 2)}px`,
    '--lg-rim': `${props.rim}px`,
    '--lg-angle': `${props.lightAngle}deg`,
    boxShadow: props.shadow ? 'var(--shadow-lg), 0 0.5rem 1.5rem -0.85rem var(--lg-glow)' : undefined,
  };
});

const dimStyle = computed(() => ({
  borderRadius: 'inherit',
  background: `rgba(0, 0, 0, ${Math.max(0, Math.min(1, resolved.value.dim))})`,
}));

/** Layer one: frost and saturate. Static — it does not care about the displacement map. */
const blurStyle = computed(() => {
  const { blur, saturate, brightness } = resolved.value;
  // Where refraction is unavailable, this layer carries the whole effect on blur alone.
  const amount = canRefract.value ? blur : Math.max(blur, props.fallbackBlur);
  const parts = [
    amount > 0 ? `blur(${amount}px)` : '',
    saturate !== 1 ? `saturate(${saturate})` : '',
    brightness !== 1 ? `brightness(${brightness})` : '',
  ].filter(Boolean);
  const filter = parts.join(' ');
  return {
    borderRadius: 'inherit',
    backdropFilter: filter || undefined,
    WebkitBackdropFilter: filter || undefined,
  };
});

/**
 * Layer two: bend what layer one produced, in Chromium. Where the pane bends marked
 * content instead, the content itself is filtered and this layer stays empty.
 */
const refractStyle = computed(() =>
  filter.value
    ? { borderRadius: 'inherit', backdropFilter: filter.value, WebkitBackdropFilter: filter.value }
    : { borderRadius: 'inherit' },
);

/** An explicit `tint` wins; otherwise the fill is derived from `tone`. `''` removes it. */
const showTint = computed(() => props.tint !== '');
const tintStyle = computed(() => ({
  borderRadius: 'inherit',
  background: props.tint || 'var(--lg-fill)',
}));

const specularStyle = computed(() =>
  rim.value ? { borderRadius: 'inherit', backgroundImage: rim.value } : { borderRadius: 'inherit' },
);

defineExpose({ supported, mode, map, refresh, variant: computed(() => props.variant) });
</script>

<style scoped>
.liquid-glass {
  /* Light is warmer and stronger over a light page; over a dark one a rim this bright
     reads as a white outline rather than a lit edge. */
  --lg-spec-hi: 0.9;
  --lg-spec-lo: 0.55;
  --lg-inner: 0.1;
  /* The text colour flips with the theme, so the high-contrast edge needs no override. */
  --lg-contrast-edge: var(--color-text);
  /* The painted rim's light, measured from iOS: 0.3 over a light page, 0.13 over a dark one. */
  --lg-rim-shine: 0.3;

  position: relative;
  isolation: isolate;
  transition:
    transform var(--vt-duration) var(--vt-ease),
    box-shadow var(--vt-duration) var(--vt-ease);
}

@media (prefers-color-scheme: dark) {
  .liquid-glass:not([data-theme='light'] *) {
    --lg-spec-hi: 0.72;
    --lg-spec-lo: 0.36;
    --lg-inner: 0.07;
    --lg-rim-shine: 0.13;
  }
}

[data-theme='dark'] .liquid-glass {
  --lg-spec-hi: 0.72;
  --lg-spec-lo: 0.36;
  --lg-inner: 0.07;
  --lg-rim-shine: 0.13;
}

.liquid-glass.is-interactive:hover {
  transform: translateY(-0.125rem);
}

.lg-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
}

.lg-dim {
  z-index: 0;
}

.lg-blur {
  z-index: 1;
}

.lg-refract {
  z-index: 2;
}

.lg-tint {
  z-index: 3;
  /* The tone's own hairline, under the white light of the specular rim. */
  box-shadow: inset 0 0 0 1px var(--lg-edge);
}

/*
  A lit rim, not a border. A uniform ring reads as a stroke; real glass catches light
  on the edges facing the source and again, weaker, on the far side. This is a gradient
  masked down to the rim so the brightness travels around the perimeter.
*/
.lg-specular {
  z-index: 4;
  padding: var(--lg-rim, 1.5px);
  background: linear-gradient(
    var(--lg-angle, 145deg),
    rgba(255, 255, 255, var(--lg-spec-hi)) 0%,
    rgba(255, 255, 255, calc(var(--lg-spec-hi) * 0.18)) 26%,
    rgba(255, 255, 255, 0) 46%,
    rgba(255, 255, 255, calc(var(--lg-spec-lo) * 0.4)) 64%,
    rgba(255, 255, 255, var(--lg-spec-lo)) 100%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
}

/* The painted rim (useLiquidGlass draws it per shape and theme) replaces the gradient. */
.lg-specular.is-painted {
  padding: 0;
  background-size: 100% 100%;
  -webkit-mask: none;
  mask: none;
}

/* The inner glow that gives the pane a thickness rather than an outline. */
.lg-specular::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0.5rem 0.125rem rgba(255, 255, 255, var(--lg-inner));
}

.lg-content {
  position: relative;
  z-index: 5;
}

/*
  Reduced transparency is a legibility request, not a preference about taste: drop the
  see-through entirely and serve an opaque panel rather than a slightly-less-blurry one.
*/
/*
  Reduce Transparency makes glass FROSTIER, not absent. The material stays — the
  backdrop just stops being readable through it. Refraction goes, because bending
  content people asked to see less of is the opposite of the point; heavy frost and a
  denser tint stay, so the pane still reads as a separate layer above the content.
*/
@media (prefers-reduced-transparency: reduce) {
  .lg-refract {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .lg-blur {
    backdrop-filter: blur(var(--lg-frost-heavy)) saturate(1.2) !important;
    -webkit-backdrop-filter: blur(var(--lg-frost-heavy)) saturate(1.2) !important;
  }

  .lg-tint {
    background: var(--lg-fill-dense) !important;
  }
}

/*
  Increase Contrast turns elements "predominantly black/white" and the thing to verify
  is that contrasting BORDERS appear. So: a real border rather than a hairline, the
  tint pushed most of the way to opaque, and the specular rim dropped — a soft gradient
  edge is the opposite of an unambiguous one.
*/
@media (prefers-contrast: more) {
  .lg-tint {
    background: var(--lg-fill-dense) !important;
    box-shadow: inset 0 0 0 2px var(--lg-contrast-edge) !important;
  }

  .lg-specular {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .liquid-glass {
    transition: none;
  }

  .liquid-glass.is-interactive:hover {
    transform: none;
  }
}
</style>

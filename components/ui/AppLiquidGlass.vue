<template>
  <component :is="as" ref="rootRef" class="liquid-glass" :class="rootClass" :style="rootStyle">
    <!-- The filter lives next to the thing it filters; the id is per-instance. -->
    <svg v-if="map" class="lg-defs" aria-hidden="true" focusable="false">
      <filter
        :id="filterId"
        filterUnits="userSpaceOnUse"
        x="0"
        y="0"
        :width="map.width"
        :height="map.height"
        color-interpolation-filters="sRGB"
      >
        <feImage
          :href="map.href"
          x="0"
          y="0"
          :width="map.width"
          :height="map.height"
          result="displacement"
        />

        <!--
          Real glass splits light: the rim of a lens fringes because each wavelength
          bends by a slightly different amount. Displacing the channels by different
          amounts and recombining them reproduces that. It costs three passes instead
          of one, so it is off unless asked for.
        -->
        <template v-if="dispersion > 0">
          <!-- Red bends least, blue most: shorter wavelengths refract harder, which is
               why a prism puts red on the inside of the fan. -->
          <feDisplacementMap
            in="SourceGraphic"
            in2="displacement"
            :scale="channelScales.red"
            xChannelSelector="R"
            yChannelSelector="G"
            result="bentRed"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="displacement"
            :scale="channelScales.green"
            xChannelSelector="R"
            yChannelSelector="G"
            result="bentGreen"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="displacement"
            :scale="channelScales.blue"
            xChannelSelector="R"
            yChannelSelector="G"
            result="bentBlue"
          />
          <!--
            Take one channel from each pass. Every matrix KEEPS alpha: feComposite's
            arithmetic operator works on premultiplied colour, so a pass with alpha 0
            premultiplies to black and contributes nothing at all. The alphas do sum
            past 1, and are clamped back to it — which is correct here, because a
            backdrop is opaque to begin with.
          -->
          <feColorMatrix
            in="bentRed"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="justRed"
          />
          <feColorMatrix
            in="bentGreen"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="justGreen"
          />
          <feColorMatrix
            in="bentBlue"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="justBlue"
          />
          <feComposite in="justRed" in2="justGreen" operator="arithmetic" k2="1" k3="1" result="redGreen" />
          <feComposite in="redGreen" in2="justBlue" operator="arithmetic" k2="1" k3="1" />
        </template>

        <feDisplacementMap
          v-else
          in="SourceGraphic"
          in2="displacement"
          :scale="map.scale"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>

    <!-- Apple's Clear variant is explicitly "placed on top of a dimming layer": with no
         frost of its own, legibility has to come from darkening what is underneath. -->
    <span v-if="resolved.dim > 0" class="lg-layer lg-dim" :style="dimStyle" />

    <!-- Two backdrop layers, not one. This one frosts and saturates; the next samples
         its output and bends it. Blurring after the bend would smear the refraction
         away, which is exactly the detail that separates glass from frosted plastic. -->
    <span class="lg-layer lg-blur" :style="blurStyle" />
    <span class="lg-layer lg-refract" :style="refractStyle" />

    <span v-if="showTint" class="lg-layer lg-tint" :style="tintStyle" />
    <span v-if="specular" class="lg-layer lg-specular" :style="specularStyle" />

    <div class="lg-content">
      <slot :supported="supported" :variant="variant" />
    </div>
  </component>
</template>

<script lang="ts">
import type { GlassProfile } from '@/composables/useLiquidGlass';

export type { GlassProfile };

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
  /** How far the curved bevel reaches in from the edge. The whole effect lives here. */
  bezel?: number;
  /** Glass depth — how far a refracted ray travels before it lands. Drives strength. */
  thickness?: number;
  /** Index of refraction. Air is 1, window glass ~1.5. */
  refractiveIndex?: number;
  profile?: GlassProfile;
  /** Plain radial zoom layered on top of the refraction. 1 leaves the middle alone. */
  magnification?: number;
  /** Ceiling on displacement in px, so a near-vertical bevel cannot blow up. */
  maxDisplacement?: number;
  /** Pixel density of the generated map. 0 picks: full up to 180px, half beyond. */
  resolution?: number;
  /**
   * Chromatic dispersion, as a fraction of the bend — 0.04 splits the channels by 4%.
   * Relative rather than absolute on purpose: the displacement scale swings by an order
   * of magnitude with thickness, so a fixed pixel offset is imperceptible at one end and
   * inverts the blue channel at the other. Real crown glass is around 0.017; past ~0.15
   * it stops reading as glass and starts reading as a broken monitor.
   */
  dispersion?: number;

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
  /** The lit rim. */
  specular?: boolean;
  /** Thickness of that rim in px. */
  rim?: number;
  /** Where the light is coming from, in deg. */
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
  dispersion: 0.04,
  // Left undefined so the variant's baseline decides, and an explicit value still wins.
  blur: undefined,
  saturate: undefined,
  brightness: undefined,
  dim: undefined,
  toneStrength: undefined,
  fallbackBlur: 12,
  tone: '#ffffff',
  tint: undefined,
  specular: true,
  rim: 1.5,
  lightAngle: 145,
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
}));

const { filterId, map, supported, refresh } = useLiquidGlass(rootRef, glassParams, {
  enabled: () => !props.disabled,
});

/** Whether this browser could refract at all — independent of whether the map is ready. */
const canRefract = computed(() => supported.value && !props.disabled);
/** Whether there is actually a filter to point at right now. */
const active = computed(() => canRefract.value && !!map.value);

/**
 * Per-channel displacement. Clamped so the spread can never reach the scale itself:
 * a negative scale does not mean "less bend", it means the channel bends the opposite
 * way, which reads as a hard colour inversion rather than a fringe.
 */
const channelScales = computed(() => {
  const scale = map.value?.scale ?? 0;
  const spread = scale * Math.max(0, Math.min(0.4, props.dispersion));
  return { red: scale - spread, green: scale, blue: scale + spread };
});

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
  const tone = props.tone || '#ffffff';
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
    '--lg-fill-dense': `color-mix(in srgb, ${tone} ${Math.max(strength, 82)}%, var(--color-surface, #ffffff))`,
    '--lg-frost-heavy': `${Math.max(20, resolved.value.blur * 2)}px`,
    '--lg-rim': `${props.rim}px`,
    '--lg-angle': `${props.lightAngle}deg`,
    boxShadow: props.shadow
      ? '0 0.5rem 1.75rem -0.5rem rgba(0, 0, 0, 0.35),' +
        ' 0 0.125rem 0.375rem -0.125rem rgba(0, 0, 0, 0.2),' +
        ' 0 0.5rem 1.5rem -0.85rem var(--lg-glow)'
      : undefined,
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

/** Layer two: bend what layer one produced. Chromium only; elsewhere it renders nothing. */
const refractStyle = computed(() =>
  active.value
    ? {
        borderRadius: 'inherit',
        backdropFilter: `url(#${filterId})`,
        WebkitBackdropFilter: `url(#${filterId})`,
      }
    : { borderRadius: 'inherit' },
);

/** An explicit `tint` wins; otherwise the fill is derived from `tone`. `''` removes it. */
const showTint = computed(() => props.tint !== '');
const tintStyle = computed(() => ({
  borderRadius: 'inherit',
  background: props.tint || 'var(--lg-fill)',
}));

const specularStyle = computed(() => ({ borderRadius: 'inherit' }));

defineExpose({ supported, map, refresh, variant: computed(() => props.variant) });
</script>

<style scoped>
.liquid-glass {
  /* Light is warmer and stronger over a light page; over a dark one a rim this bright
     reads as a white outline rather than a lit edge. */
  --lg-spec-hi: 0.9;
  --lg-spec-lo: 0.55;
  --lg-inner: 0.1;
  --lg-contrast-edge: #000000;

  position: relative;
  isolation: isolate;
  transition:
    transform 0.24s cubic-bezier(0.22, 1.12, 0.36, 1),
    box-shadow 0.24s ease;
}

@media (prefers-color-scheme: dark) {
  .liquid-glass:not([data-theme='light'] *) {
    --lg-spec-hi: 0.72;
    --lg-spec-lo: 0.36;
    --lg-inner: 0.07;
    --lg-contrast-edge: #ffffff;
  }
}

[data-theme='dark'] .liquid-glass {
  --lg-spec-hi: 0.72;
  --lg-spec-lo: 0.36;
  --lg-inner: 0.07;
  --lg-contrast-edge: #ffffff;
}

.liquid-glass.is-interactive:hover {
  transform: translateY(-0.125rem);
}

/* The filter has to be in the document to be referenced, but must never take space. */
.lg-defs {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
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

<template>
  <!--
    The button markup exists once. A tooltip and a glass pane are both optional
    wrappers around it, so each is either the real component or a passthrough that
    renders its children and nothing else — cheaper than repeating the button for
    every combination of the two.
  -->
  <component
    :is="tooltip ? AppTooltip : Passthrough"
    v-bind="tooltip ? { content: tooltip, placement: tooltipPlacement } : {}"
  >
    <component :is="glass ? AppLiquidGlass : Passthrough" v-bind="glass ? glassBinding : {}">
      <button
        :type="type"
        class="btn-base inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-(--vt-duration) ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-(--vt-press-y) active:scale-(--vt-press-scale) disabled:pointer-events-none disabled:opacity-45"
        :class="[
          sizeClass,
          glass ? glassVariantClass : variantClass,
          gapClass,
          fullWidth && 'w-full',
        ]"
        :disabled="disabled || loading"
        :aria-busy="loading || undefined"
        :aria-label="iconOnly ? label || tooltip || undefined : undefined"
        v-bind="$attrs"
      >
        <AppSpinner v-if="loading" :size="spinnerSize" class="shrink-0" />
        <AppIcon v-else-if="icon" :name="icon" :size="iconSize" class="shrink-0" />
        <span v-if="!iconOnly && (label || $slots.default)" class="truncate">
          <slot>{{ loading && loadingLabel ? loadingLabel : label }}</slot>
        </span>
      </button>
    </component>
  </component>
</template>

<script setup lang="ts">
import { computed, type FunctionalComponent } from "vue";
import AppTooltip from "./AppTooltip.vue";
import AppIcon from "./AppIcon.vue";
import AppSpinner from "./AppSpinner.vue";
import AppLiquidGlass from "./AppLiquidGlass.vue";

defineOptions({ inheritAttrs: false });

/** Renders its children and adds nothing — stands in for an absent wrapper. */
const Passthrough: FunctionalComponent = (_props, { slots }) => slots.default?.();

const props = withDefaults(
  defineProps<{
    variant?:
      | "primary"
      | "accent"
      | "secondary"
      | "ghost"
      | "muted"
      | "danger"
      | "success"
      | "surface"
      | "outline";
    icon?: string;
    label?: string;
    tooltip?: string;
    tooltipPlacement?: "top" | "bottom" | "start" | "end";
    iconOnly?: boolean;
    size?: "xs" | "sm" | "md" | "lg";
    fullWidth?: boolean;
    disabled?: boolean;
    loading?: boolean;
    loadingLabel?: string;
    type?: "button" | "submit" | "reset";
    /**
     * Sits the button on a refracting glass pane. The variant still drives it — its
     * colour moves down into the glass, tinting the fill, the lit rim and the glow —
     * it just gives up its opaque background, which would bury the backdrop the whole
     * effect is made of.
     */
    glass?: boolean;
    /**
     * Whether the variant's colour reaches the pane. Off leaves plain glass — and the
     * label goes white, because a variant colour with no colour behind it has nothing
     * left to sit against.
     */
    glassTone?: boolean;
    /**
     * Which Apple variant the pane uses. `regular` frosts and stays legible over
     * anything; `clear` is transparent and wants a busy backdrop under it.
     */
    glassVariant?: "regular" | "clear";
    /** Blur behind the glass, in px. Defaults to the variant's baseline. */
    glassBlur?: number;
  }>(),
  {
    variant: "ghost",
    icon: "",
    label: "",
    tooltip: "",
    tooltipPlacement: "top",
    iconOnly: false,
    size: "sm",
    fullWidth: false,
    disabled: false,
    loading: false,
    loadingLabel: "",
    type: "button",
    glass: false,
    glassTone: true,
    glassVariant: "regular",
    glassBlur: undefined,
  },
);

const sizeClass = computed(() => {
  if (props.iconOnly && !props.fullWidth) {
    return {
      xs: "size-[calc(var(--spacing-control-sm)*0.8)] text-xs",
      sm: "size-control-sm text-sm",
      md: "size-control-md text-control",
      lg: "size-control-lg text-base",
    }[props.size];
  }
  // Heights and padding come from the density tokens, so the Console preset reaches every button.
  return {
    xs: "h-[calc(var(--spacing-control-sm)*0.8)] px-2.5 text-xs",
    sm: "h-control-sm px-3 text-sm",
    md: "h-control-md px-control-pad text-control",
    lg: "h-control-lg px-6 text-base",
  }[props.size];
});

const gapClass = computed(() => {
  if (props.iconOnly) return "gap-0";
  return { xs: "gap-1", sm: "gap-1.5", md: "gap-2", lg: "gap-2.5" }[props.size];
});

const variantClass = computed(
  () =>
    ({
      // The five variants in DESIGN.md. `accent`, `muted`, `surface` and `success` stay as
      // aliases so existing call sites keep working.
      primary: "bg-accent text-accent-fg hover:bg-accent-hover",
      accent: "bg-accent text-accent-fg hover:bg-accent-hover",
      secondary: "bg-muted text-text hover:bg-[color-mix(in_srgb,var(--color-muted),var(--color-text)_8%)]",
      outline: "border border-border-strong bg-surface text-text hover:bg-muted",
      ghost: "text-text hover:bg-muted",
      danger: "bg-danger text-danger-fg hover:bg-danger-hover",
      muted: "bg-muted text-text-muted hover:text-text",
      surface: "border border-border bg-surface text-text hover:bg-muted",
      success: "bg-success text-success-fg hover:bg-[color-mix(in_srgb,var(--color-success),black_12%)]",
    })[props.variant],
);

/**
 * On glass the variant gives up its *fill* — an opaque background would bury the
 * backdrop the effect is made of — but not its identity. The colour moves down into the
 * pane, where it tints the glass, the lit rim and the glow, so a danger button still
 * reads as danger from the edge in. The button itself only keeps the foreground.
 */
const glassVariantClass = computed(() => {
  const base = "bg-transparent shadow-none hover:bg-white/10 active:bg-white/5";
  const edge = props.variant === "outline" ? " border border-white/25" : "";

  // Untoned glass has no colour for a variant foreground to sit against, so the label
  // goes white and legibility comes from the backdrop instead.
  if (!props.glassTone) return `${base} text-white${edge}`;

  const foreground = {
    primary: "text-accent-text",
    accent: "text-accent-text",
    secondary: "text-text",
    ghost: "text-text",
    muted: "text-text-muted",
    danger: "text-danger-text",
    success: "text-success",
    surface: "text-text",
    outline: "text-text",
  }[props.variant];

  return `${base} ${foreground}${edge}`;
});

/** The colour the pane takes on, and how much of it ends up in the fill. */
const GLASS_TONES: Record<NonNullable<typeof props.variant>, { tone: string; strength: number }> = {
  primary: { tone: "var(--color-accent-text)", strength: 22 },
  accent: { tone: "var(--color-accent-text)", strength: 22 },
  secondary: { tone: "var(--color-text-muted)", strength: 22 },
  danger: { tone: "var(--color-danger)", strength: 24 },
  success: { tone: "var(--color-success)", strength: 24 },
  // The quiet variants stay quiet: plain glass, at the strength each already implied.
  ghost: { tone: "#ffffff", strength: 8 },
  muted: { tone: "#ffffff", strength: 14 },
  surface: { tone: "#ffffff", strength: 20 },
  outline: { tone: "#ffffff", strength: 6 },
};

/** A control sits on top of everything, so it wants less frost than a full pane. */
const glassBlurValue = computed(
  () => props.glassBlur ?? (props.glassVariant === "clear" ? 0 : 8),
);

/** Matches the pane's corners to the button's own rounding. */
const glassRadius = computed(() => {
  if (props.iconOnly) return 8;
  return { xs: 6, sm: 8, md: 8, lg: 12 }[props.size];
});

const glassBinding = computed(() => {
  const { tone, strength } = GLASS_TONES[props.variant];
  return {
    as: "span",
    radius: glassRadius.value,
    // A control is small, so the bevel has to stay tight or it swallows the whole face.
    bezel: Math.min(12, glassRadius.value + 4),
    thickness: 14,
    profile: "squircle" as const,
    variant: props.glassVariant,
    blur: glassBlurValue.value,
    // Dispersion is invisible at this size and costs three filter passes per button.
    dispersion: 0,
    saturate: 1.5,
    brightness: 1.06,
    rim: 1,
    fallbackBlur: Math.max(6, glassBlurValue.value),
    // The weight of the variant survives with the colour off; only the hue goes.
    tone: props.glassTone ? tone : "#ffffff",
    toneStrength: props.disabled || props.loading ? Math.round(strength / 2) : strength,
    shadow: !props.disabled,
    class: ["btn-glass", props.fullWidth && "w-full"],
  };
});

const iconSize = computed(
  () => ({ xs: 0.75, sm: 1, md: 1.125, lg: 1.25 })[props.size],
);
const spinnerSize = computed(
  () => (({ xs: "xs", sm: "xs", md: "sm", lg: "sm" }) as const)[props.size],
);
</script>

<style scoped>
.btn-base:not(:disabled):active {
  transform: scale(0.97);
}

/* The pane has to lay out like the button it wraps, or it breaks inline flows. */
.btn-glass {
  display: inline-flex;
  vertical-align: middle;
}
</style>

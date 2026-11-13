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
        ref="buttonEl"
        :type="type"
        class="btn-base inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-(--vt-duration) ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-(--vt-press-y) active:scale-(--vt-press-scale) disabled:pointer-events-none"
        :class="[
          sizeClass,
          glass ? glassVariantClass : variantClass,
          gapClass,
          fullWidth && 'w-full',
          (disabled || busy) && 'opacity-45',
          holdMs && 'relative isolate overflow-hidden [-webkit-touch-callout:none]',
        ]"
        :disabled="disabled || loading || busy"
        :aria-busy="loading || undefined"
        :aria-label="iconOnly ? label || tooltip || undefined : undefined"
        v-bind="buttonAttrs"
        :aria-describedby="describedBy"
        v-on="holdListeners"
      >
        <!-- The hold fill: one layer that grows on scaleX, under the label (isolate + -z-10). -->
        <span
          v-if="holdMs && !reduced"
          aria-hidden="true"
          data-hold-fill
          class="pointer-events-none absolute inset-0 -z-10 origin-left rtl:origin-right"
          :class="holdFillClass"
          :style="{ transform: `scaleX(${progress})` }"
        />
        <!-- Reduced motion: no sweep; the seconds left are counted in the label's place. -->
        <span
          v-if="counting"
          aria-hidden="true"
          data-hold-count
          class="absolute inset-0 flex items-center justify-center tabular-nums"
        >{{ count }}</span>
        <!-- Idle, busy and success cross-fade through AppSwap instead of snapping. -->
        <AppSwap :swap-key="face" class="min-w-0" :class="counting && 'invisible'">
          <span class="inline-flex min-w-0 items-center" :class="gapClass">
            <AppSpinner v-if="face === 'busy'" :size="spinnerSize" class="shrink-0" />
            <AppIcon v-else-if="face === 'success'" name="icon-[heroicons--check]" :size="iconSize" class="shrink-0" />
            <AppIcon v-else-if="icon" :name="icon" :size="iconSize" class="shrink-0" />
            <span v-if="!iconOnly && (label || $slots.default)" class="truncate">
              <slot>{{ faceLabel }}</slot>
            </span>
          </span>
        </AppSwap>
        <!-- Hidden from view and from the name, still read as the description (aria-describedby). -->
        <span v-if="holdMs" :id="hintId" hidden>{{ holdHintText }}</span>
      </button>
    </component>
  </component>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useAttrs, useId, watch, type FunctionalComponent } from "vue";
import AppTooltip from "./AppTooltip.vue";
import AppIcon from "./AppIcon.vue";
import AppSpinner from "./AppSpinner.vue";
import AppLiquidGlass from "./AppLiquidGlass.vue";
import AppSwap from "./AppSwap.vue";
import { useAnnouncer } from "@/composables/useAnnouncer";
import { useReducedMotion } from "@/composables/useReducedMotion";

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
    /**
     * The request is running. `aria-busy` and `disabled` follow it at once; the spinner (and
     * `loadingLabel`) waits 150ms and then stays at least 400ms, so a fast request never flashes.
     */
    loading?: boolean;
    loadingLabel?: string;
    /**
     * Turning this on flashes the success face for 1.2s: a check and `successLabel`, announced
     * politely, then back to the label. Set it when the request behind `loading` succeeds.
     */
    success?: boolean;
    /** Label while the success face shows ("Saved"). Defaults to `label`. */
    successLabel?: string;
    type?: "button" | "submit" | "reset";
    /**
     * Hold to confirm: `@click` (and a submit) fires only after the button is held down this
     * long, in ms; `true` is 1500ms. Pointer, Space and Enter all hold; letting go early drains
     * the fill and nothing happens.
     */
    hold?: boolean | number;
    /** The instruction read to screen readers on a hold button. Defaults to "Press and hold for 1.5 seconds to confirm. …". */
    holdHint?: string;
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
    success: false,
    successLabel: "",
    type: "button",
    hold: false,
    holdHint: "",
    glass: false,
    glassTone: true,
    glassVariant: "regular",
    glassBlur: undefined,
  },
);

const emit = defineEmits<{
  /** A hold was let go (or Escaped) before it completed. */
  holdCancel: [];
}>();

const attrs = useAttrs();
const buttonEl = ref<HTMLButtonElement | null>(null);
const reduced = useReducedMotion();

/* ---------------------------------------------------------------- loading timing */

/** Below this a request reads as instant, so it gets no spinner at all. */
const SPINNER_DELAY = 150;
/** Once shown, the spinner stays this long, so it never blinks on and off. */
const SPINNER_MIN = 400;

/** What the eye sees: the spinner (and the dimmed face). `loading` is what is true. */
const busy = ref(false);
let shownAt = 0;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.loading,
  (on) => {
    if (on) {
      clearTimeout(hideTimer);
      if (busy.value) return;
      showTimer = setTimeout(() => {
        busy.value = true;
        shownAt = Date.now();
      }, SPINNER_DELAY);
      return;
    }
    clearTimeout(showTimer);
    if (!busy.value) return;
    const left = SPINNER_MIN - (Date.now() - shownAt);
    if (left <= 0) busy.value = false;
    else hideTimer = setTimeout(() => (busy.value = false), left);
  },
  { immediate: true },
);

/* ---------------------------------------------------------------- success */

const SUCCESS_MS = 1200;
const { announce } = useAnnouncer();
const flash = ref(false);
let flashTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.success,
  (on) => {
    if (!on) return;
    flash.value = true;
    announce(props.successLabel || props.label || "Done");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (flash.value = false), SUCCESS_MS);
  },
);

/** What the face shows. The spinner wins: a new request hides the last success at once. */
const face = computed(() => (busy.value ? "busy" : flash.value ? "success" : "idle"));
const faceLabel = computed(() => {
  if (face.value === "busy" && props.loadingLabel) return props.loadingLabel;
  if (face.value === "success" && props.successLabel) return props.successLabel;
  return props.label;
});

/* ---------------------------------------------------------------- hold to confirm */

/** A hold drains this many times faster than it fills, so a second try starts near zero. */
const DRAIN = 2.5;
const DEFAULT_HOLD = 1500;

const holdMs = computed(() => {
  if (props.hold === true) return DEFAULT_HOLD;
  return typeof props.hold === "number" && props.hold > 0 ? props.hold : 0;
});

const progress = ref(0);
const holding = ref(false);
let done = false;
/** Set for the one click the completed hold dispatches; every other click is swallowed. */
let armed = false;
let raf = 0;
let last = 0;

const counting = computed(() => holding.value && reduced.value);
const count = computed(() => Math.max(1, Math.ceil(((1 - progress.value) * holdMs.value) / 1000)));

const hintId = useId();
const holdHintText = computed(() => {
  if (props.holdHint) return props.holdHint;
  const seconds = Number((holdMs.value / 1000).toFixed(1));
  return `Press and hold for ${seconds} ${seconds === 1 ? "second" : "seconds"} to confirm. Letting go early cancels.`;
});

function tick(now: number) {
  const dt = now - last;
  last = now;
  if (holding.value) {
    progress.value = Math.min(1, progress.value + dt / holdMs.value);
    if (progress.value >= 1) return complete();
  } else {
    progress.value = Math.max(0, progress.value - (dt * DRAIN) / holdMs.value);
  }
  raf = holding.value || progress.value > 0 ? requestAnimationFrame(tick) : 0;
}

function start() {
  if (!holdMs.value || props.disabled || props.loading || busy.value || holding.value) return;
  if (done) reset();
  holding.value = true;
  last = performance.now();
  if (!raf) raf = requestAnimationFrame(tick);
}

function release() {
  if (done) return reset();
  if (!holding.value) return;
  holding.value = false;
  emit("holdCancel");
  // Reduced motion shows no drain: the count simply goes away.
  if (reduced.value) reset();
}

function reset() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  holding.value = false;
  done = false;
  progress.value = 0;
}

function complete() {
  raf = 0;
  holding.value = false;
  done = true;
  progress.value = 1;
  // A real click, so `type="submit"` submits and every @click listener runs as usual.
  armed = true;
  buttonEl.value?.click();
  armed = false;
}

/** The parent's click listeners, which a hold button calls itself once the hold completes. */
function forwardClick(event: MouseEvent) {
  const handler = attrs.onClick as ((e: MouseEvent) => void) | ((e: MouseEvent) => void)[] | undefined;
  for (const fn of Array.isArray(handler) ? handler : handler ? [handler] : []) fn(event);
}

const isHoldKey = (e: KeyboardEvent) => e.key === " " || e.key === "Enter";

const holdListeners = computed(() =>
  holdMs.value
    ? {
        click: (e: MouseEvent) => {
          // A plain click, a tap, a screen reader's activation: none of them is a hold.
          if (!armed) return e.preventDefault();
          forwardClick(e);
        },
        pointerdown: (e: PointerEvent) => e.button === 0 && start(),
        pointerup: release,
        pointerleave: release,
        pointercancel: release,
        // A long press on touch would open the callout or context menu instead.
        contextmenu: (e: Event) => e.preventDefault(),
        keydown: (e: KeyboardEvent) => {
          if (isHoldKey(e)) {
            e.preventDefault();
            if (!e.repeat) start();
          } else if (e.key === "Escape" && (holding.value || progress.value > 0)) {
            if (holding.value) emit("holdCancel");
            reset();
          }
        },
        keyup: (e: KeyboardEvent) => isHoldKey(e) && release(),
        blur: release,
      }
    : {},
);

const buttonAttrs = computed(() => {
  if (!holdMs.value) return attrs;
  const { onClick: _onClick, ...rest } = attrs;
  return rest;
});

const describedBy = computed(
  () =>
    [attrs["aria-describedby"] as string | undefined, holdMs.value ? hintId : ""].filter(Boolean).join(" ") ||
    undefined,
);

// Turning busy or disabled mid-hold (often the click itself does it) ends the hold.
watch(
  () => props.disabled || props.loading || !holdMs.value,
  (off) => off && reset(),
);

onBeforeUnmount(() => {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  clearTimeout(flashTimer);
  if (raf) cancelAnimationFrame(raf);
});

/** The fill moves away from the label colour, so the label only gains contrast as it grows. */
const holdFillClass = computed(() => {
  if (props.glass) return "bg-[color-mix(in_srgb,currentColor_22%,transparent)]";
  return {
    primary: "bg-[color-mix(in_srgb,var(--color-accent-hover),var(--color-text)_50%)]",
    accent: "bg-[color-mix(in_srgb,var(--color-accent-hover),var(--color-text)_50%)]",
    danger: "bg-[color-mix(in_srgb,var(--color-danger-hover),black_30%)]",
    success: "bg-[color-mix(in_srgb,var(--color-success),black_30%)]",
    secondary: "bg-[color-mix(in_srgb,var(--color-muted),var(--color-text)_16%)]",
    outline: "bg-[color-mix(in_srgb,var(--color-muted),var(--color-text)_16%)]",
    ghost: "bg-[color-mix(in_srgb,var(--color-muted),var(--color-text)_16%)]",
    surface: "bg-[color-mix(in_srgb,var(--color-muted),var(--color-text)_16%)]",
    muted: "bg-[color-mix(in_srgb,var(--color-muted),var(--color-text)_16%)]",
  }[props.variant];
});

/* ---------------------------------------------------------------- look */

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
    toneStrength: props.disabled || busy.value ? Math.round(strength / 2) : strength,
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

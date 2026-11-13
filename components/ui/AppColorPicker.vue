<template>
  <div
    ref="rootRef"
    role="group"
    :aria-labelledby="labelId"
    class="flex w-full min-w-0 flex-col gap-3"
  >
    <!-- The name stays readable when disabled (muted, not faded): only the controls dim. -->
    <span :id="labelId" class="text-control font-medium" :class="disabled ? 'text-text-muted' : 'text-text'">{{ label }}</span>
    <div class="flex min-w-0 flex-col gap-3" :class="disabled ? 'opacity-45' : ''">

    <!-- The plane is a picture of a colour space, not text, so it does not mirror in RTL: white
         stays on the left, black at the bottom, and each arrow key moves the way it points. -->
    <div
      ref="areaRef"
      dir="ltr"
      class="relative h-40 w-full touch-none select-none rounded-lg border border-border [container-type:size]"
      :class="disabled ? 'cursor-not-allowed' : 'cursor-crosshair'"
      :style="{ backgroundImage: planeImage }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @lostpointercapture="endDrag"
    >
      <span
        ref="thumbRef"
        role="slider"
        :tabindex="disabled ? -1 : 0"
        aria-roledescription="2D slider"
        :aria-label="areaLabel"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(hsv.s)"
        :aria-valuetext="areaText"
        :aria-disabled="disabled ? 'true' : undefined"
        class="absolute start-0 top-0 block size-5 rounded-full border border-text bg-surface p-0.5"
        :class="glide && !reduced ? 'transition-[translate] duration-(--vt-duration) ease-standard motion-reduce:transition-none' : ''"
        :style="{ translate: `calc(${hsv.s / 100} * 100cqw - 50%) calc(${1 - hsv.v / 100} * 100cqh - 50%)` }"
        @keydown="onAreaKey"
      >
        <span aria-hidden="true" class="block size-full rounded-full" :style="{ backgroundColor: hex }" />
      </span>
    </div>

    <AppSlider
      :model-value="Math.round(hsv.h)"
      label="Hue"
      :min="0"
      :max="360"
      :format="degrees"
      :disabled="disabled"
      :style="hueTrack"
      @update:model-value="(v) => update({ h: v as number })"
      @change="settle"
    />

    <div class="flex items-end gap-2">
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <label :for="hexId" class="text-sm font-medium text-text">Hex</label>
        <div
          class="flex h-control-md items-center gap-1.5 rounded-md border bg-surface ps-3 pe-2 transition-colors duration-(--vt-duration) focus-within:outline-2 focus-within:-outline-offset-1"
          :class="[
            hexError ? 'border-danger-text focus-within:outline-danger-text' : 'border-border-strong focus-within:outline-ring',
            disabled ? 'bg-muted' : 'hover:border-[color-mix(in_srgb,var(--color-border-strong),var(--color-text)_25%)]',
          ]"
        >
          <span aria-hidden="true" class="size-4 shrink-0 rounded-sm border border-border-strong" :style="{ backgroundColor: hex }" />
          <span aria-hidden="true" class="font-mono text-control text-text-subtle">#</span>
          <input
            :id="hexId"
            :value="hexDraft ?? hex.slice(1)"
            :disabled="disabled"
            maxlength="7"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="characters"
            :aria-invalid="hexError ? 'true' : undefined"
            :aria-describedby="hexError ? hexErrorId : undefined"
            class="h-full min-w-0 flex-1 bg-transparent font-mono text-control text-text outline-none disabled:cursor-not-allowed"
            @input="onHexInput"
            @change="onHexCommit"
            @keydown.esc="cancelHex"
          />
        </div>
      </div>
      <AppButton
        v-if="canEyedrop"
        variant="outline"
        size="md"
        icon-only
        icon="icon-[heroicons--eye-dropper]"
        :label="eyedropperLabel"
        :disabled="disabled"
        @click="pickFromScreen"
      />
    </div>
    <p v-if="hexError" :id="hexErrorId" class="-mt-1.5 flex items-start gap-1.5 text-sm text-danger-text">
      <AppIcon name="icon-[heroicons--exclamation-circle]" :size="1" class="mt-0.5" aria-hidden="true" />
      {{ hexError }}
    </p>

    <div v-if="showRgb" class="grid grid-cols-3 gap-2">
      <div v-for="c in CHANNELS" :key="c.key" class="flex min-w-0 flex-col gap-1.5">
        <label :for="`${hexId}-${c.key}`" class="text-sm font-medium text-text">{{ c.label }}</label>
        <input
          :id="`${hexId}-${c.key}`"
          type="number"
          inputmode="numeric"
          min="0"
          max="255"
          step="1"
          :value="rgb[c.key]"
          :disabled="disabled"
          class="h-control-md w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 font-mono text-control tabular-nums text-text [appearance:textfield] transition-colors duration-(--vt-duration) hover:border-[color-mix(in_srgb,var(--color-border-strong),var(--color-text)_25%)] focus-visible:-outline-offset-1 disabled:cursor-not-allowed disabled:bg-muted [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          @input="onChannelInput(c.key, $event)"
          @change="onChannelCommit(c.key, $event)"
        />
      </div>
    </div>

    <fieldset v-if="swatchList.length" :disabled="disabled" class="min-w-0">
      <legend class="text-sm font-medium text-text">{{ swatchesLabel }}</legend>
      <!-- 32px boxes, 12px apart: each box's ::after reaches 44px, so the hit areas meet but never overlap. -->
      <div class="mt-1.5 flex flex-wrap gap-3 p-1.5">
        <label
          v-for="s in swatchList"
          :key="s.hex"
          class="relative block size-8 rounded-sm border border-border-strong after:absolute after:-inset-1.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
          :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
          :style="{ backgroundColor: s.hex }"
        >
          <input
            type="radio"
            class="sr-only"
            :name="swatchName"
            :value="s.hex"
            :checked="s.hex === hex"
            :aria-label="s.name"
            @change="pick(s.hex)"
          />
          <AppIcon
            v-if="s.hex === hex"
            name="icon-[heroicons--check]"
            :size="1.125"
            class="absolute inset-0 m-auto"
            :style="{ color: s.mark }"
            aria-hidden="true"
          />
        </label>
      </div>
    </fieldset>
    </div>
  </div>
</template>

<script lang="ts">
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsv {
  /** 0–360 */
  h: number;
  /** 0–100 */
  s: number;
  /** 0–100 */
  v: number;
}

/** `#abc`, `abc`, `#aabbcc` or `aabbcc` → `#AABBCC`; anything else → null. */
export const normalizeHex = (input: string | null | undefined): string | null => {
  const raw = (input ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) return `#${[...raw].map((c) => c + c).join('')}`.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw}`.toUpperCase();
  return null;
};

export const hexToRgb = (hex: string): Rgb | null => {
  const n = normalizeHex(hex);
  if (!n) return null;
  return { r: parseInt(n.slice(1, 3), 16), g: parseInt(n.slice(3, 5), 16), b: parseInt(n.slice(5, 7), 16) };
};

export const rgbToHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

export const rgbToHsv = ({ r, g, b }: Rgb): Hsv => {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const d = max - Math.min(rr, gg, bb);
  let h = 0;
  if (d) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? (d / max) * 100 : 0, v: max * 100 };
};

export const hsvToRgb = ({ h, s, v }: Hsv): Rgb => {
  const ss = s / 100;
  const vv = v / 100;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((vv - vv * ss * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return { r: f(5), g: f(3), b: f(1) };
};

const HUES: [number, string][] = [
  [15, 'red'],
  [40, 'orange'],
  [65, 'yellow'],
  [80, 'lime'],
  [160, 'green'],
  [185, 'teal'],
  [200, 'cyan'],
  [255, 'blue'],
  [275, 'violet'],
  [300, 'purple'],
  [330, 'magenta'],
  [345, 'pink'],
  [360, 'red'],
];

/**
 * A rough name a person would use ("dark blue", "pale pink", "light grey"), from HSL. It is a
 * description for screen readers and swatch labels, not a colour standard.
 */
export const colorName = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d < 0.06 || s < 0.1) {
    if (l < 0.1) return 'black';
    if (l > 0.95) return 'white';
    return l < 0.35 ? 'dark grey' : l > 0.7 ? 'light grey' : 'grey';
  }
  const h = rgbToHsv(rgb).h;
  let hue = HUES.find(([end]) => h < end)?.[1] ?? 'red';
  if ((hue === 'orange' || hue === 'yellow') && l < 0.4) hue = 'brown';
  // Brown is already a dark orange, so only a very dark one says so.
  const tone =
    hue === 'brown'
      ? l < 0.15 ? 'very dark ' : ''
      : l < 0.22 ? 'very dark ' : l < 0.4 ? 'dark ' : l > 0.85 ? 'pale ' : l > 0.65 ? 'light ' : '';
  const muted = s < 0.3 && hue !== 'brown' ? 'greyish ' : '';
  return `${tone}${muted}${hue}`;
};
</script>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, useId, watch } from 'vue';
import AppButton from './AppButton.vue';
import AppIcon from './AppIcon.vue';
import AppSlider from './AppSlider.vue';
import { useReducedMotion } from '../../composables/useReducedMotion';

const props = withDefaults(
  defineProps<{
    /** The colour as hex (`#RRGGBB`). Emitted uppercase, six digits. */
    modelValue?: string;
    /** Visible name of the picker; names its group. */
    label?: string;
    /** Preset colours, as hex, offered as a radio group under the inputs. */
    swatches?: string[];
    swatchesLabel?: string;
    /** Show the Red / Green / Blue fields. */
    showRgb?: boolean;
    /** Offer the screen eyedropper where the browser has `EyeDropper` (Chromium). Hidden elsewhere. */
    eyedropper?: boolean;
    eyedropperLabel?: string;
    /** Name of the saturation / brightness plane, read before its value. */
    areaLabel?: string;
    disabled?: boolean;
  }>(),
  {
    modelValue: undefined,
    label: 'Colour',
    swatches: () => [],
    swatchesLabel: 'Swatches',
    showRgb: true,
    eyedropper: true,
    eyedropperLabel: 'Pick a colour from the screen',
    areaLabel: 'Saturation and brightness',
    disabled: false,
  },
);

const emit = defineEmits<{
  /** Every change, while dragging too. */
  'update:modelValue': [value: string];
  /** A finished change: drag released, key pressed, field committed, swatch or eyedropper picked. */
  change: [value: string];
}>();

const id = useId();
const labelId = `${id}-label`;
const hexId = `${id}-hex`;
const hexErrorId = `${id}-hex-error`;
const swatchName = `${id}-swatch`;

const rootRef = ref<HTMLElement | null>(null);
const areaRef = ref<HTMLElement | null>(null);
const thumbRef = ref<HTMLElement | null>(null);
const reduced = useReducedMotion();

// token-scan: off
// The ends of the colour space, not theme colours: the plane fades to white and to black
// whatever the preset, or it would stop being a picture of the colours it picks.
const BLACK = 'rgb(0 0 0)';
const BLACK_CLEAR = 'rgb(0 0 0 / 0)';
const WHITE = 'rgb(255 255 255)';
// token-scan: on

// HSV is the state, not the hex: a grey has no hue and black has no saturation, so deriving
// them back from the hex would throw the thumb and the hue slider to 0 on every grey.
const hsv = reactive<Hsv>({ h: 0, s: 0, v: 0 });
// The thumb glides to a colour picked by swatch, field or eyedropper, and tracks the pointer
// and the keys directly. Reduced motion drops the glide.
const glide = ref(false);
const hex = computed(() => rgbToHex(hsvToRgb(hsv)));
const rgb = computed(() => hsvToRgb(hsv));

const adopt = (value: string | undefined) => {
  const parsed = value ? hexToRgb(value) : null;
  if (!parsed) return;
  const next = rgbToHsv(parsed);
  if (next.v > 0) {
    if (next.s > 0) hsv.h = next.h;
    hsv.s = next.s;
  }
  hsv.v = next.v;
};
adopt(props.modelValue);

// The last colour the app knows as finished: `change` reports a colour once, and only when it
// differs. A field applies live while it is typed, so its commit cannot go by "did this call
// change the hex".
let settled = hex.value;
function settle() {
  if (hex.value === settled) return;
  settled = hex.value;
  emit('change', hex.value);
}

watch(
  () => props.modelValue,
  (value) => {
    const n = normalizeHex(value);
    if (n && n !== hex.value) {
      glide.value = true;
      adopt(n);
      settled = hex.value;
    }
  },
);

/** Applies a change and emits it. Returns whether the hex changed. */
function update(next: Partial<Hsv>, opts: { change?: boolean; glide?: boolean } = {}): boolean {
  if (props.disabled) return false;
  glide.value = !!opts.glide;
  const before = hex.value;
  Object.assign(hsv, next);
  const changed = hex.value !== before;
  if (changed || normalizeHex(props.modelValue) !== hex.value) emit('update:modelValue', hex.value);
  if (opts.change) settle();
  return changed;
}

const setFromHex = (value: string) => {
  const parsed = hexToRgb(value);
  if (!parsed) return;
  const next = rgbToHsv(parsed);
  update(
    { h: next.s > 0 && next.v > 0 ? next.h : hsv.h, s: next.v > 0 ? next.s : hsv.s, v: next.v },
    { change: true, glide: true },
  );
};

const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

/* ---------- The plane ---------- */

const hueHex = computed(() => rgbToHex(hsvToRgb({ h: hsv.h, s: 100, v: 100 })));
const planeImage = computed(
  () => `linear-gradient(to top, ${BLACK}, ${BLACK_CLEAR}), linear-gradient(to right, ${WHITE}, ${hueHex.value})`,
);

const areaText = computed(
  () => `${capitalize(colorName(hex.value))}, saturation ${Math.round(hsv.s)}%, brightness ${Math.round(hsv.v)}%`,
);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function onAreaKey(event: KeyboardEvent) {
  if (props.disabled) return;
  const step = event.shiftKey ? 10 : 1;
  const moves: Record<string, Partial<Hsv>> = {
    ArrowRight: { s: clamp100(hsv.s + step) },
    ArrowLeft: { s: clamp100(hsv.s - step) },
    ArrowUp: { v: clamp100(hsv.v + step) },
    ArrowDown: { v: clamp100(hsv.v - step) },
    PageUp: { v: clamp100(hsv.v + 10) },
    PageDown: { v: clamp100(hsv.v - 10) },
    Home: { s: 0 },
    End: { s: 100 },
  };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  update(move, { change: true });
}

let dragging = false;

function fromPointer(event: PointerEvent) {
  const area = areaRef.value;
  if (!area || !area.clientWidth || !area.clientHeight) return;
  const rect = area.getBoundingClientRect();
  const x = (event.clientX - rect.left - area.clientLeft) / area.clientWidth;
  const y = (event.clientY - rect.top - area.clientTop) / area.clientHeight;
  update({ s: clamp100(x * 100), v: clamp100((1 - y) * 100) });
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled || event.button !== 0) return;
  event.preventDefault();
  thumbRef.value?.focus({ preventScroll: true });
  if (event.pointerId !== undefined) areaRef.value?.setPointerCapture?.(event.pointerId);
  dragging = true;
  fromPointer(event);
}

function onPointerMove(event: PointerEvent) {
  if (dragging) fromPointer(event);
}

function endDrag() {
  if (!dragging) return;
  dragging = false;
  settle();
}

/* ---------- Hue ---------- */

const degrees = (v: number) => `${v}°`;

// The hue strip is painted on AppSlider's input. A native range runs from the end edge in RTL,
// so the strip has to run that way too, or the thumb would sit on the wrong colour.
const rtl = ref(false);
const hueTrack = computed(() => {
  const stops = [0, 60, 120, 180, 240, 300, 360].map((h) => rgbToHex(hsvToRgb({ h, s: 100, v: 100 })));
  return {
    backgroundImage: `linear-gradient(to ${rtl.value ? 'left' : 'right'}, ${stops.join(', ')})`,
    // The thumb's centre stops half a thumb short of each end, so the strip does too.
    backgroundSize: 'calc(100% - 1.125rem) 0.5rem',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
});

/* ---------- Hex and RGB fields ---------- */

const hexDraft = ref<string | null>(null);
const hexError = ref('');

function onHexInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  hexDraft.value = value;
  hexError.value = '';
  // Applied live once it is six digits; three-digit shorthand waits for the commit, since it is
  // also the first half of a six-digit value being typed.
  if (value.replace(/^#/, '').length === 6 && normalizeHex(value)) {
    update({ ...hsvOf(value) }, { glide: true });
  }
}

function onHexCommit() {
  if (hexDraft.value === null) return;
  const n = normalizeHex(hexDraft.value);
  if (!n) {
    hexError.value = 'Enter 3 or 6 hex digits, such as 1F6E5A.';
    return;
  }
  hexDraft.value = null;
  hexError.value = '';
  setFromHex(n);
}

function cancelHex() {
  hexDraft.value = null;
  hexError.value = '';
}

const hsvOf = (value: string): Partial<Hsv> => {
  const next = rgbToHsv(hexToRgb(value)!);
  return { h: next.s > 0 && next.v > 0 ? next.h : hsv.h, s: next.v > 0 ? next.s : hsv.s, v: next.v };
};

const CHANNELS = [
  { key: 'r', label: 'Red' },
  { key: 'g', label: 'Green' },
  { key: 'b', label: 'Blue' },
] as const;

function channelValue(event: Event): number | null {
  const raw = (event.target as HTMLInputElement).value;
  if (raw === '' || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function onChannelInput(key: keyof Rgb, event: Event) {
  const n = channelValue(event);
  if (n === null || n > 255) return;
  update(hsvOf(rgbToHex({ ...rgb.value, [key]: n })), { glide: true });
}

function onChannelCommit(key: keyof Rgb, event: Event) {
  const input = event.target as HTMLInputElement;
  const n = channelValue(event);
  if (n !== null) setFromHex(rgbToHex({ ...rgb.value, [key]: Math.min(255, n) }));
  // Put the field back by hand: an out-of-range or empty entry leaves the bound value unchanged,
  // and Vue skips the patch when it has not changed.
  input.value = String(rgb.value[key]);
}

/* ---------- Swatches and eyedropper ---------- */

const swatchList = computed(() =>
  props.swatches
    .map((s) => normalizeHex(s))
    .filter((s): s is string => !!s)
    .filter((s, i, all) => all.indexOf(s) === i)
    .map((s) => {
      const c = hexToRgb(s)!;
      const lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
      return { hex: s, name: `${capitalize(colorName(s))}, ${s}`, mark: lum > 0.55 ? BLACK : WHITE };
    }),
);

const pick = (value: string) => setFromHex(value);

interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>;
}
const canEyedrop = ref(false);

async function pickFromScreen() {
  const Ctor = (window as unknown as { EyeDropper?: new () => EyeDropperLike }).EyeDropper;
  if (!Ctor) return;
  try {
    const { sRGBHex } = await new Ctor().open();
    setFromHex(sRGBHex);
  } catch {
    /* Escape or a click away cancels the pick. */
  }
}

onMounted(() => {
  canEyedrop.value = props.eyedropper && 'EyeDropper' in window;
  if (rootRef.value) rtl.value = getComputedStyle(rootRef.value).direction === 'rtl';
});

defineExpose({ focus: () => thumbRef.value?.focus() });
</script>

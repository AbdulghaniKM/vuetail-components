import { computed, reactive, watch } from 'vue';
import { presetFonts, type Preset } from '@/theme';
import { useAppUi } from './useAppUi';

/**
 * Retunes the active preset from the five settings in DESIGN.md: accent, neutral tint, radius,
 * density and font. Each one is optional and overrides the preset on its own, so "Ink with
 * Console's density" is one call. Light and dark are both derived from a single input, and
 * derived text colours are pushed until they pass WCAG AA against the preset's surfaces.
 *
 * Overrides live in memory and are written to `<style id="app-theme-variables">`. To keep a
 * theme, paste `css` into a stylesheet loaded after tokens.css.
 */

export type Density = 'comfortable' | 'compact';

export interface ThemeOverrides {
  /** Brand colour as hex. Drives accent, accent-hover, accent-fg, accent-subtle, accent-text, ring. */
  accent?: string;
  /** Neutral hue in degrees (0–360). Re-tints bg through text-subtle at the preset's lightness. */
  neutralHue?: number;
  /** Base corner radius in px (the `rounded-md` step). The rest of the scale follows. */
  radius?: number;
  /** Control sizes: comfortable is 32/40/48px, compact is Console's 26/32/38px. */
  density?: Density;
  /** Use another preset's typefaces. */
  font?: Preset;
}

export interface ContrastIssue {
  mode: 'light' | 'dark';
  pair: string;
  ratio: number;
  min: number;
}

type Mode = 'light' | 'dark';
type Vars = Record<string, string>;

// <generated:presets> Written by `node scripts/tokens.mjs build` from styles/tokens.mjs; do not edit.
const PRESETS = {
  ink: {
    fonts: { sans: '"Schibsted Grotesk Variable", "Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif', display: '"Schibsted Grotesk Variable", "Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif', mono: '"Spline Sans Mono Variable", "Spline Sans Mono", ui-monospace, SFMono-Regular, Consolas, monospace' },
    density: { 'control-sm': '32px', 'control-md': '40px', 'control-lg': '48px', 'control-pad': '16px', 'text-control': '0.875rem' },
    light: { bg: '#EDEFF2', surface: '#F6F7F9', 'surface-raised': '#F9FAFB', muted: '#E3E6EB', border: '#D6DAE0', 'border-strong': '#848992', text: '#0E1014', 'text-muted': '#464B56', 'text-subtle': '#6A707C', 'accent-text': '#2440D2', ring: '#2440D2' },
    dark: { bg: '#0C0D10', surface: '#121418', 'surface-raised': '#16181D', muted: '#1A1D22', border: '#262A31', 'border-strong': '#5D636D', text: '#F2F3F5', 'text-muted': '#A6ACB8', 'text-subtle': '#7A8190', 'accent-text': '#8C9DFF', ring: '#8C9DFF' },
  },
  pine: {
    fonts: { sans: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif', display: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif', mono: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace' },
    density: { 'control-sm': '32px', 'control-md': '40px', 'control-lg': '48px', 'control-pad': '16px', 'text-control': '0.875rem' },
    light: { bg: '#F5F7F6', surface: '#FFFFFF', 'surface-raised': '#FFFFFF', muted: '#ECF0EE', border: '#DCE3E0', 'border-strong': '#86918C', text: '#14201C', 'text-muted': '#4E5D57', 'text-subtle': '#75837D', 'accent-text': '#1A6553', ring: '#2F8F75' },
    dark: { bg: '#0F1513', surface: '#151D1A', 'surface-raised': '#1A2420', muted: '#1D2723', border: '#26322D', 'border-strong': '#5D6964', text: '#E8EFEC', 'text-muted': '#A3B2AC', 'text-subtle': '#7A8983', 'accent-text': '#6FD3AE', ring: '#6FD3AE' },
  },
  console: {
    fonts: { sans: '"IBM Plex Sans Variable", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif', display: '"IBM Plex Sans Variable", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif', mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace' },
    density: { 'control-sm': '26px', 'control-md': '32px', 'control-lg': '38px', 'control-pad': '12px', 'text-control': '0.8125rem' },
    light: { bg: '#F4F5F8', surface: '#FFFFFF', 'surface-raised': '#FFFFFF', muted: '#ECEEF3', border: '#E0E3EA', 'border-strong': '#888D98', text: '#161A22', 'text-muted': '#4B5363', 'text-subtle': '#737C8D', 'accent-text': '#2456C9', ring: '#2A62E0' },
    dark: { bg: '#0F1218', surface: '#151922', 'surface-raised': '#1A1F29', muted: '#1D222D', border: '#262C38', 'border-strong': '#5E6574', text: '#E6E9EF', 'text-muted': '#A0A8B8', 'text-subtle': '#778196', 'accent-text': '#86A8FF', ring: '#86A8FF' },
  },
} as const;
// </generated:presets>

const NEUTRALS = ['bg', 'surface', 'surface-raised', 'muted', 'border', 'border-strong', 'text', 'text-muted', 'text-subtle'] as const;

// ─── Colour math: sRGB ↔ OKLCH, WCAG contrast ─────────────────────────────────

interface Lch { l: number; c: number; h: number }

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const fromLinear = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

const parseHex = (hex: string): [number, number, number] | null => {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const full = m[1].length === 3 ? [...m[1]].map((ch) => ch + ch).join('') : m[1];
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255) as [number, number, number];
};

const linearRgbToLch = ([r, g, b]: number[]): Lch => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
};

const lchToLinearRgb = ({ l: L, c, h }: Lch): number[] => {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

export const hexToLch = (hex: string): Lch | null => {
  const rgb = parseHex(hex);
  return rgb ? linearRgbToLch(rgb.map(toLinear)) : null;
};

/** OKLCH to hex, reducing chroma until the colour fits sRGB (hue and lightness are kept). */
export const lchToHex = (lch: Lch): string => {
  const color = { ...lch, l: Math.min(1, Math.max(0, lch.l)) };
  let rgb = lchToLinearRgb(color);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = color.c;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(lchToLinearRgb({ ...color, c: mid }))) lo = mid;
      else hi = mid;
    }
    rgb = lchToLinearRgb({ ...color, c: lo });
  }
  return `#${rgb
    .map((v) => Math.round(Math.min(1, Math.max(0, fromLinear(v))) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
};

const luminance = (hex: string): number => {
  const rgb = parseHex(hex) ?? [0, 0, 0];
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Moves `color` away from every background in lightness steps until each pair reaches `min`. */
const ensureContrast = (color: Lch, backgrounds: string[], min: number, mode: Mode): string => {
  const step = mode === 'light' ? -0.01 : 0.01;
  const next = { ...color };
  for (let i = 0; i < 100; i++) {
    const hex = lchToHex(next);
    if (backgrounds.every((bg) => contrast(hex, bg) >= min)) return hex;
    next.l += step;
    if (next.l < 0 || next.l > 1) break;
  }
  return lchToHex(next);
};

// ─── The five settings → token values ─────────────────────────────────────────

const ACHROMATIC = 0.03;

const deriveNeutrals = (preset: Preset, mode: Mode, hue: number): Vars => {
  const base = PRESETS[preset][mode];
  const out: Vars = {};
  for (const name of NEUTRALS) {
    const lch = hexToLch(base[name])!;
    // Ink's greys are nearly achromatic; a floor keeps the chosen hue visible.
    out[name] = lchToHex({ l: lch.l, c: Math.max(lch.c, 0.012), h: hue });
  }
  out['text-muted'] = ensureContrast(hexToLch(out['text-muted'])!, [out.bg, out.muted], 4.5, mode);
  out['text-subtle'] = ensureContrast(hexToLch(out['text-subtle'])!, [out.bg], 3, mode);
  out['border-strong'] = ensureContrast(hexToLch(out['border-strong'])!, [out.bg, out.surface], 3, mode);
  return out;
};

const deriveAccent = (preset: Preset, mode: Mode, hex: string, neutrals: Vars): Vars | null => {
  const input = hexToLch(hex);
  if (!input) return null;
  const achromatic = input.c < ACHROMATIC;
  const { bg, surface, text } = neutrals;

  // Dark mode needs a light accent: invert lightness for greys, lift colours into a readable band.
  const accentLch =
    mode === 'light' ? { ...input } : { ...input, l: achromatic ? 1 - input.l : Math.min(0.82, Math.max(0.68, input.l)) };

  // The label has to read on the fill and on its hover state. Pick the better of the preset's
  // light and dark text; if neither reaches 4.5:1 (pure red, say), move the fill away from it.
  const fill = () => {
    const accent = lchToHex(accentLch);
    // Very dark accents lighten on hover (Ink's ink does); everything else darkens in light mode.
    const shift = mode === 'dark' ? 0.06 : accentLch.l < 0.3 ? 0.1 : -0.07;
    const hover = lchToHex({ ...accentLch, l: accentLch.l + shift });
    const score = (fg: string) => Math.min(contrast(fg, accent), contrast(fg, hover));
    const fg = score(surface) >= score(text) ? surface : text;
    return { accent, hover, fg, ok: score(fg) >= 4.5 };
  };
  let filled = fill();
  for (let i = 0; i < 60 && !filled.ok; i++) {
    accentLch.l += filled.fg === surface ? -0.01 : 0.01;
    filled = fill();
  }
  const { accent, hover, fg: accentFg } = filled;
  const subtle = lchToHex({
    l: mode === 'light' ? 0.93 : 0.27,
    c: achromatic ? 0.01 : Math.min(input.c * 0.35, 0.06),
    h: input.h,
  });

  // A grey accent cannot also be the link and focus colour, so those keep the preset's (DESIGN.md).
  const presetVars = PRESETS[preset][mode];
  const accentText = achromatic
    ? presetVars['accent-text']
    : ensureContrast(accentLch, [bg, surface, subtle], 4.5, mode);
  const ring = achromatic ? presetVars.ring : ensureContrast(accentLch, [bg, surface], 3, mode);

  return {
    accent,
    'accent-hover': hover,
    'accent-fg': accentFg,
    'accent-subtle': subtle,
    'accent-text': accentText,
    ring,
  };
};

const RADIUS_STEPS = { sm: 0.67, md: 1, lg: 1.33, xl: 2, '2xl': 2.67 } as const;

const deriveRadius = (base: number): Vars =>
  Object.fromEntries(
    Object.entries(RADIUS_STEPS).map(([step, k]) => [`--radius-${step}`, `${Math.round(Math.max(0, base) * k)}px`]),
  );

const deriveDensity = (density: Density): Vars => {
  const values = PRESETS[density === 'compact' ? 'console' : 'ink'].density;
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k === 'text-control' ? '--text-control' : `--spacing-${k}`, v]),
  );
};

const colorVars = (overrides: ThemeOverrides, preset: Preset, mode: Mode): Vars => {
  const neutrals =
    overrides.neutralHue === undefined ? { ...PRESETS[preset][mode] } : deriveNeutrals(preset, mode, overrides.neutralHue);
  const out: Vars = overrides.neutralHue === undefined ? {} : Object.fromEntries(NEUTRALS.map((n) => [n, neutrals[n]]));
  const accent = overrides.accent ? deriveAccent(preset, mode, overrides.accent, neutrals) : null;
  if (accent) Object.assign(out, accent);
  return out;
};

/** Every token value the overrides set, per mode, plus the non-colour variables. */
export const resolveOverrides = (overrides: ThemeOverrides, preset: Preset) => {
  const shared: Vars = {};
  if (overrides.radius !== undefined) Object.assign(shared, deriveRadius(overrides.radius));
  if (overrides.density) Object.assign(shared, deriveDensity(overrides.density));
  if (overrides.font) {
    const fonts = PRESETS[overrides.font].fonts;
    for (const [k, v] of Object.entries(fonts)) shared[`--font-${k}`] = v;
  }
  return { shared, light: colorVars(overrides, preset, 'light'), dark: colorVars(overrides, preset, 'dark') };
};

/** The accent pairs scripts/tokens.mjs checks for every preset, applied to the overrides. */
export const checkContrast = (overrides: ThemeOverrides, preset: Preset): ContrastIssue[] => {
  const resolved = resolveOverrides(overrides, preset);
  const issues: ContrastIssue[] = [];
  for (const mode of ['light', 'dark'] as const) {
    const v = { ...PRESETS[preset][mode], ...resolved[mode] } as Vars;
    if (!v.accent) continue;
    const pairs: [string, string, string, number][] = [
      ['accent-fg on accent', v['accent-fg'], v.accent, 4.5],
      ['accent-fg on accent-hover', v['accent-fg'], v['accent-hover'], 4.5],
      ['accent-text on bg', v['accent-text'], v.bg, 4.5],
      ['accent-text on surface', v['accent-text'], v.surface, 4.5],
      ['accent-text on accent-subtle', v['accent-text'], v['accent-subtle'], 4.5],
      ['ring on bg', v.ring, v.bg, 3],
      ['ring on surface', v.ring, v.surface, 3],
    ];
    for (const [pair, fg, bg, min] of pairs) {
      const ratio = contrast(fg, bg);
      if (ratio < min) issues.push({ mode, pair, ratio: Math.round(ratio * 100) / 100, min });
    }
  }
  return issues;
};

// ─── CSS output ───────────────────────────────────────────────────────────────

// Repeated :root outranks the preset blocks in tokens.css (`:root[data-vt-preset][data-theme]`).
const ROOT = ':root:root:root:root';

const block = (selector: string, vars: Vars, indent = '') =>
  `${indent}${selector} {\n${Object.entries(vars)
    .map(([k, v]) => `${indent}  ${k.startsWith('--') ? k : `--color-${k}`}: ${v};`)
    .join('\n')}\n${indent}}`;

export const buildCss = (overrides: ThemeOverrides, preset: Preset): string => {
  const { shared, light, dark } = resolveOverrides(overrides, preset);
  const parts: string[] = [];
  const first = { ...shared, ...light };
  if (Object.keys(first).length) parts.push(block(ROOT, first));
  if (Object.keys(dark).length) {
    parts.push(block(`${ROOT}[data-theme="dark"]`, dark));
    parts.push(
      `@media (prefers-color-scheme: dark) {\n${block(`${ROOT}:not([data-theme="light"])`, dark, '  ')}\n}`,
    );
  }
  return parts.join('\n\n');
};

// ─── Composable ───────────────────────────────────────────────────────────────

const STYLE_ID = 'app-theme-variables';

// NOTE: Module-scope state. SPA-only — not safe under SSR (state would leak across requests).
const overrides = reactive<ThemeOverrides>({});

const writeStyle = (css: string) => {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!css) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
};

let started = false;

export const useThemeCustomizer = () => {
  const { preset } = useAppUi();
  const css = computed(() => buildCss(overrides, preset.value));
  const issues = computed(() => checkContrast(overrides, preset.value));
  const isCustomized = computed(() => Object.values(overrides).some((v) => v !== undefined));

  if (!started) {
    started = true;
    watch(css, writeStyle, { immediate: true });
    // A borrowed typeface loads the first time it is picked, like a preset's own.
    watch(
      () => overrides.font,
      (font) => void (font && presetFonts[font]?.()),
      { immediate: true },
    );
  }

  const set = <K extends keyof ThemeOverrides>(key: K, value: ThemeOverrides[K]) => {
    overrides[key] = value;
  };

  /** Clears one setting, or all of them. */
  const reset = (key?: keyof ThemeOverrides) => {
    for (const k of key ? [key] : (Object.keys(overrides) as (keyof ThemeOverrides)[])) delete overrides[k];
  };

  return { overrides, set, reset, css, issues, isCustomized };
};

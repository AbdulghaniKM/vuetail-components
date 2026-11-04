import {
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

/**
 * Refraction engine for the liquid-glass effect.
 *
 * The idea, from https://kube.io/blog/liquid-glass-css-svg/: a pane of glass with a
 * bevelled edge bends the light passing through it, so the background seen through the
 * rim is displaced. `feDisplacementMap` can reproduce that exactly — it offsets each
 * pixel by a vector read out of a second image, red for x and green for y. So all we
 * have to do is *compute* that image: trace one refracted ray per distance-from-edge,
 * and paint the resulting vector field.
 *
 * Two pieces do the work:
 *
 *   1. A 1-D profile. Displacement depends only on how far a pixel sits from the
 *      nearest edge, so a single lookup table covers the whole shape.
 *   2. A signed distance field. For a rounded rectangle the distance and the direction
 *      to the nearest edge are both closed-form, so the 1-D table can be smeared over
 *      2-D without tracing anything per pixel.
 *
 * Only Chromium runs SVG filters in `backdrop-filter`. Everywhere else `supported` is
 * false and the components fall back to a plain blur — see `supportsSvgBackdropFilter`.
 */

/**
 * Shared by a glass container and the panes inside it.
 *
 * Apple's guidance is that shapes should be concentric — "controls concentric to
 * sheets, sheets to windows" — so a nested pane needs to know what it is nested in.
 * The inner radius is the outer one minus the gap between them; any other value and
 * the two curves visibly disagree at the corner.
 */
export interface GlassContainerContext {
  radius: Ref<number>;
  gap: Ref<number>;
}

export const GlassContainerKey: InjectionKey<GlassContainerContext> = Symbol('vt-glass-container');

/** Present on every descendant of a pane, so a pane can tell it is inside another. */
export const GlassPaneKey: InjectionKey<true> = Symbol('vt-glass-pane');

/** The radius a pane should take to sit concentrically inside the outer shape. */
export const concentricRadius = (outer: number, gap: number): number => Math.max(0, outer - gap);

export type GlassProfile = 'convex' | 'squircle' | 'concave' | 'lip';

export const GLASS_PROFILES = [
  'convex',
  'squircle',
  'concave',
  'lip',
] as const satisfies readonly GlassProfile[];

export interface LiquidGlassParams {
  /** Corner radius in px. Half the short side gives a circle — that is the magnifier. */
  radius: number;
  /** How far the curved bevel reaches in from the edge, in px. */
  bezel: number;
  /** Glass depth in px — how far a refracted ray travels before it lands. */
  thickness: number;
  /** Index of refraction. Air is 1, window glass ~1.5. Higher bends harder. */
  refractiveIndex: number;
  profile: GlassProfile;
  /** Plain radial zoom on top of the refraction. 1 leaves the middle alone. */
  magnification: number;
  /** Hard ceiling on displacement in px, so a near-vertical bevel cannot blow up. */
  maxDisplacement: number;
  /**
   * Pixel density of the generated map. 0 picks for you: full density up to 180px,
   * half beyond that, where the field is broad enough that nobody can tell.
   */
  resolution: number;
}

export const DEFAULT_GLASS_PARAMS: LiquidGlassParams = {
  radius: 24,
  bezel: 18,
  thickness: 22,
  refractiveIndex: 1.5,
  profile: 'squircle',
  magnification: 1,
  maxDisplacement: 48,
  resolution: 0,
};

/**
 * Bevel height profiles, over t from 0 at the outer edge to 1 where the flat top
 * begins, returning height from 0 to 1.
 */
const SURFACES: Record<GlassProfile, (t: number) => number> = {
  convex: (t) => Math.sqrt(1 - (1 - t) ** 2),
  squircle: (t) => (1 - (1 - t) ** 4) ** 0.25,
  concave: (t) => 1 - Math.sqrt(1 - (1 - t) ** 2),
  lip: (t) => {
    const s = t * t * t * (t * (6 * t - 15) + 10); // smootherstep
    const convex = Math.sqrt(1 - (1 - t) ** 2);
    return convex * (1 - s) + (1 - convex) * s;
  },
};

const LUT_SIZE = 256;

/**
 * Trace one ray per step across the bevel and record how far sideways it lands.
 * Positive is inward (a convex lens magnifies); negative is outward.
 */
function buildProfileLut(params: LiquidGlassParams, bezel: number): Float32Array {
  const surface = SURFACES[params.profile] ?? SURFACES.squircle;
  const eta = 1 / Math.max(1, params.refractiveIndex);
  const lut = new Float32Array(LUT_SIZE);
  const delta = 1e-4;

  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1);
    const t0 = Math.max(0, t - delta);
    const t1 = Math.min(1, t + delta);

    // Surface slope in px per px, so the normal is in the same space as the geometry.
    const rise = (surface(t1) - surface(t0)) * params.thickness;
    const run = (t1 - t0) * bezel;
    const slope = run === 0 ? 0 : rise / run;

    // Normal of the bevel: up, and tilted out over the edge.
    const nLen = Math.hypot(slope, 1);
    const nx = -slope / nLen;
    const ny = 1 / nLen;

    // Incident ray comes straight down at the surface. Snell's law, vector form.
    const cosI = ny;
    const k = 1 - eta * eta * (1 - cosI * cosI);

    let displacement = 0;
    if (k >= 0) {
      const c = eta * cosI - Math.sqrt(k);
      const rx = c * nx;
      const ry = -eta + c * ny;
      // Travel from the surface down to the backdrop and see how far it slid.
      if (ry < 0) displacement = (rx / -ry) * surface(t) * params.thickness;
    }

    const cap = params.maxDisplacement;
    lut[i] = Math.max(-cap, Math.min(cap, displacement));
  }

  return lut;
}

export interface DisplacementMap {
  /** A data URL for `feImage`. */
  href: string;
  /** The `scale` for `feDisplacementMap`: encoded 0-255 spans ±scale/2 px. */
  scale: number;
  width: number;
  height: number;
}

/**
 * Paint the vector field for one element box. Returns null when there is nothing to
 * draw (no size, or a completely flat pane).
 */
export function buildDisplacementMap(
  width: number,
  height: number,
  input: Partial<LiquidGlassParams> = {},
): DisplacementMap | null {
  if (typeof document === 'undefined') return null;
  if (!(width > 0) || !(height > 0)) return null;

  const params: LiquidGlassParams = { ...DEFAULT_GLASS_PARAMS, ...input };
  const halfW = width / 2;
  const halfH = height / 2;
  const shortest = Math.min(halfW, halfH);

  // A radius past half the short side is not a rounder rectangle, it is a smaller one.
  const radius = Math.max(0, Math.min(params.radius, shortest));
  const bezel = params.bezel > 0 ? Math.min(params.bezel, shortest) : 0;
  const zoom = Math.max(1, params.magnification);
  const zoomFactor = 1 - 1 / zoom;

  const lut = buildProfileLut(params, bezel);

  const auto = Math.max(width, height) > 180 ? 0.5 : 1;
  const dpr = params.resolution > 0 ? Math.min(params.resolution, 3) : auto;
  const mapW = Math.max(1, Math.round(width * dpr));
  const mapH = Math.max(1, Math.round(height * dpr));

  const dx = new Float32Array(mapW * mapH);
  const dy = new Float32Array(mapW * mapH);
  let maxMagnitude = 0;

  for (let py = 0; py < mapH; py++) {
    const cy = (py + 0.5) / dpr - halfH;

    for (let px = 0; px < mapW; px++) {
      const cx = (px + 0.5) / dpr - halfW;
      const i = py * mapW + px;

      // Signed distance to a rounded rectangle, negative inside.
      const qx = Math.abs(cx) - halfW + radius;
      const qy = Math.abs(cy) - halfH + radius;
      const mx = Math.max(qx, 0);
      const my = Math.max(qy, 0);
      const outside = Math.hypot(mx, my);
      const distance = Math.min(Math.max(qx, qy), 0) + outside - radius;

      let vx = 0;
      let vy = 0;

      // Inside the pane, and inside the bevel band: refract.
      const depth = -distance;
      if (bezel > 0 && depth >= 0 && depth < bezel) {
        let gx: number;
        let gy: number;
        if (outside > 0) {
          gx = mx / outside; // on a corner arc
          gy = my / outside;
        } else if (qx > qy) {
          gx = 1; // nearest edge is vertical
          gy = 0;
        } else {
          gx = 0; // nearest edge is horizontal
          gy = 1;
        }
        gx *= Math.sign(cx) || 1;
        gy *= Math.sign(cy) || 1;

        const t = depth / bezel;
        const magnitude = lut[Math.min(LUT_SIZE - 1, Math.round(t * (LUT_SIZE - 1)))];

        // The gradient points out of the shape, so inward displacement is its negative.
        vx = -gx * magnitude;
        vy = -gy * magnitude;
      }

      // A plain zoom is a linear pull toward the middle: sample r / zoom instead of r.
      if (zoomFactor > 0 && distance <= 0) {
        vx -= cx * zoomFactor;
        vy -= cy * zoomFactor;
      }

      dx[i] = vx;
      dy[i] = vy;
      const magnitude = Math.hypot(vx, vy);
      if (magnitude > maxMagnitude) maxMagnitude = magnitude;
    }
  }

  if (maxMagnitude < 0.01) return null; // a flat pane refracts nothing

  const canvas = document.createElement('canvas');
  canvas.width = mapW;
  canvas.height = mapH;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const image = context.createImageData(mapW, mapH);
  const data = image.data;
  for (let i = 0; i < mapW * mapH; i++) {
    const o = i * 4;
    // 128 is "no displacement"; ±127 spans the full ±scale/2.
    data[o] = 128 + (dx[i] / maxMagnitude) * 127;
    data[o + 1] = 128 + (dy[i] / maxMagnitude) * 127;
    data[o + 2] = 128; // the blue channel is never read
    data[o + 3] = 255;
  }
  context.putImageData(image, 0, 0);

  return { href: canvas.toDataURL(), scale: maxMagnitude * 2, width, height };
}

let supportCache: boolean | null = null;

/**
 * Whether `backdrop-filter: url(#svg-filter)` actually does anything.
 *
 * There is no honest feature query for this. `CSS.supports` only parses the value, and
 * says yes in Firefox and Safari, where an SVG filter in `backdrop-filter` is accepted
 * and then silently ignored. Chromium is the only engine that runs it, so that is what
 * we look for — and every caller can override the answer.
 */
export function supportsSvgBackdropFilter(): boolean {
  if (supportCache !== null) return supportCache;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  const isChromium = /Chrom(e|ium)|Edg\//.test(ua) && !/OPR\//.test(ua);
  const isIosWebkit = /CriOS|FxiOS|iPad|iPhone/.test(ua); // every iOS browser is WebKit
  const parses =
    typeof CSS !== 'undefined' &&
    (CSS.supports('backdrop-filter', 'url(#a)') || CSS.supports('-webkit-backdrop-filter', 'url(#a)'));

  supportCache = parses && isChromium && !isIosWebkit;
  return supportCache;
}

let instanceCount = 0;

export interface UseLiquidGlassReturn {
  /** Unique id for this instance's `<filter>`. */
  filterId: string;
  map: Ref<DisplacementMap | null>;
  width: Ref<number>;
  height: Ref<number>;
  /** False when the engine cannot run — render a plain blur instead. */
  supported: Ref<boolean>;
  refresh: () => void;
}

/**
 * Keeps a displacement map in step with an element's measured size.
 *
 * Rebuilding is O(width x height), so it is deferred to an animation frame and skipped
 * whenever the inputs come back unchanged — a resize that settles on the same box, or a
 * parent re-render, costs nothing.
 */
export function useLiquidGlass(
  target: Ref<HTMLElement | null>,
  params: MaybeRefOrGetter<Partial<LiquidGlassParams>>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {},
): UseLiquidGlassReturn {
  const filterId = `vt-glass-${++instanceCount}`;
  const map = ref<DisplacementMap | null>(null);
  const width = ref(0);
  const height = ref(0);
  const supported = ref(false);

  let frame = 0;
  let lastKey = '';
  let observer: ResizeObserver | null = null;

  const rebuild = () => {
    frame = 0;
    const enabled = toValue(options.enabled ?? true);
    if (!enabled || !supported.value) {
      map.value = null;
      lastKey = '';
      return;
    }

    const resolved = { ...DEFAULT_GLASS_PARAMS, ...toValue(params) };
    const key = `${width.value}x${height.value}|${JSON.stringify(resolved)}`;
    if (key === lastKey) return;
    lastKey = key;

    map.value = buildDisplacementMap(width.value, height.value, resolved);
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(rebuild);
  };

  const apply = (w: number, h: number) => {
    // Round, or sub-pixel jitter rebuilds the map on every scroll-driven reflow.
    const rw = Math.round(w);
    const rh = Math.round(h);
    if (rw === width.value && rh === height.value) return;
    width.value = rw;
    height.value = rh;
    schedule();
  };

  const measure = (entry: ResizeObserverEntry) => {
    const box = entry.borderBoxSize?.[0];
    if (box) apply(box.inlineSize, box.blockSize);
    else apply(entry.contentRect.width, entry.contentRect.height);
  };

  onMounted(() => {
    supported.value = supportsSvgBackdropFilter();
    const element = target.value;
    if (!element) return;
    // observe() fires once immediately, so there is no separate initial measurement.
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) measure(entry);
    });
    observer.observe(element);
  });

  watch(
    () => [toValue(params), toValue(options.enabled ?? true)],
    () => schedule(),
    { deep: true },
  );

  onBeforeUnmount(() => {
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
  });

  return { filterId, map, width, height, supported, refresh: schedule };
}

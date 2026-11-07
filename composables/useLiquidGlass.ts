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
 * The lens is ported from glisse by Kelvin Zhang (https://github.com/0kzh/glisse), a
 * faithful implementation of Apple's Liquid Glass, itself after Aave's web glass. What
 * came across: the lens map (a band round the rim that shows content from further in, by
 * the slope of a shallow dome, fading out smoothly toward the middle), the filter graph
 * (one grey map per direction of pull, three displacement passes for red, green and blue),
 * the lit rim measured from iOS 26.1, and the way glass bends marked content in browsers
 * that cannot filter a live backdrop. What VueTail adds: the physical parameters below
 * drive the lens, a radial zoom for the magnifier, and the Vue composable.
 *
 * Two ways to bend what is behind a pane:
 *
 *   - **backdrop** (Chromium): the pane's refract layer gets `backdrop-filter: url(#lens)`,
 *     so anything behind it bends, after the frost layer under it has blurred it.
 *   - **content** (every browser): the element marked `data-glass-backdrop` behind the pane
 *     is itself filtered, with the lens placed where the pane stands, every frame.
 *
 * Anywhere neither applies, the pane keeps its frost and the painted rim.
 *
 * glisse is MIT licensed:
 *
 *   Copyright (c) Kelvin Zhang
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy of this
 *   software and associated documentation files (the "Software"), to deal in the Software
 *   without restriction, including without limitation the rights to use, copy, modify,
 *   merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 *   permit persons to whom the Software is furnished to do so, subject to the following
 *   conditions: The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS",
 *   WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 *   WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 *   NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
 *   IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// ─── Containers and shared types ─────────────────────────────────────────────

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

/** Where the refraction comes from. `auto` picks backdrop in Chromium, else marked content. */
export type GlassSource = 'auto' | 'backdrop' | 'content';

export interface LiquidGlassParams {
  /** Corner radius in px. Half the short side gives a circle — that is the magnifier. */
  radius: number;
  /** Width of the band round the rim that bends, in px. `auto` is a quarter of the short side. */
  bezel: number | 'auto';
  /**
   * Glass depth in px. With the refractive index it sets how far in the rim reaches for
   * what it shows: 22px of glass at 1.5 reaches 0.45 of the short side, glisse's tuning.
   * 0 is flat glass.
   */
  thickness: number;
  /** Index of refraction. Air is 1 (no bend), window glass ~1.5. Higher bends harder. */
  refractiveIndex: number;
  /** The rim's dome: `squircle` is steep at the edge, `convex` rounder, `concave` inverts. */
  profile: GlassProfile;
  /** Plain radial zoom on top of the refraction. 1 leaves the middle alone. */
  magnification: number;
  /** Ceiling on displacement in px. 0 leaves it to the lens, which never pulls past half its reach. */
  maxDisplacement: number;
  /** Map density in pixels per px. 0 follows the screen, up to 2. */
  resolution: number;
  /** How much further red bends than blue, as a fraction: 0.08 is 8%, glisse's default. */
  dispersion: number;
}

export const DEFAULT_GLASS_PARAMS: LiquidGlassParams = {
  radius: 24,
  bezel: 'auto',
  thickness: 22,
  refractiveIndex: 1.5,
  profile: 'squircle',
  magnification: 1,
  maxDisplacement: 0,
  resolution: 0,
  dispersion: 0.08,
};

/** The rim's light: which way it comes from and how wide the lit line is. */
export interface GlassLight {
  /** CSS gradient angle in deg: 145 lights the top and left, as iOS does. */
  angle: number;
  /** Width of the lit line in px; iOS's is 1.22. */
  width: number;
}

export const DEFAULT_GLASS_LIGHT: GlassLight = { angle: 135, width: 1.22 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// erf(x) ≈ tanh(√π x)
const erf = (x: number) => Math.tanh(1.7724538509 * x);

/** Signed distance to a rounded rectangle centred on the origin; negative inside. */
export function distance(x: number, y: number, halfWidth: number, halfHeight: number, radius: number): number {
  const qx = Math.abs(x) - halfWidth + radius;
  const qy = Math.abs(y) - halfHeight + radius;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

// ─── The lens (after glisse's lens.ts) ───────────────────────────────────────

interface Arc {
  radius: number;
  scale: number;
}

// The circular arc that sags by `sag` across `half`, scaled so its slope averages a half.
function arc(sag: number, half: number): Arc {
  const radius = (half * half + sag * sag) / (2 * sag);
  let sum = 0;
  for (let i = 0; i <= 200; i++) {
    const x = (i / 200) * half;
    const slope = x / Math.sqrt(radius * radius - x * x);
    sum += i === 0 || i === 200 ? slope / 2 : slope;
  }
  const mean = sum / 200;
  return { radius, scale: mean > 0 ? 0.5 / mean : 1 };
}

const slope = (x: number, { radius, scale }: Arc) => {
  const inside = Math.min(x, 0.999 * radius);
  return (inside / Math.sqrt(radius * radius - inside * inside)) * scale;
};

/**
 * Each profile as glisse's dome: `dome` is its sag as a share of the short side, `splay`
 * how far the pull near each side keeps to that side's direction (1 is fully radial), and
 * `sign` whether the rim pulls content in (a convex lens) or pushes it out.
 */
const PROFILE_LENS: Record<GlassProfile, { dome: number; splay: number; sign: 1 | -1 }> = {
  squircle: { dome: 0.5, splay: 1, sign: 1 }, // glisse's Glass
  convex: { dome: 0.3, splay: 1, sign: 1 },
  concave: { dome: 0.5, splay: 1, sign: -1 },
  lip: { dome: 0.5, splay: 0.4, sign: 1 }, // glisse's switch thumb: pulls straight across near the sides
};

export interface LensShape {
  width: number;
  height: number;
  radius: number;
}

/** A lens's map in device pixels: one grey image per direction of pull, and where it bends. */
export interface LensMap {
  columns: number;
  rows: number;
  /** Greys of the pull across: 128 is none, lighter pulls from the right. */
  across: Uint8ClampedArray;
  /** Greys of the pull down: 128 is none, lighter pulls from below. */
  down: Uint8ClampedArray;
  /** Alpha covering where the lens bends at all. Past a narrow band the middle shows the content exactly. */
  bends: Uint8ClampedArray;
  /** `feDisplacementMap` scale in px: a grey of 0 or 255 moves by half of it. */
  scale: number;
}

const resolveParams = (input: Partial<LiquidGlassParams>): LiquidGlassParams => ({ ...DEFAULT_GLASS_PARAMS, ...input });

/** How far in the rim reaches, in px, signed: the scale a fully saturated pull gets. */
export function lensReach(shape: LensShape, params: LiquidGlassParams): number {
  const short = Math.min(shape.width, shape.height);
  const strength = 0.45 * (Math.max(0, params.thickness) / 22) * (Math.max(0, params.refractiveIndex - 1) / 0.5);
  return PROFILE_LENS[params.profile].sign * strength * short;
}

/**
 * Draws the lens for a shape. Within a band `bezel` wide round the rim, each point shows
 * content from further in by the slope of a shallow dome, faded out toward the middle with
 * an error function: the middle barely moves, and past a narrow band it is left exactly as
 * it was. `magnification` adds a pull toward the centre over the whole pane.
 */
export function lensMap(shape: LensShape, input: Partial<LiquidGlassParams>, density: number): LensMap | null {
  const params = resolveParams(input);
  const { width, height } = shape;
  if (!(width > 0) || !(height > 0)) return null;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const short = Math.min(width, height);
  const radius = clamp(shape.radius, 0, Math.min(halfWidth, halfHeight));
  const columns = Math.max(1, Math.round(width * density));
  const rows = Math.max(1, Math.round(height * density));

  const profile = PROFILE_LENS[params.profile] ?? PROFILE_LENS.squircle;
  const depth = params.bezel === 'auto' ? 0.25 * short : clamp(params.bezel, 0, short / 2);
  const dome = profile.dome * short;
  const reach = lensReach(shape, params);
  const zoom = 1 - 1 / Math.max(1, params.magnification);

  const innerWidth = Math.max(0, halfWidth - depth);
  const innerHeight = Math.max(0, halfHeight - depth);
  const innerRadius = clamp(radius, 0, Math.min(innerWidth, innerHeight));
  const ramp = depth > 0 ? 1 / (depth * Math.SQRT2) : 1e6;
  const sag = Math.max(0.01, Math.min(dome, Math.min(halfWidth, halfHeight) - 1));
  const across = arc(sag, halfWidth);
  const down = arc(sag, halfHeight);
  const near = 0.5 * Math.min(halfWidth, halfHeight);
  const cap = params.maxDisplacement > 0 ? 2 * params.maxDisplacement : Infinity;

  // Pulls in px, in glisse's units: content moves by half the pull. The rim's part is kept
  // apart from the zoom's until the fold guard below has looked at it.
  const count = columns * rows;
  const rimX = new Float32Array(count);
  const rimY = new Float32Array(count);
  const inside = new Uint8Array(count);
  const bends = new Uint8ClampedArray(count * 4);

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const i = row * columns + column;
      const x = ((column + 0.5) / columns) * width - halfWidth;
      const y = ((row + 0.5) / rows) * height - halfHeight;
      const edge = distance(x, y, halfWidth, halfHeight, radius);
      if (edge >= 0) continue;
      inside[i] = 1;

      const ax = Math.abs(x);
      const ay = Math.abs(y);
      let dx = Math.sign(x) * slope(ax, across);
      let dy = Math.sign(y) * slope(ay, down);

      // Near the top and bottom the pull turns towards straight down and up, near the
      // sides towards straight across, keeping its strength.
      if (profile.splay < 1 && near > 0) {
        const keepX = Math.max(0, 1 - (halfHeight - ay) / near) * (1 - profile.splay);
        const keepY = Math.max(0, 1 - (halfWidth - ax) / near) * (1 - profile.splay);
        if (keepX > 0.001 || keepY > 0.001) {
          const before = Math.hypot(dx, dy);
          dx *= 1 - keepX;
          dy *= 1 - keepY;
          const after = Math.hypot(dx, dy);
          if (after > 0.001) {
            dx *= before / after;
            dy *= before / after;
          }
        }
      }

      const falloff = 0.5 * (1 + erf(distance(x, y, innerWidth, innerHeight, innerRadius) * ramp));
      // glisse stores the pull as a byte, which saturates at ±1: the rim never pulls past half its reach.
      rimX[i] = clamp(dx * falloff, -1, 1) * reach;
      rimY[i] = clamp(dy * falloff, -1, 1) * reach;

      // Fully in once the pull reaches about a twentieth of its strength, smoothed over
      // the last pixel at the edge. A zoom bends the whole pane.
      const amount = zoom > 0 ? Math.min(1, -edge) : Math.min(1, falloff * 20, -edge);
      bends[i * 4 + 3] = Math.round(255 * amount);
    }
  }

  // Fold guard, for a zoom only. A point at x shows content from x − pull/2, so where the
  // pull grows faster than 2 px per px the picture folds back on itself. At a pane's rim
  // that fold is the look: glisse squeezes and mirrors the content there, as iOS does. A
  // zoom adds its own pull across the whole lens, and with a full-radius bezel on top the
  // fold reaches the middle as stretched, mirrored bars. So with a zoom, scale the rim's
  // part just enough that the content still advances by a fifth of a pixel per pixel.
  const step = width / columns;
  let steepest = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 1; column < columns; column++) {
      const i = row * columns + column;
      if (inside[i] && inside[i - 1]) steepest = Math.max(steepest, (rimX[i] - rimX[i - 1]) / step);
    }
  }
  const stepDown = height / rows;
  for (let row = 1; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const i = row * columns + column;
      if (inside[i] && inside[i - columns]) steepest = Math.max(steepest, (rimY[i] - rimY[i - columns]) / stepDown);
    }
  }
  const room = 2 * (1 - zoom - 0.2); // the most the rim's pull may grow per px
  const tame = zoom > 0 && steepest > room ? Math.max(0, room) / steepest : 1;

  const vx = new Float32Array(count);
  const vy = new Float32Array(count);
  let largest = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const i = row * columns + column;
      if (!inside[i]) continue;
      const x = ((column + 0.5) / columns) * width - halfWidth;
      const y = ((row + 0.5) / rows) * height - halfHeight;
      let px = rimX[i] * tame + 2 * x * zoom;
      let py = rimY[i] * tame + 2 * y * zoom;
      const size = Math.hypot(px, py);
      if (size > cap) {
        px *= cap / size;
        py *= cap / size;
      }
      vx[i] = px;
      vy[i] = py;
      largest = Math.max(largest, Math.abs(px), Math.abs(py));
    }
  }

  if (largest < 0.01) return null; // flat glass bends nothing

  const greys = (v: Float32Array) => {
    const data = new Uint8ClampedArray(count * 4);
    for (let i = 0; i < count; i++) {
      const g = Math.round((0.5 - (0.5 * v[i]) / largest) * 255);
      data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = g;
      data[i * 4 + 3] = 255;
    }
    return data;
  };
  return { columns, rows, across: greys(vx), down: greys(vy), bends, scale: largest };
}

/** PNG data URLs of a lens's map. */
interface Encoded {
  across: string;
  down: string;
  bends: string;
  scale: number;
}

const encodedMaps = new Map<string, Encoded | null>();

function toPng(columns: number, rows: number, data: Uint8ClampedArray, canvas: HTMLCanvasElement): string | null {
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const image = context.createImageData(columns, rows);
  image.data.set(data);
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

function encode(key: string, draw: () => LensMap | null): Encoded | null {
  if (encodedMaps.has(key)) return encodedMaps.get(key)!;
  const map = draw();
  let result: Encoded | null = null;
  if (map) {
    const canvas = document.createElement('canvas');
    const across = toPng(map.columns, map.rows, map.across, canvas);
    const down = toPng(map.columns, map.rows, map.down, canvas);
    const bends = toPng(map.columns, map.rows, map.bends, canvas);
    if (across && down && bends) result = { across, down, bends, scale: map.scale };
  }
  encodedMaps.set(key, result);
  return result;
}

// ─── The filter (after glisse's lens.ts) ─────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';
let defs: SVGDefsElement | undefined;

function svg(name: string, attributes: Record<string, string | number>): SVGElement {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

/** The page's one hidden `<defs>`, where every lens filter lives. */
function container(): SVGDefsElement {
  if (defs?.isConnected) return defs;
  const root = svg('svg', { width: 0, height: 0, 'aria-hidden': 'true' });
  (root as SVGSVGElement).style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  defs = svg('defs', {}) as SVGDefsElement;
  root.append(defs);
  document.body.append(root);
  return defs;
}

/** WebKit draws SVG filters on HTML only in bounding-box units. */
const boxUnits = (): boolean =>
  typeof navigator !== 'undefined' && /AppleWebKit\//.test(navigator.userAgent) && !/Chrom(?:e|ium)\//.test(navigator.userAgent);

const CHANNELS = ['1 0 0 0 0  0 0 0 0 0  0 0 0 0 0', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0'];

const matrix = (input: string, values: string, result: string) => svg('feColorMatrix', { in: input, type: 'matrix', values, result });
const sum = (a: string, b: string, result: string) =>
  svg('feComposite', { in: a, in2: b, operator: 'arithmetic', k2: 1, k3: 1, result });

interface Part {
  /** Everything kept to the lens's box: its placed maps, and the first pass of each ray. */
  boxed: SVGElement[];
  /** Each colour's pass across, then down. */
  rays: [SVGElement, SVGElement][];
}

interface Graph {
  filter: SVGElement;
  parts: Part[];
}

// A filter that leaves the content as it was but under each lens, where it is displaced
// by the lens's map once for each of red, green and blue. The map is greys, one per
// direction of pull, each displacing in a pass of its own: Chrome converts a coloured
// map to a wide-gamut display's colours before displacing by it, which bends a pull
// straight down sideways too, while greys come through unchanged. Each pass takes the
// other direction from an alpha of one half, which is no pull.
function graph(lenses: Encoded[], box: boolean): Graph {
  const unit = box ? 'objectBoundingBox' : 'userSpaceOnUse';
  const filter = svg('filter', { filterUnits: unit, primitiveUnits: unit, 'color-interpolation-filters': 'sRGB' });
  if (box) for (const [key, value] of Object.entries({ x: 0, y: 0, width: 1, height: 1 })) filter.setAttribute(key, String(value));

  const single = lenses.length === 1;
  const parts = lenses.map((maps, k): Part => {
    const merged = (name: string) => (single ? name : `${name}-${k}`);
    const image = (href: string, result: string) => svg('feImage', { href, preserveAspectRatio: 'none', result });
    const boxed = [
      image(maps.across, `across-${k}`),
      image(maps.down, `down-${k}`),
      image(maps.bends, merged('raw')),
      svg('feFlood', { 'flood-color': 'rgb(128, 128, 128)', result: `neutral-${k}` }),
    ];
    filter.append(...boxed);
    for (const pull of ['across', 'down']) {
      const half = svg('feComponentTransfer', { in: `${pull}-grey-${k}`, result: `${pull}-pull-${k}` });
      half.append(svg('feFuncA', { type: 'linear', slope: 0, intercept: 0.5 }));
      filter.append(svg('feComposite', { in: `${pull}-${k}`, in2: `neutral-${k}`, operator: 'over', result: `${pull}-grey-${k}` }), half);
    }
    const rays = CHANNELS.map((_, i): [SVGElement, SVGElement] => {
      const acrossPass = svg('feDisplacementMap', {
        in: 'SourceGraphic',
        in2: `across-pull-${k}`,
        xChannelSelector: 'R',
        yChannelSelector: 'A',
        result: `across-${k}-${i}`,
      });
      const downPass = svg('feDisplacementMap', {
        in: `across-${k}-${i}`,
        in2: `down-pull-${k}`,
        xChannelSelector: 'A',
        yChannelSelector: 'R',
        result: `ray-${k}-${i}`,
      });
      boxed.push(acrossPass);
      filter.append(acrossPass, downPass);
      return [acrossPass, downPass];
    });
    // Each colour keeps a third of its alpha, so partly transparent content adds back up
    // to what it was, and its colour is tripled after.
    filter.append(
      ...CHANNELS.map((channel, i) => matrix(`ray-${k}-${i}`, `${channel}  0 0 0 0.3333 0`, `light-${k}-${i}`)),
      sum(`light-${k}-0`, `light-${k}-1`, `light-${k}-01`),
      sum(`light-${k}-01`, `light-${k}-2`, `spread-${k}`),
      matrix(`spread-${k}`, '3 0 0 0 0  0 3 0 0 0  0 0 3 0 0  0 0 0 1 0', `bent-${k}`),
      svg('feComposite', { in: `bent-${k}`, in2: merged('raw'), operator: 'in', result: merged('inside') }),
    );
    return { boxed, rays };
  });
  if (!single) {
    for (const name of ['raw', 'inside']) {
      const merge = svg('feMerge', { result: name });
      lenses.forEach((_, k) => merge.append(svg('feMergeNode', { in: `${name}-${k}` })));
      filter.append(merge);
    }
  }
  // Elsewhere the content as it was, split by the maps' alpha the other way, so the two
  // add back up exactly where the bend fades.
  filter.append(
    svg('feComposite', { in: 'SourceGraphic', in2: 'raw', operator: 'out', result: 'outside' }),
    svg('feComposite', { in: 'inside', in2: 'outside', operator: 'arithmetic', k2: 1, k3: 1, result: 'seen' }),
  );
  return { filter, parts };
}

/** Where a lens stands over its content, in the content's own px. */
interface Placed {
  x: number;
  y: number;
  width: number;
  height: number;
  /** The map's scale, already multiplied by any scale on the glass. */
  scale: number;
  dispersion: number;
}

function place(built: Graph, placed: Placed[], across: number, down: number, box: boolean): void {
  if (!box) for (const [key, value] of Object.entries({ x: 0, y: 0, width: across, height: down })) built.filter.setAttribute(key, String(value));
  placed.forEach((lens, k) => {
    const part = built.parts[k]!;
    // Red bends furthest, as in glisse: at 0.08, red 8% and green 4% further than blue.
    const spectrum = [1 + lens.dispersion, 1 + lens.dispersion / 2, 1];
    part.rays.forEach(([pullAcross, pullDown], i) => {
      pullAcross.setAttribute('scale', String((box ? lens.scale / across : lens.scale) * spectrum[i]!));
      pullDown.setAttribute('scale', String((box ? lens.scale / down : lens.scale) * spectrum[i]!));
    });
    const rect = box
      ? { x: lens.x / across, y: lens.y / down, width: lens.width / across, height: lens.height / down }
      : { x: lens.x, y: lens.y, width: lens.width, height: lens.height };
    for (const element of part.boxed) for (const [key, value] of Object.entries(rect)) element.setAttribute(key, String(value));
  });
}

// ─── The lit rim (after glisse's refraction.ts) ──────────────────────────────

/**
 * The light on the rim, as iOS 26.1 draws it on `.glassEffect()`: a line brightest at the
 * very edge and gone `width` px in, slightly bowed. A light from the top left lights the
 * whole of the left side and top, and its reflection the right side and bottom; it fades
 * out over the corners between, and is a little wider on the two corners it faces.
 */
export function rimMap(
  { width, height, radius }: LensShape,
  shine: number,
  light: GlassLight,
  density: number,
): { columns: number; rows: number; data: Uint8ClampedArray } {
  const columns = Math.max(1, Math.round(width * density));
  const rows = Math.max(1, Math.round(height * density));
  const data = new Uint8ClampedArray(columns * rows * 4);
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const corner = clamp(radius, 0, Math.min(halfWidth, halfHeight));
  const half = 0.5 / density;
  const rim = Math.max(0.1, light.width);
  // The side the light falls on, from a CSS gradient angle: 135deg lights the top left.
  const angle = (light.angle * Math.PI) / 180;
  const lx = -Math.sin(angle) * Math.SQRT2;
  const ly = Math.cos(angle) * Math.SQRT2;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = ((column + 0.5) / columns) * width - halfWidth;
      const y = ((row + 0.5) / rows) * height - halfHeight;
      const depth = -distance(x, y, halfWidth, halfHeight, corner);
      if (depth < -half || depth > 2 * rim) continue;
      const qx = Math.abs(x) - halfWidth + corner;
      const qy = Math.abs(y) - halfHeight + corner;
      let nx = 0;
      let ny = 0;
      if (qx > 0 && qy > 0) {
        const length = Math.hypot(qx, qy);
        nx = (Math.sign(x) * qx) / length;
        ny = (Math.sign(y) * qy) / length;
      } else if (qx > qy) nx = Math.sign(x);
      else ny = Math.sign(y);
      // 1 along the lit sides, √2 on the corners they meet at, 0 on the others.
      const facing = Math.abs(nx * lx + ny * ly);
      const along = Math.max(0, depth) / (rim * Math.sqrt(Math.max(1, facing)));
      const cover = clamp((depth + half) * density, 0, 1);
      const amount = along < 1 ? shine * Math.min(1, facing) ** 1.5 * (1 - along ** 1.5) * cover : 0;
      if (amount <= 0) continue;
      const i = (row * columns + column) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(255 * amount);
    }
  }
  return { columns, rows, data };
}

const rims = new Map<string, string | null>();

function paintRim(shape: LensShape, shine: number, light: GlassLight): string | null {
  const density = Math.min(devicePixelRatio || 1, 3);
  const key = [shape.width, shape.height, shape.radius, shine, light.angle, light.width, density].join('|');
  if (rims.has(key)) return rims.get(key)!;
  const { columns, rows, data } = rimMap(shape, shine, light, density);
  const png = toPng(columns, rows, data, document.createElement('canvas'));
  const url = png ? `url("${png}")` : null;
  rims.set(key, url);
  return url;
}

// ─── Backdrop lenses (Chromium) ──────────────────────────────────────────────

const backdrops = new Map<string, string>();
let made = 0;

/** A filter id for `backdrop-filter`, shared by every pane of the same shape and settings. */
function backdropFilter(maps: Encoded, key: string, width: number, height: number, dispersion: number): string {
  const id = `${key}|${dispersion}`;
  let name = backdrops.get(id);
  if (!name) {
    const built = graph([maps], false);
    place(built, [{ x: 0, y: 0, width, height, scale: maps.scale, dispersion }], width, height, false);
    name = `vt-glass-${made++}`;
    built.filter.id = name;
    container().append(built.filter);
    backdrops.set(id, name);
  }
  return name;
}

// ─── Content lenses (every browser, after glisse's lens.ts) ──────────────────

const MARK = 'data-glass-backdrop';

interface Member {
  glass: HTMLElement;
  maps: Encoded | null;
  key: string;
  dispersion: number;
}

interface Surface {
  content: HTMLElement;
  members: Member[];
  name: string;
  built: string;
  placed: string;
  version: number;
  graph?: Graph;
}

const surfaces = new Map<HTMLElement, Surface>();

// Filters the content for wherever its lenses stand now, giving the filter a new id
// whenever any of them has moved: WebKit keeps showing a filter's old output until then.
function render(surface: Surface): void {
  const { content } = surface;
  const across = content.offsetWidth;
  const down = content.offsetHeight;
  const from = content.getBoundingClientRect();
  const shown: { member: Member; placed: Placed }[] = [];
  if (across && down) {
    const unit = from.width / across || 1;
    for (const member of surface.members) {
      const at = member.glass.getBoundingClientRect();
      if (!member.maps || !at.width || !at.height) continue;
      // The map was drawn for the glass's layout size; a transform on it scales the pull too.
      const zoom = at.width / (member.glass.offsetWidth || at.width);
      shown.push({
        member,
        placed: {
          x: (at.left - from.left) / unit,
          y: (at.top - from.top) / unit,
          width: at.width / unit,
          height: at.height / unit,
          scale: (member.maps.scale * zoom) / unit,
          dispersion: member.dispersion,
        },
      });
    }
  }
  if (!shown.length) {
    surface.placed = '';
    content.style.removeProperty('filter');
    return;
  }
  const box = boxUnits();
  const structure = shown.map(({ member }) => member.key).join('\n');
  if (structure !== surface.built || !surface.graph) {
    surface.graph?.filter.remove();
    surface.graph = graph(shown.map(({ member }) => member.maps!), box);
    container().append(surface.graph.filter);
    surface.built = structure;
    surface.placed = '';
  }
  const placed = shown.map((entry) => entry.placed);
  const next = [across, down, ...placed.flatMap((p) => [p.x, p.y, p.width, p.height, p.scale, p.dispersion])]
    .map((value) => value.toFixed(2))
    .join(' ');
  if (next === surface.placed) return;
  surface.placed = next;
  place(surface.graph, placed, across, down, box);
  surface.graph.filter.id = `${surface.name}-${++surface.version}`;
  content.style.filter = `url("#${surface.graph.filter.id}")`;
}

// One loop for every surface: lenses follow their glass however it or the content moves.
let following = 0;
function follow(): void {
  for (const surface of surfaces.values()) render(surface);
  following = surfaces.size ? requestAnimationFrame(follow) : 0;
}

function joinSurface(content: HTMLElement, member: Member): () => void {
  let surface = surfaces.get(content);
  if (!surface) {
    surface = { content, members: [], name: `vt-glass-lens-${made++}`, built: '', placed: '', version: 0 };
    surfaces.set(content, surface);
  }
  surface.members.push(member);
  following ||= requestAnimationFrame(follow);
  const joined = surface;
  return () => {
    joined.members.splice(joined.members.indexOf(member), 1);
    if (joined.members.length) return render(joined);
    joined.graph?.filter.remove();
    content.style.removeProperty('filter');
    surfaces.delete(content);
  };
}

// The part of an element that can be seen, cut down by every ancestor that clips it.
function visibleBox(element: HTMLElement): DOMRect {
  let { left, top, right, bottom } = element.getBoundingClientRect();
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (!/hidden|clip|auto|scroll/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)) continue;
    const clip = node.getBoundingClientRect();
    left = Math.max(left, clip.left);
    top = Math.max(top, clip.top);
    right = Math.min(right, clip.right);
    bottom = Math.min(bottom, clip.bottom);
  }
  return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}

/** The marked content behind the glass: the closest `[data-glass-backdrop]` it overlaps. */
export function findGlassBackdrop(element: HTMLElement): HTMLElement | null {
  const box = element.getBoundingClientRect();
  const behind = (candidate: HTMLElement) => {
    if (candidate.contains(element) || element.contains(candidate)) return false;
    const other = visibleBox(candidate);
    return other.left < box.right && other.right > box.left && other.top < box.bottom && other.bottom > box.top;
  };
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    const found = [...node.querySelectorAll<HTMLElement>(`[${MARK}]`)].find(behind);
    if (found) return found;
  }
  return null;
}

// ─── Support ─────────────────────────────────────────────────────────────────

let supportCache: boolean | null = null;

/**
 * Whether `backdrop-filter: url(#svg-filter)` actually does anything.
 *
 * There is no honest feature query for this. `CSS.supports` only parses the value, and
 * says yes in Firefox and Safari, where an SVG filter in `backdrop-filter` is accepted
 * and then silently ignored. Chromium is the only engine that runs it, so that is what
 * we look for. Glass over `[data-glass-backdrop]` content refracts everywhere regardless.
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

// ─── Theme changes, which no resize reports ──────────────────────────────────

const repaints = new Set<() => void>();
let unwatchTheme: (() => void) | undefined;

function onThemeChange(repaint: () => void): () => void {
  repaints.add(repaint);
  if (!unwatchTheme) {
    const run = () => repaints.forEach((each) => each());
    const observer = new MutationObserver(run);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-vt-preset'] });
    const scheme = matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener?.('change', run);
    unwatchTheme = () => {
      observer.disconnect();
      scheme.removeEventListener?.('change', run);
    };
  }
  return () => {
    repaints.delete(repaint);
    if (repaints.size) return;
    unwatchTheme?.();
    unwatchTheme = undefined;
  };
}

// ─── Compatibility helper ────────────────────────────────────────────────────

export interface DisplacementMap {
  /** A data URL of the pull across (the map has one grey image per direction). */
  href: string;
  /** The `scale` for `feDisplacementMap`: a grey of 0 or 255 moves by half of it. */
  scale: number;
  width: number;
  height: number;
}

/** The lens for one element box, or null when there is nothing to draw (no size, or flat glass). */
export function buildDisplacementMap(
  width: number,
  height: number,
  input: Partial<LiquidGlassParams> = {},
): DisplacementMap | null {
  if (typeof document === 'undefined') return null;
  const params = resolveParams(input);
  const shape = { width, height, radius: params.radius };
  const density = densityFor(params);
  const maps = encode(mapKey(shape, params, density), () => lensMap(shape, params, density));
  return maps ? { href: maps.across, scale: maps.scale, width, height } : null;
}

const densityFor = (params: LiquidGlassParams) =>
  params.resolution > 0 ? Math.min(params.resolution, 3) : Math.min((typeof devicePixelRatio === 'number' && devicePixelRatio) || 1, 2);

const mapKey = (shape: LensShape, params: LiquidGlassParams, density: number) => {
  const { dispersion: _dispersion, radius: _radius, ...shaping } = params;
  return [shape.width, shape.height, shape.radius, density, JSON.stringify(shaping)].join('|');
};

// ─── The composable ──────────────────────────────────────────────────────────

export interface UseLiquidGlassReturn {
  /** The `backdrop-filter` value for the refract layer while refracting the backdrop. */
  filter: Ref<string | null>;
  /** The id inside `filter`, kept for callers that build the url themselves. */
  filterId: Ref<string>;
  /** `backdrop` (Chromium), `content` (a marked element behind the pane), or `none`. */
  mode: Ref<'backdrop' | 'content' | 'none'>;
  /** The lit rim as a CSS image, for the specular layer; null before it is painted. */
  rim: Ref<string | null>;
  map: Ref<DisplacementMap | null>;
  width: Ref<number>;
  height: Ref<number>;
  /** False when nothing bends — render the frost alone. */
  supported: Ref<boolean>;
  refresh: () => void;
}

/**
 * Keeps a lens in step with an element's size, its settings and the page's theme.
 *
 * Maps are cached by shape and settings, so a resize that settles on the same box, a
 * parent re-render, or a second pane of the same size costs nothing.
 */
export function useLiquidGlass(
  target: Ref<HTMLElement | null>,
  params: MaybeRefOrGetter<Partial<LiquidGlassParams>>,
  options: {
    enabled?: MaybeRefOrGetter<boolean>;
    /** The rim's light; omit or return null to skip painting it. */
    light?: MaybeRefOrGetter<GlassLight | null>;
    source?: MaybeRefOrGetter<GlassSource>;
  } = {},
): UseLiquidGlassReturn {
  const filter = ref<string | null>(null);
  const filterId = ref('');
  const mode = ref<'backdrop' | 'content' | 'none'>('none');
  const rim = ref<string | null>(null);
  const map = ref<DisplacementMap | null>(null);
  const width = ref(0);
  const height = ref(0);
  const supported = ref(false);

  let frame = 0;
  let observer: ResizeObserver | null = null;
  let leave: (() => void) | null = null;
  let member: Member | null = null;
  let stopTheme: (() => void) | null = null;

  const stopContent = () => {
    leave?.();
    leave = null;
    member = null;
  };

  const repaintRim = () => {
    const element = target.value;
    const light = toValue(options.light ?? null);
    if (!element || !light || !width.value || !height.value) {
      rim.value = null;
      return;
    }
    const resolved = resolveParams(toValue(params));
    const shine = parseFloat(getComputedStyle(element).getPropertyValue('--lg-rim-shine'));
    const shape = { width: width.value, height: height.value, radius: clamp(resolved.radius, 0, Math.min(width.value, height.value) / 2) };
    rim.value = paintRim(shape, Number.isFinite(shine) ? clamp(shine, 0, 1) : 0.3, light);
  };

  const rebuild = () => {
    frame = 0;
    const element = target.value;
    repaintRim();
    if (!element || !toValue(options.enabled ?? true) || !width.value || !height.value) {
      stopContent();
      filter.value = null;
      map.value = null;
      mode.value = 'none';
      supported.value = false;
      return;
    }

    const resolved = resolveParams(toValue(params));
    const shape = { width: width.value, height: height.value, radius: clamp(resolved.radius, 0, Math.min(width.value, height.value) / 2) };
    const density = densityFor(resolved);
    const key = mapKey(shape, resolved, density);
    const maps = encode(key, () => lensMap(shape, resolved, density));
    map.value = maps ? { href: maps.across, scale: maps.scale, width: shape.width, height: shape.height } : null;

    const source = toValue(options.source ?? 'auto');
    const backdrop = source !== 'content' && supportsSvgBackdropFilter();
    const content = !backdrop && source !== 'backdrop' ? findGlassBackdrop(element) : null;

    if (backdrop && maps) {
      stopContent();
      filterId.value = backdropFilter(maps, key, shape.width, shape.height, resolved.dispersion);
      filter.value = `url("#${filterId.value}")`;
      mode.value = 'backdrop';
    } else if (content && maps) {
      filter.value = null;
      if (member && leave) {
        member.maps = maps;
        member.key = `${key}|${resolved.dispersion}`;
        member.dispersion = resolved.dispersion;
      } else {
        member = { glass: element, maps, key: `${key}|${resolved.dispersion}`, dispersion: resolved.dispersion };
        leave = joinSurface(content, member);
      }
      mode.value = 'content';
    } else {
      stopContent();
      filter.value = null;
      mode.value = 'none';
    }
    supported.value = mode.value !== 'none';
  };

  const schedule = () => {
    if (frame || typeof requestAnimationFrame === 'undefined') return;
    frame = requestAnimationFrame(rebuild);
  };

  const apply = (w: number, h: number) => {
    // Round, or sub-pixel jitter redraws the map on every scroll-driven reflow.
    const rw = Math.round(w);
    const rh = Math.round(h);
    if (rw === width.value && rh === height.value) return;
    width.value = rw;
    height.value = rh;
    schedule();
  };

  onMounted(() => {
    const element = target.value;
    if (!element) return;
    // observe() fires once immediately, so there is no separate initial measurement.
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = entry.borderBoxSize?.[0];
        if (box) apply(box.inlineSize, box.blockSize);
        else apply(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(element);
    stopTheme = onThemeChange(repaintRim);
  });

  watch(
    () => [toValue(params), toValue(options.enabled ?? true), toValue(options.light ?? null), toValue(options.source ?? 'auto')],
    () => schedule(),
    { deep: true },
  );

  onBeforeUnmount(() => {
    observer?.disconnect();
    stopTheme?.();
    stopContent();
    if (frame) cancelAnimationFrame(frame);
  });

  return { filter, filterId, mode, rim, map, width, height, supported, refresh: schedule };
}

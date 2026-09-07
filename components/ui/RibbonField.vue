<script lang="ts">
  /**
   * Two ribbons, rendered.
   *
   * Two crossing ribbons given width, twist, depth and light, moving
   * continuously — and bending toward the pointer while it is held down.
   * Hovering does nothing; the pull is a grab.
   *
   * The weave is derived, not drawn. Both centrelines are mirrored sinusoids
   * (`y = mid ± A·sin(ωu + φ)`), so they meet wherever `sin` is 0. Give each
   * ribbon the depth `z = ±cos(ωu + φ)` and at every one of those meetings
   * `cos` is forced to ±1 — the two are always at opposite depth where they
   * touch, and which one is in front flips at each crossing. That is a weave,
   * and a painter's algorithm resolves the whole thing: no mask, no clip, no
   * crossing coordinates to solve for.
   *
   * This block is plain `<script>` on purpose: top-level `<script setup>` code
   * re-runs per instance, and these constants and pure helpers must run once.
   */

  /**
   * Quad budget. The strip is sampled to roughly one quad per `SEGMENT_PX` of
   * width and clamped to this range: below ~6px a quad is narrower than the seam
   * that seals it, so the extra geometry is invisible and only costs fill rate —
   * which is exactly the budget a phone does not have.
   */
  const MAX_SEGMENTS = 150;
  const MIN_SEGMENTS = 64;
  const SEGMENT_PX = 6;

  /**
   * Below this the field is treated as a narrow column rather than a band: fewer
   * and broader waves, a looser fit around the word, and a wider grab radius for
   * a fingertip.
   */
  const NARROW = 480;
  /** Depth over which the front pass fades in. Wider reads as a gentler slide. */
  const FEATHER = 0.5;
  /** How opaque the word is over the ribbons. Below 1 so it never erases them. */
  const WORD_ALPHA = 0.82;
  /** How hard the pointer pulls, and how far its influence reaches. */
  const PULL = 0.8;
  const PULL_REACH = 0.17;
  /** A fingertip is blunter than a cursor, so it grabs a wider stretch. */
  const PULL_REACH_NARROW = 0.28;
  const TAU = Math.PI * 2;

  /**
   * Where each ramp stop sits relative to its base color: negative mixes toward
   * black, positive toward white. Five stops, shadow → highlight, sampled by the
   * lighting term — which is what makes the band read as lit rather than filled.
   */
  const RAMP_MIX = [-0.55, -0.28, 0, 0.28, 0.58] as const;

  /** Used only when the theme tokens are missing — matches `style.css`. */
  const FALLBACK_BASE = ['#3b82f6', '#8b5cf6'] as const;
  const FALLBACK_WORD = '#111827';

  type RGB = [number, number, number];

  const BLACK: RGB = [0, 0, 0];
  const WHITE: RGB = [255, 255, 255];

  /**
   * Normalise any CSS color through the canvas itself, which spares us a color
   * parser: assigning an invalid value leaves `fillStyle` untouched, so seeding
   * it with the fallback first makes bad input fall back rather than inherit
   * whatever the previous quad painted.
   */
  const normalizeColor = (
    ctx: CanvasRenderingContext2D,
    value: string,
    fallback: string,
  ): string => {
    ctx.fillStyle = fallback;
    ctx.fillStyle = value;
    return String(ctx.fillStyle);
  };

  const toRgb = (css: string, fallback: RGB): RGB => {
    const value = css.trim();

    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
    if (hex) {
      const digits =
        hex[1].length === 3
          ? hex[1]
              .split('')
              .map((c) => c + c)
              .join('')
          : hex[1];
      const n = parseInt(digits, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
    if (rgb) {
      const parts = rgb[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .slice(0, 3)
        .map(Number);
      if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) return parts as RGB;
    }

    return fallback;
  };

  const mix = (a: RGB, b: RGB, t: number): RGB => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];

  const sameColor = (a: RGB, b: RGB): boolean =>
    Math.round(a[0]) === Math.round(b[0]) &&
    Math.round(a[1]) === Math.round(b[1]) &&
    Math.round(a[2]) === Math.round(b[2]);

  /**
   * Drain a color toward its own grey, holding its luminance. Used for the
   * second ribbon when a theme has no distinct secondary: the pair reads as one
   * strong color against a quieter relative of it, not as two competing hues.
   */
  const drain = (c: RGB): RGB => {
    const grey = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return mix(c, [grey, grey, grey], 0.72);
  };

  /** Expand one base color into a shadow → highlight ramp. */
  const buildRamp = (base: RGB): RGB[] =>
    RAMP_MIX.map((m) => (m < 0 ? mix(base, BLACK, -m) : mix(base, WHITE, m)));

  /** Sample a ramp at 0–1, interpolating between its stops. */
  const sampleRamp = (ramp: RGB[], at: number): string => {
    const t = Math.min(0.9999, Math.max(0, at)) * (ramp.length - 1);
    const i = Math.floor(t);
    const f = t - i;
    const a = ramp[i];
    const b = ramp[i + 1] ?? ramp[i];
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)} ${Math.round(
      a[1] + (b[1] - a[1]) * f,
    )} ${Math.round(a[2] + (b[2] - a[2]) * f)})`;
  };

  type Quad = { pts: [number, number][]; z: number; fill: string };
</script>

<script setup lang="ts">
  import { onMounted, ref, watchEffect } from 'vue';
  import { useReducedMotion } from '@/composables/useReducedMotion';

  const props = withDefaults(
    defineProps<{
      /** Woven into the ribbons at z = 0. Pass it already cased. */
      word?: string;
      /**
       * Two ramps of CSS colors, shadow → highlight, overriding the ones derived
       * from `--color-primary` / `--color-secondary`. Any stop count works.
       */
      ramps?: readonly (readonly string[])[];
      /** Fill for the word. Defaults to the `--color-text` token. */
      wordColor?: string;
      /** Set false for a purely decorative field that ignores the pointer. */
      interactive?: boolean;
    }>(),
    { interactive: true },
  );

  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  // Metrics are measured from the real display face, so nothing can be sized
  // until it has actually loaded.
  const fontsReady = ref(false);

  onMounted(() => {
    document.fonts?.ready.then(() => (fontsReady.value = true)).catch(() => {});
  });

  watchEffect(
    (onCleanup) => {
      // Read every reactive value up front and close over it. This is both the
      // dependency list (Vue only tracks synchronous reads) and the guarantee
      // that the RAF loop sees a stable snapshot for the frames it owns.
      const isReduced = reduced.value;
      const word = props.word;
      const ready = fontsReady.value;
      const customRamps = props.ramps;
      const wordColor = props.wordColor;
      const interactive = props.interactive;

      const canvas = canvasRef.value;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      let width = 0;
      let height = 0;
      let raf = 0;
      let running = true;

      let rampRgb: RGB[][] = [];
      let wordFill = FALLBACK_WORD;
      let wordFace = 'sans-serif';

      // Read from the tokens rather than restated here, so the field cannot
      // drift away from the palette the rest of the app is drawn from. Re-run
      // on every theme change, since the tokens are what change.
      const readTheme = () => {
        const root = getComputedStyle(document.documentElement);
        const token = (name: string) => root.getPropertyValue(name).trim();

        wordFace = token('--font-primary') || token('--font-sans') || 'sans-serif';
        wordFill = normalizeColor(ctx, wordColor || token('--color-text'), FALLBACK_WORD);

        if (customRamps?.length) {
          rampRgb = customRamps.map((ramp) =>
            ramp.map((stop) => toRgb(normalizeColor(ctx, stop, FALLBACK_WORD), BLACK)),
          );
        } else {
          // Ribbon 0 takes the primary. Ribbon 1 takes the secondary where the
          // theme defines a distinct one, and a drained primary where it does
          // not — token sets that stop at `--color-primary` are common, and two
          // identical ribbons read as one object.
          const primary = toRgb(
            normalizeColor(ctx, token('--color-primary'), FALLBACK_BASE[0]),
            toRgb(FALLBACK_BASE[0], BLACK),
          );
          const secondaryToken = token('--color-secondary');
          const secondary = secondaryToken
            ? toRgb(normalizeColor(ctx, secondaryToken, FALLBACK_BASE[1]), primary)
            : primary;
          rampRgb = [
            buildRamp(primary),
            buildRamp(sameColor(secondary, primary) ? drain(primary) : secondary),
          ];
        }
      };

      // Held in normalised space and eased toward, so the ribbons follow the
      // pointer instead of snapping to it. `active` is only true while the
      // pointer is *held down*: hovering does nothing.
      const pointer = { x: 0.5, y: 0.5, active: false };
      const eased = { x: 0.5, y: 0.5, strength: 0 };
      // Whichever pointer grabbed first owns the pull until it lets go. Without
      // this a second finger retargets the ribbon mid-drag, and on a touchscreen
      // the second finger is usually the one that was only there to scroll.
      let heldPointer: number | null = null;

      // Measured once per size change rather than per frame. measureText is not
      // guaranteed to return bit-identical metrics every call, and a font size
      // that wobbles by a fraction of a pixel each frame shows up as a shimmer
      // along the letter edges.
      let wordSize = 0;
      let wordBaseline = 0;

      const measureWord = () => {
        wordSize = 0;
        if (!word || !ready || !width || !height) return;
        ctx.font = `800 100px ${wordFace}`;
        const m = ctx.measureText(word);
        const ascent = m.actualBoundingBoxAscent || 72;
        const descent = m.actualBoundingBoxDescent || 20;
        // Fit the width, but let height win if the box would outgrow the band —
        // scripts with tall ascenders set far taller at the same width. The fit is
        // looser on a narrow field: 96% of a hero is a comfortable margin, 96% of a
        // phone is a word wedged against both bezels.
        const fit = width < NARROW ? 0.86 : 0.96;
        wordSize =
          100 * Math.min((width * fit) / (m.width || 1), (height * 0.58) / (ascent + descent));
        // Optical centring on the glyph box, not the em box, so the ribbons cross
        // the letterforms rather than the leading above them.
        wordBaseline = ((ascent - descent) * (wordSize / 100)) / 2;
      };

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        // Capped: past 2 the extra pixels cost fill rate and buy nothing.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width;
        height = rect.height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        measureWord();
      };

      const draw = (time: number) => {
        const t = time / 1000;
        ctx.clearRect(0, 0, width, height);

        const mid = height * 0.5;
        const narrow = width < NARROW;

        // Amplitude and band height track the short edge so the composition holds
        // from a phone to an ultrawide. The width term alone is what keeps the
        // ribbons inside a very wide box, but on a narrow one it collapses them to
        // a thread down the middle — so it cannot pull them below a floor set by
        // the height that is actually available.
        const amp = Math.min(height * 0.22, Math.max(width * 0.09, height * 0.14));
        const band = Math.min(height * 0.15, Math.max(width * 0.055, height * 0.085));

        // Fewer waves in a narrow field. At 1.35 the crossings land within a
        // thumb's width of each other on a phone and the weave stops being
        // readable as a weave — which is the one thing this component is for.
        const waves = narrow ? 1 : 1.35;
        const omega = TAU * waves;

        // Roughly one quad per SEGMENT_PX of width rather than a flat 150.
        const segments = Math.max(
          MIN_SEGMENTS,
          Math.min(MAX_SEGMENTS, Math.round(width / SEGMENT_PX)),
        );
        const phase = -t * 0.22;

        eased.x += (pointer.x - eased.x) * 0.13;
        eased.y += (pointer.y - eased.y) * 0.13;
        eased.strength += ((pointer.active ? 1 : 0) - eased.strength) * 0.09;

        // Where each ribbon crosses the word's plane, solved rather than sampled.
        // `z = ±cos(ωu + φ)` is zero at `ωu + φ = π/2 + kπ`, so the exact crossing
        // points are available in closed form — and both ribbons share them, since
        // one's depth is the other's negated. Without these the depth boundary can
        // only land on a uniform sample, and a whole segment flips from behind the
        // letters to in front of them at once.
        const samples: number[] = [];
        for (let k = 0; k <= segments; k++) samples.push(k / segments);
        for (let k = -2; k <= Math.ceil(waves * 2) + 2; k++) {
          const u = (Math.PI / 2 + k * Math.PI - phase) / omega;
          if (u > 0 && u < 1) samples.push(u);
        }
        samples.sort((a, b) => a - b);

        const quads: Quad[] = [];

        for (let i = 0; i < 2; i++) {
          const sign = i === 0 ? 1 : -1;
          const ramp = rampRgb[i] ?? rampRgb[0];
          // Offsetting the twist per ribbon keeps them from turning edge-on at the
          // same moment, which would read as one object rather than two.
          const twistPhase = t * 0.34 + (i * Math.PI) / 2;

          let prev: {
            top: [number, number];
            bottom: [number, number];
            z: number;
            light: number;
          } | null = null;

          for (const u of samples) {
            const wave = omega * u + phase;

            const x = u * width;
            let y = mid + sign * amp * Math.sin(wave);

            // The pull. A Gaussian falloff along x, so the strip is drawn toward
            // the pointer where it is and left alone further along — which is what
            // makes it read as a grab on one point rather than the whole ribbon
            // swinging.
            if (eased.strength > 0.001) {
              const px = eased.x * width;
              const py = eased.y * height;
              const reach = narrow ? PULL_REACH_NARROW : PULL_REACH;
              const falloff = Math.exp(-(((x - px) / (width * reach)) ** 2));
              y += (py - y) * PULL * falloff * eased.strength;
            }

            // The twist is height and light together. Modulating only one reads as
            // a fat wavy line; modulating both is what makes it read as a band
            // turning edge-on.
            const theta = TAU * 1.15 * u + twistPhase;
            const face = Math.abs(Math.cos(theta));
            // Never fully zero: a ribbon that vanishes at every quarter turn reads
            // as a rendering fault rather than as foreshortening.
            const halfH = band * (0.18 + 0.82 * face);
            const z = sign * Math.cos(wave);

            // Light: mostly how square the ribbon is to the viewer, plus a little
            // from depth so the near pass reads brighter than the far.
            const light = 0.1 + 0.68 * face + 0.22 * ((z + 1) / 2);

            const node = {
              top: [x, y - halfH] as [number, number],
              bottom: [x, y + halfH] as [number, number],
              z,
              light,
            };

            if (prev) {
              quads.push({
                pts: [prev.top, node.top, node.bottom, prev.bottom],
                z: (prev.z + z) / 2,
                fill: sampleRamp(ramp, (prev.light + light) / 2),
              });
            }
            prev = node;
          }
        }

        // Back to front. This is the whole over/under: the two ribbons carry
        // opposite z wherever they cross, so sorting resolves the weave.
        quads.sort((a, b) => a.z - b.z);

        // `seal` closes the hairline gaps antialiasing leaves between quads that
        // share an edge. It must be off whenever globalAlpha is below 1: a stroke
        // laid over its own fill at partial alpha blends twice along every seam,
        // and 300 of those reads as vertical banding straight across the word.
        const paint = (quad: Quad, seal = true) => {
          ctx.beginPath();
          ctx.moveTo(quad.pts[0][0], quad.pts[0][1]);
          for (let p = 1; p < quad.pts.length; p++) {
            ctx.lineTo(quad.pts[p][0], quad.pts[p][1]);
          }
          ctx.closePath();
          ctx.fillStyle = quad.fill;
          ctx.fill();
          if (seal) {
            ctx.strokeStyle = quad.fill;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        };

        // The whole ribbon is laid down first — every quad, in depth order, so the
        // ribbon-over-ribbon weave is intact and the strip is unbroken. The word
        // then covers what is behind it. The in-front portion is laid back over the
        // top afterwards.
        //
        // Drawn as one string, never letter by letter: scripts that join would come
        // apart if it were split to sort glyphs individually.
        for (const quad of quads) paint(quad);

        if (word && ready && wordSize > 0) {
          // Static, and translucent. A fully opaque word erases every part of the
          // strip behind it — half of it — so the ribbon arrives at a letter and
          // simply stops. At 0.82 the strip stays continuous and reads as passing
          // behind glass. Depth by attenuation, not deletion.
          ctx.font = `800 ${wordSize}px ${wordFace}`;
          ctx.textAlign = 'center';
          ctx.fillStyle = wordFill;
          ctx.globalAlpha = WORD_ALPHA;
          ctx.fillText(word, width / 2, mid + wordBaseline);
          ctx.globalAlpha = 1;
        }

        if (word && ready) {
          // The handover. Splitting on the sign of z makes the transition binary:
          // at the crossing the strip goes from wholly hidden to wholly on top
          // inside a single pixel column, which reads as a cut straight through it.
          // So the front pass fades in over depth instead.
          //
          // Redrawing an opaque quad over itself is a no-op wherever the word did
          // not paint, so only the overlap actually blends.
          for (const quad of quads) {
            if (quad.z <= 0) continue;
            const k = Math.min(1, quad.z / FEATHER);
            ctx.globalAlpha = k * k * (3 - 2 * k); // smoothstep
            paint(quad, false);
          }
          ctx.globalAlpha = 1;
        }

        if (running && !isReduced) raf = requestAnimationFrame(draw);
      };

      const track = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        pointer.x = (e.clientX - rect.left) / rect.width;
        pointer.y = (e.clientY - rect.top) / rect.height;
      };

      // Grab on press, release on let-go. Following the pointer unpressed means the
      // ribbons react to it merely crossing the section on its way somewhere else,
      // which is motion the reader never asked for.
      const onPointerDown = (e: PointerEvent) => {
        if (heldPointer !== null) return;
        heldPointer = e.pointerId;
        track(e);
        pointer.active = true;
      };
      // Tracked on the window rather than the canvas, so a drag that leaves the
      // section keeps pulling instead of snapping back at the edge.
      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerId === heldPointer) track(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (e.pointerId !== heldPointer) return;
        heldPointer = null;
        pointer.active = false;
      };
      // A touch that turns into a page scroll never sends pointerup — the browser
      // cancels it. Releasing on cancel is what stops the ribbon staying stuck to
      // a finger that has long since gone.
      const onLostCapture = onPointerUp;

      const start = () => {
        if (running || isReduced) return;
        running = true;
        raf = requestAnimationFrame(draw);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      const resizeObserver = new ResizeObserver(() => {
        resize();
        if (isReduced) draw(0);
      });
      resizeObserver.observe(canvas);

      // Idle work behind the fold is wasted battery on a page people scroll.
      const visibility = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? start() : stop()),
        { threshold: 0 },
      );
      visibility.observe(canvas);

      const onVisibility = () => (document.hidden ? stop() : start());
      document.addEventListener('visibilitychange', onVisibility);

      // A theme swap rewrites the tokens the ramps and the word are sampled from,
      // so re-read on all three routes that can change them: the `data-theme`
      // attribute (`applyThemeToDOM`), the injected variables stylesheet
      // (`applyTheme`, which the color customizer rewrites in place), and the OS
      // preference while the app is following the system.
      const onThemeChange = () => {
        readTheme();
        measureWord();
        if (isReduced) draw(0);
      };

      const themeAttr = new MutationObserver(onThemeChange);
      themeAttr.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });

      const themeVars = new MutationObserver(onThemeChange);
      const varsElement = document.getElementById('app-theme-variables');
      if (varsElement) {
        themeVars.observe(varsElement, { childList: true, characterData: true, subtree: true });
      }

      const systemScheme = window.matchMedia('(prefers-color-scheme: dark)');
      systemScheme.addEventListener('change', onThemeChange);

      readTheme();
      resize();

      if (isReduced) {
        // One frame, held. Content is never withheld pending animation.
        running = false;
        draw(0);
      } else {
        if (interactive) {
          // Not passive-blocking anything: `preventDefault` is never called, so a
          // touch drag still scrolls the page normally while it pulls.
          canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
          window.addEventListener('pointermove', onPointerMove, { passive: true });
          window.addEventListener('pointerup', onPointerUp, { passive: true });
          window.addEventListener('pointercancel', onPointerUp, { passive: true });
          canvas.addEventListener('lostpointercapture', onLostCapture, { passive: true });
        }
        raf = requestAnimationFrame(draw);
      }

      onCleanup(() => {
        stop();
        resizeObserver.disconnect();
        visibility.disconnect();
        themeAttr.disconnect();
        themeVars.disconnect();
        systemScheme.removeEventListener('change', onThemeChange);
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('lostpointercapture', onLostCapture);
      });
    },
    // Post-flush, so the canvas element exists when the effect first runs.
    { flush: 'post' },
  );
</script>

<template>
  <!--
    `touch-pan-y` is the whole touch story: it hands vertical swipes back to the
    browser so the page still scrolls past the field, while horizontal and
    diagonal drags are delivered here as pointer events instead of being consumed
    as a scroll gesture. Without it a phone has no way to grab the ribbons at all;
    with `touch-none` instead, a full-height hero would trap the reader on it.
  -->
  <canvas
    ref="canvasRef"
    aria-hidden="true"
    class="block size-full select-none"
    :class="interactive && !reduced ? 'cursor-grab touch-pan-y active:cursor-grabbing' : undefined"
  />
</template>

<style scoped>
  /* A tap on a decorative canvas should leave no mark on it. */
  canvas {
    -webkit-tap-highlight-color: transparent;
  }
</style>

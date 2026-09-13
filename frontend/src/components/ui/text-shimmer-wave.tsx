import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Text that rolls, character by character, under a light that travels with the
 * roll.
 *
 * Adapted for this project from the supplied component:
 *  - **no `motion/react`** (not a dependency here). The original ran a
 *    framer-motion timeline that advanced a "wave position" across the
 *    characters and animated each one from that position; here every character
 *    carries the *same* CSS keyframe and differs only in its `animation-delay`,
 *    which `styles/tailwind.css` derives from the character's index
 *    (`--wave-index`). No React work happens after mount and the wave never
 *    depends on an animation frame — a non-composited document still shows it;
 *  - `spread` is **seconds between adjacent characters**, not the original's
 *    unitless multiplier: with a delay per character the wave's speed is exactly
 *    `spread`, so a label of `n` characters sweeps left to right over
 *    `n × spread` seconds and the wave front is readable from the props alone;
 *  - `zDistance`, `scaleDistance` and `rotateYDistance` keep the original's names
 *    and meanings (px, ratio, degrees);
 *  - the demo set its colours with Tailwind v4 `[--base-color:…]` custom
 *    properties. Those variables do not exist in this project (Tailwind 3.4.6
 *    with its own olive/amber palette), so the two colours are props fed by the
 *    app's tokens. **The base colour is required in practice**: the glyphs are
 *    painted with `color: transparent` so the gradient can clip to them, so they
 *    cannot inherit the call site's text colour;
 *  - reduced motion removes the roll and the sweep and repaints the glyphs in
 *    their base colour, and a browser without `background-clip: text` keeps that
 *    base colour too rather than rendering nothing;
 *  - the original split the string into one element per character, including the
 *    spaces. So does this — those characters get `white-space: pre` so the gaps
 *    survive and they stay break opportunities, so a long label still wraps.
 *    Because the visible text is one element per glyph, it is `aria-hidden` and
 *    the real string is carried by an `sr-only` span, so assistive tech reads a
 *    sentence instead of spelling it out.
 *
 * This is the *heavier* sibling of `text-shimmer.tsx`. The flat sweep belongs on
 * a short inline label that is briefly in flight ("Saving…", "LIVE"); the roll
 * belongs on the app's few long-running waits, where the motion is worth the
 * extra glyph work — the model warm-up and the first backend fetch. Never put it
 * on a number someone has to read off: the characters are being repainted, not
 * merely tinted.
 */
export interface TextShimmerWaveProps {
  /** The text to roll. A string, because it is split per character. */
  children: string;
  className?: string;
  /**
   * Seconds for one character's full roll cycle.
   * @default 1
   */
  duration?: number;
  /**
   * Seconds between adjacent characters starting their roll. This *is* the wave's
   * speed, so smaller is a tighter, faster-moving wave.
   * @default 0.07
   */
  spread?: number;
  /**
   * How far a character lifts toward the reader at the top of its roll, in px.
   * @default 4
   */
  zDistance?: number;
  /**
   * Scale a character reaches at the top of its roll.
   * @default 1.08
   */
  scaleDistance?: number;
  /**
   * Rotation about the vertical axis at the top of a character's roll, in degrees.
   *
   * Keep this low on small text. Every character is re-rasterised through a 3D
   * transform, and past roughly 15° a 12–14px glyph stops looking crisp — the roll
   * is carried by `scaleDistance` and the travelling light, which cost no
   * legibility, so raise this only for display-size type.
   * @default 12
   */
  rotateYDistance?: number;
  /**
   * Colour the glyphs hold. Must be a colour value, not `currentColor`: the
   * element's own colour is transparent so the gradient can clip to it.
   * @default 'var(--foreground)'
   */
  baseColor?: string;
  /**
   * Colour of the light travelling along the roll.
   * @default 'var(--accent)'
   */
  highlightColor?: string;
}

export function TextShimmerWave({
  children,
  className,
  duration = 1,
  spread = 0.07,
  zDistance = 4,
  scaleDistance = 1.08,
  rotateYDistance = 12,
  baseColor = 'var(--foreground)',
  highlightColor = 'var(--accent)',
}: TextShimmerWaveProps) {
  /*
    One gradient per character, so the light is clipped to that glyph and its
    position sweeps on the same staggered clock as the roll.

    The band is narrow and the gradient three times the glyph's width (see
    the `background-size` in styles/tailwind.css) on purpose. At the flat sweep's
    proportions — a wide band on a 2× gradient — a per-character copy of the light
    paints the highlight across *every* glyph at once, which leaves the whole label
    washed out and hard to read for the entire cycle. Three times the width means
    each glyph shows a third of the gradient at a time: solid base colour at the
    start and end of its cycle, and the light crossing it once in the middle.
  */
  const glyphPaint = `linear-gradient(90deg, ${baseColor} 0%, ${baseColor} 38%, ${highlightColor} 50%, ${baseColor} 62%, ${baseColor} 100%)`;

  return (
    <span
      className={cn('text-shimmer-wave', className)}
      style={
        {
          '--wave-duration': `${duration}s`,
          '--wave-step': `${spread}s`,
          '--wave-z': `${zDistance}px`,
          '--wave-scale': `${scaleDistance}`,
          '--wave-rotate': `${rotateYDistance}deg`,
          '--wave-base': baseColor,
        } as React.CSSProperties
      }
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true">
        {Array.from(children).map((character, index) => (
          <span
            key={`${index}-${character}`}
            className="text-shimmer-wave-char"
            style={
              {
                '--wave-index': index,
                backgroundImage: glyphPaint,
              } as React.CSSProperties
            }
          >
            {character}
          </span>
        ))}
      </span>
    </span>
  );
}

export default TextShimmerWave;

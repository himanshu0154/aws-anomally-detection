import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Text with a light sweeping across it, drawn by clipping a moving gradient to
 * the glyphs.
 *
 * Adapted for this project from the supplied component:
 *  - **no `motion/react`** (not a dependency here): the sweep is a single CSS
 *    background-position keyframe (`textShimmer` in `styles/tailwind.css`), so it
 *    costs no React work and never touches an animation frame;
 *  - the demo set its colours with Tailwind v4 `[--base-color:var(--color-blue-600)]`
 *    tokens. Those variables do not exist here and this project is Tailwind 3.4.6
 *    with its own olive/amber palette, so the two colours are props fed by the
 *    app's tokens (`--foreground`, `--accent`, `--danger`, …). **The base colour
 *    is required in practice**: the text is painted with `color: transparent` so
 *    the gradient can clip to it, so it cannot inherit the call site's text
 *    colour — pass the token that surface already uses;
 *  - reduced motion parks the sweep and repaints the text in its base colour, and
 *    a browser without `background-clip: text` keeps the base colour too instead
 *    of rendering nothing;
 *  - `duration` is seconds, as in the demo.
 *
 * This is a *waiting* signal, not decoration: it belongs on a short label whose
 * state is genuinely in flight — connecting, warming up, saving, reconnecting,
 * LIVE. It is not for readings, and never for a number someone has to read off,
 * because the glyphs are being repainted rather than merely tinted.
 */
export interface TextShimmerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Seconds for one sweep.
   * @default 1.6
   */
  duration?: number;
  /**
   * Colour the sweep travels along. Must be a colour value, not `currentColor`:
   * the element's own colour is transparent so the gradient can clip to it.
   * @default 'var(--foreground)'
   */
  baseColor?: string;
  /**
   * Colour of the travelling highlight.
   * @default 'var(--accent)'
   */
  highlightColor?: string;
}

export function TextShimmer({
  children,
  className,
  duration = 1.6,
  baseColor = 'var(--foreground)',
  highlightColor = 'var(--accent)',
}: TextShimmerProps) {
  return (
    <span
      className={cn('text-shimmer inline-block', className)}
      style={
        {
          '--shimmer-base': baseColor,
          '--shimmer-highlight': highlightColor,
          // The highlight sits at the middle of a symmetric base run, so the
          // gradient tiles without a seam as the position animates.
          backgroundImage: `linear-gradient(90deg, ${baseColor} 0%, ${baseColor} 35%, ${highlightColor} 50%, ${baseColor} 65%, ${baseColor} 100%)`,
          animationDuration: `${duration}s`,
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
}

export default TextShimmer;

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * A comet that travels around a container's border, drawn from the theme's own
 * colour tokens.
 *
 * Adapted for this project from the supplied component:
 *  - **no `motion/react`** (not a dependency here). The original animated an
 *    `offsetDistance` motion value; this does the same thing in CSS alone, so a
 *    lap costs no React work and no animation-frame callback. That matters twice
 *    over here: the app's other ambient layers deliberately never depend on rAF
 *    (a non-composited document never fires one), and a trail is a *paint-only*
 *    effect that must not compete with the polling provider for the main thread;
 *  - the gradient comes from the app palette (`--primary`, `--danger`, …), not a
 *    hardcoded blue, and is passed in as `className` exactly like the original;
 *  - the container must be `relative` and carry the radius the trail should
 *    follow; the layer below clips to the container's own radius via
 *    `border-radius: inherit`. Pass the matching `radius` too — `rounded-lg`
 *    surfaces use the default (`--radius`), `rounded-xl` surfaces pass
 *    `calc(var(--radius) + 0.25rem)`;
 *  - `active` renders nothing at all rather than parking a static comet on a
 *    surface that has nothing to signal, and the travel keyframes are dropped
 *    under `prefers-reduced-motion` (the comet then sits still on the top-left
 *    corner as a static accent, rather than disappearing with the state it
 *    carries);
 *  - browsers without `offset-path` basic shapes hide the comet entirely (see
 *    `styles/tailwind.css`) instead of leaving it in the middle of the box.
 *
 * Reserve it for a surface with something live behind it — an active anomaly, an
 * unresolved queue, a search that is currently filtering. It is a signal, not
 * chrome: a page where everything trails has nothing that stands out.
 */
export interface BorderTrailProps {
  /** Gradient classes for the comet, e.g. `bg-gradient-to-l from-danger/0 via-danger to-danger/0`. */
  className?: string;
  /**
   * Length of the comet, in px.
   * @default 120
   */
  size?: number;
  /**
   * Thickness of the comet, in px.
   * @default 3
   */
  thickness?: number;
  /**
   * Seconds for one full lap.
   * @default 8
   */
  duration?: number;
  /**
   * Corner radius of the path. Must match the container's radius class.
   * @default 'var(--radius)'
   */
  radius?: string;
  /** When false nothing is rendered. */
  active?: boolean;
}

export function BorderTrail({
  className,
  size = 120,
  thickness = 3,
  duration = 8,
  radius = 'var(--radius)',
  active = true,
}: BorderTrailProps) {
  if (!active) return null;

  // Half the thickness in from the edge, so the comet's outer edge lands on the
  // border line itself.
  const inset = thickness / 2;
  const trackStyle: React.CSSProperties = {
    offsetPath: `rect(${inset}px calc(100% - ${inset}px) calc(100% - ${inset}px) ${inset}px round ${radius})`,
    // Lay the comet along the direction of travel, so it reads as a streak.
    offsetRotate: 'auto',
    animationDuration: `${duration}s`,
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      {/*
        The track is a full-size, transparent box whose centre rides the path
        (in `tailwind.css`); the comet is centred inside it and inherits the
        track's rotation, so it stays tangent to the border on all four sides.
      */}
      <div className="border-trail-track absolute inset-0" style={trackStyle}>
        <span
          className={cn('absolute left-1/2 top-1/2 block rounded-full', className)}
          style={{ width: size, height: thickness, transform: 'translate(-50%, -50%)' }}
        />
      </div>
    </div>
  );
}

export default BorderTrail;

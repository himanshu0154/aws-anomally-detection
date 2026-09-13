'use client';

import React, { useId, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useVisibleAnimationFrame } from '@/hooks/useVisibleAnimationFrame';

/**
 * Text that shivers: a chain of `feTurbulence` + `feDisplacementMap` filters the
 * wrapper cycles through, so the glyphs wobble without ever leaving the DOM.
 *
 * Adapted for this project from the supplied component:
 *  - **no `motion/react`** (not a dependency here). The swap is driven by
 *    `useVisibleAnimationFrame`, the same policy the ambient backdrop and the
 *    inline canvas text use: one synchronous first paint, no work while the tab
 *    is hidden, and always the newest callback;
 *  - the filter is written **straight to the node** rather than held in state. A
 *    swap every `stepDuration` through React would re-render `children` ~8×/s for
 *    a purely visual change, and an SVG filter re-rasterizes its target on every
 *    swap — so this keeps the cost to one style write;
 *  - **reduced motion removes the filter entirely** rather than freezing a
 *    displaced glyph in place: the text is plain and static, and the loop then
 *    does nothing at all. `useReducedMotion` necessarily starts `false` and
 *    settles on mount (so server and first client render agree), which means a
 *    reduced-motion reader can see one displaced frame before the clear lands —
 *    acceptable for a decorative wobble, and worth it over adding a second
 *    preference reader beside the one that owns it;
 *  - the filter region is widened. The default is -10%/120% of the target's box,
 *    which clips displaced glyph edges — that reads as text being cut off rather
 *    than as wobble;
 *  - filter ids are scoped with `useId` (sanitised, since React's `:` is invalid
 *    in a `url(#…)` reference), so two instances on one page cannot steal each
 *    other's filter — the failure mode when the id is hardcoded;
 *  - it always renders a `span`. The original's `as` prop existed to choose a
 *    motion component; `display: inline-block` is what actually makes it behave
 *    (it needs its own box, since a CSS filter applies to the element box).
 *
 * Defaults are deliberately far gentler than the demo's: this is a dashboard, and
 * `scale` decides whether the wobble reads as emphasis or as a rendering glitch.
 * Keep it on a short label — never on a number you have to read off, and never on
 * body copy, because the displacement is real glyph deformation.
 */
export interface SquigglyTextProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Number of distinct displacement frames to cycle through.
   * Higher = smoother wobble, more filters in the DOM.
   * @default 5
   */
  steps?: number;
  /**
   * Time between filter swaps, in milliseconds. Lower = more frantic.
   * @default 120
   */
  stepDuration?: number;
  /**
   * Maximum displacement in px. Single number, or a tuple to alternate between
   * two values per step.
   * @default [2.5, 3.5]
   */
  scale?: number | [number, number];
  /**
   * Turbulence base frequency. Lower = longer, smoother waves.
   * @default 0.02
   */
  baseFrequency?: number;
  /**
   * Turbulence octaves. Higher = more detailed noise.
   * @default 3
   */
  numOctaves?: number;
}

export function SquigglyText({
  children,
  steps = 5,
  stepDuration = 120,
  scale = [2.5, 3.5],
  baseFrequency = 0.02,
  numOctaves = 3,
  className,
  style,
}: SquigglyTextProps) {
  const reactId = useId();
  // `useId` can emit ":" / "_", neither of which is valid inside `url(#…)`.
  const safeId = reactId.replace(/[:_]/g, '');
  const filterId = (index: number) => `squiggly-${safeId}-${index}`;

  const nodeRef = useRef<HTMLSpanElement>(null);
  const stepRef = useRef(-1);
  const appliedRef = useRef(false);
  const reducedMotion = useReducedMotion();

  const filters = useMemo(
    () => Array.from({ length: steps }, (_, index) => `url(#${filterId(index)})`),
    // filterId is derived from the stable `safeId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps, safeId]
  );

  useVisibleAnimationFrame((now) => {
    const node = nodeRef.current;
    if (!node) return;

    if (reducedMotion) {
      // Once the filter is off it stays off, so later frames return immediately.
      if (appliedRef.current) {
        node.style.filter = '';
        appliedRef.current = false;
        stepRef.current = -1;
      }
      return;
    }

    const step = Math.floor(now / stepDuration) % filters.length;
    if (appliedRef.current && step === stepRef.current) return;
    stepRef.current = step;
    appliedRef.current = true;
    node.style.filter = filters[step];
  });

  const scaleAt = (index: number) => (Array.isArray(scale) ? scale[index % scale.length] : scale);

  return (
    <span ref={nodeRef} className={cn('relative inline-block', className)} style={style}>
      <svg
        aria-hidden="true"
        focusable="false"
        className="pointer-events-none absolute h-0 w-0 overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {Array.from({ length: steps }).map((_, index) => (
            <filter
              key={index}
              id={filterId(index)}
              x="-25%"
              y="-25%"
              width="150%"
              height="150%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency={baseFrequency}
                numOctaves={numOctaves}
                seed={index}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={scaleAt(index)}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))}
        </defs>
      </svg>
      {children}
    </span>
  );
}

export default SquigglyText;

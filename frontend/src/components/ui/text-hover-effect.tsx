'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Outlined wordmark whose gradient fill is lit up by a soft light that follows
 * the pointer.
 *
 * Adapted for this project from the supplied component:
 *  - `motion/react` is not a dependency here. The draw-on is a CSS keyframe and
 *    the light writes the radial gradient's `cx`/`cy` attributes straight to the
 *    DOM, so moving the pointer never re-renders React. `prefers-reduced-motion`
 *    skips the draw-on.
 *  - Ids come from `useId()`. The original hardcoded `#textGradient`,
 *    `#revealMask` and `#textMask`, so two marks on one page shared a mask —
 *    only the first one could ever light up.
 *  - Colours come from the app theme (olive/amber/positive) instead of a
 *    hardcoded rainbow, the type is the app font, and the mark keeps a tinted
 *    fill when idle so it reads as a heading rather than only on hover.
 *  - The origin's reveal is an *outline* that lights up in colour; that edge is
 *    kept by stroking the lit layer with the same gradient as its fill, so the
 *    hover reads as a drawn edge rather than a plain fill.
 *  - Letterforms are sized in viewBox units and the viewBox is derived from the
 *    text, so the mark scales with its container instead of relying on
 *    `text-7xl` overflowing a fixed 300×100 box.
 */

const VIEWBOX_HEIGHT = 100;
/** Cap height in viewBox units. */
const FONT_SIZE = 72;
/** Approximate advance per character for the bold grotesque, as an em ratio. */
const ADVANCE_RATIO = 0.66;
/** Outlines are dashed slightly longer than the whole mark's perimeter. */
const DASH_PER_CHAR = 260;

export type TextHoverEffectProps = {
  text: string;
  className?: string;
  /** Seconds the outline takes to trace itself once. */
  duration?: number;
  /** Reveal radius, as a percentage of the viewBox diagonal. */
  radius?: number;
  /** Opacity of the always-on fill. Raise it for small marks in dense chrome. */
  idleOpacity?: number;
};

export const TextHoverEffect = ({
  text,
  className,
  duration = 4,
  radius = 20,
  idleOpacity = 0.22,
}: TextHoverEffectProps) => {
  const uid = useId().replace(/:/g, '');
  const gradientId = `mark-gradient-${uid}`;
  const revealId = `mark-reveal-${uid}`;
  const maskId = `mark-mask-${uid}`;

  const svgRef = useRef<SVGSVGElement>(null);
  const lightRef = useRef<SVGRadialGradientElement>(null);
  const [lit, setLit] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const width = Math.max(300, Math.ceil(text.length * ADVANCE_RATIO * FONT_SIZE) + 40);
  const dash = Math.max(1000, text.length * DASH_PER_CHAR);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  /**
   * `onPointerOver`/`onPointerOut` rather than enter/leave: enter/leave are
   * synthesized from `relatedTarget` (so they are easy to lose and never fire for
   * touch), while over/out bubble reliably. Moving between the hit area and the
   * text layers must not toggle the light, hence the containment check.
   */
  const crossesBoundary = (event: React.PointerEvent<SVGSVGElement>) => {
    const related = event.relatedTarget as Node | null;
    return !related || !event.currentTarget.contains(related);
  };

  /**
   * Move the light. Written straight to the attribute rather than through React
   * state: a pointer fires these dozens of times a second and none of the other
   * three text layers need to re-render for one.
   */
  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const node = lightRef.current;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!node || !rect?.width || !rect.height) return;
    node.setAttribute('cx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    node.setAttribute('cy', `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-label={text}
      onPointerOver={(event) => crossesBoundary(event) && setLit(true)}
      onPointerOut={(event) => crossesBoundary(event) && setLit(false)}
      onPointerMove={handleMove}
      className={cn('select-none font-sans font-bold', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="38%" stopColor="var(--positive)" />
          <stop offset="70%" stopColor="var(--warning)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>

        <radialGradient
          id={revealId}
          ref={lightRef}
          gradientUnits="userSpaceOnUse"
          r={`${radius}%`}
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>

        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={width}
          height={VIEWBOX_HEIGHT}
        >
          <rect x="0" y="0" width={width} height={VIEWBOX_HEIGHT} fill={`url(#${revealId})`} />
        </mask>
      </defs>

      {/* Transparent hit area, so the light tracks the pointer between glyphs too. */}
      <rect
        x="0"
        y="0"
        width={width}
        height={VIEWBOX_HEIGHT}
        fill="none"
        pointerEvents="all"
        aria-hidden="true"
      />

      {/*
        Three stacked layers of the same string: an outline, a dim fill and the
        lit fill. Only the SVG's aria-label should be announced — without
        aria-hidden here a screen reader reads the wordmark three times.
      */}

      {/* Outline, traced once on mount. */}
      <text
        aria-hidden="true"
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={FONT_SIZE}
        letterSpacing={2}
        fill="none"
        stroke="var(--border)"
        strokeWidth="0.4"
        className={cn(
          'transition-[stroke] duration-200',
          !reducedMotion && 'wordmark-draw',
          lit ? 'stroke-muted-foreground' : 'stroke-border'
        )}
        style={{
          strokeDasharray: dash,
          strokeDashoffset: reducedMotion ? 0 : dash,
          animationDuration: `${duration}s`,
        }}
      >
        {text}
      </text>

      {/* Idle fill: keeps the mark readable as a heading before any pointer. */}
      <text
        aria-hidden="true"
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={FONT_SIZE}
        letterSpacing={2}
        fill={`url(#${gradientId})`}
        opacity={idleOpacity}
      >
        {text}
      </text>

      {/* Lit fill and edge, clipped to the light that follows the pointer. */}
      <text
        aria-hidden="true"
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={FONT_SIZE}
        letterSpacing={2}
        fill={`url(#${gradientId})`}
        stroke={`url(#${gradientId})`}
        strokeWidth="0.4"
        mask={`url(#${maskId})`}
        className={cn(
          'transition-opacity duration-200',
          lit ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {text}
      </text>
    </svg>
  );
};

export default TextHoverEffect;

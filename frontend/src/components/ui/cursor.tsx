'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * A labelled pointer that replaces the native cursor over surfaces that opt in
 * with a `data-cursor` label.
 *
 * Adapted for this project from the supplied component:
 *  - **no `motion/react`** (not a dependency here): the original animated a
 *    cursor inside one parent element with scale/opacity variants. `attachToParent`,
 *    `variants` and `transition` therefore do not exist — this one belongs to the
 *    whole app (mounted once in `AppShell`), and its entrance is a CSS opacity
 *    transition instead of a spring;
 *  - the pointer position is written straight to the node on every `pointermove`
 *    (one `transform` write, no animation frame, so it works in a document that
 *    is not composited), and React re-renders **only when the label changes** —
 *    not once per pointer sample;
 *  - *which* surfaces get the cursor is data-driven: any element carrying
 *    `data-cursor="…"` gets the chip, optionally tinted through
 *    `data-cursor-tone="primary|accent|positive|warning|danger"`. Nothing is
 *    hardcoded to a component, so a new card or button picks it up by adding one
 *    attribute;
 *  - the native cursor is hidden over those elements *only while this component
 *    is actually running*: `labeled-cursor` is added to `<html>` from the effect,
 *    so a touch device or a reduced-motion reader keeps the real pointer
 *    everywhere;
 *  - it disables itself on coarse pointers and under `prefers-reduced-motion`
 *    rather than pinning a decorative pointer to the screen. Both readers start
 *    `false` and settle on mount (so server and first client render agree), which
 *    is why the component renders nothing until then;
 *  - the demo's hardcoded green arrow and its image are replaced by the themed
 *    glyph below (theme tokens, no image host dependency), and the demo's
 *    hardcoded SVG `id="a"` clip path is dropped — two instances on one page
 *    would have shared it, and the clip was redundant.
 *
 * Add a label only where it says something the surface does not already say:
 * "Resolve", "Show details", "Open queue". A cursor that labels everything is
 * noise, and `data-cursor` also removes the OS pointer there.
 */

/** Chip tints per tone. White text on each token matches the app's severity badges. */
const TONE_CLASS: Record<string, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  positive: 'bg-positive',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

/** Arrow fill per tone — the hex consumers of the same tokens. */
const TONE_FILL: Record<string, string> = {
  primary: 'var(--primary)',
  accent: 'var(--accent)',
  positive: 'var(--positive)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

interface Tip {
  label: string;
  tone: string;
}

function PointerGlyph({ tone }: { tone: string }) {
  return (
    <svg
      viewBox="0 0 26 31"
      className="h-7 w-6 drop-shadow-sm"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill={TONE_FILL[tone] ?? TONE_FILL.primary}
        fillRule="evenodd"
        stroke="#fff"
        strokeLinecap="square"
        strokeWidth={2}
        d="M21.993 14.425 2.549 2.935l4.444 23.108 4.653-10.002z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export interface CursorProps {
  /** Classes for the layer that follows the pointer. */
  className?: string;
  /** Classes for the label chip. */
  labelClassName?: string;
}

export function Cursor({ className, labelClassName }: CursorProps) {
  const finePointer = useMediaQuery('(pointer: fine)');
  const reducedMotion = useReducedMotion();
  const enabled = finePointer && !reducedMotion;

  const layerRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    // Scoped to <html> so the rule only exists while this component runs.
    root.classList.add('labeled-cursor');

    const hide = () => setTip(null);

    const onMove = (event: PointerEvent) => {
      const layer = layerRef.current;
      if (layer) {
        layer.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
      }

      const target =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-cursor]') : null;
      const label = target?.getAttribute('data-cursor')?.trim();
      const tone = target?.getAttribute('data-cursor-tone') ?? 'primary';

      setTip((current) => {
        if (!label) return current === null ? current : null;
        return current?.label === label && current.tone === tone ? current : { label, tone };
      });
    };

    document.addEventListener('pointermove', onMove);
    // Leaving the window, switching away or scrolling: the last position is stale.
    document.addEventListener('mouseleave', hide);
    window.addEventListener('blur', hide);
    document.addEventListener('scroll', hide, true);

    return () => {
      root.classList.remove('labeled-cursor');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', hide);
      window.removeEventListener('blur', hide);
      document.removeEventListener('scroll', hide, true);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className={cn('pointer-events-none fixed left-0 top-0 z-[120] will-change-transform', className)}
      // Parked off-canvas until the first pointer sample, so it never flashes in
      // the top-left corner.
      style={{ transform: 'translate(-200px, -200px)' }}
    >
      <div className={cn('transition-opacity duration-100', tip ? 'opacity-100' : 'opacity-0')}>
        <PointerGlyph tone={tip?.tone ?? 'primary'} />
        <span
          className={cn(
            'ml-4 mt-1 inline-block max-w-[16rem] truncate rounded px-2 py-0.5 text-xs font-semibold text-white shadow-md',
            TONE_CLASS[tip?.tone ?? 'primary'] ?? TONE_CLASS.primary,
            labelClassName
          )}
        >
          {tip?.label}
        </span>
      </div>
    </div>
  );
}

export default Cursor;

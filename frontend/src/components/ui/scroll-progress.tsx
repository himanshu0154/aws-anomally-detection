'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * A bar that tracks how far the reader has travelled through a scrollable region.
 *
 * Adapted for this project from the supplied component:
 *  - **no `motion/react`** (not a dependency here). The demo drove the bar with
 *    `useScroll` plus a spring; here a passive `scroll` listener computes the
 *    ratio and writes `transform: scaleX(…)` straight to the bar. Nothing
 *    re-renders while scrolling and no animation frame is involved, so the bar
 *    still tracks in a document that is not composited — the same rule the rest of
 *    this app's motion layer follows. The spring's job is done by a short CSS
 *    transition on the transform, which is skipped under reduced motion because a
 *    smoothing delay is decoration, not information;
 *  - **the axis is detected, not declared.** A region that scrolls vertically
 *    reports its vertical ratio, one that only scrolls horizontally reports its
 *    horizontal ratio, and a region that does not scroll at all reports nothing —
 *    the bar hides itself rather than sitting there as a dead 2px line on a short
 *    page. Placement is the caller's business (the bar is `absolute`/`fixed` by
 *    class), so the same component serves a fixed page-level bar and a rail inside
 *    an overflowing panel;
 *  - `containerRef` is optional. Without it the bar measures the document;
 *  - `springOptions` is accepted for API compatibility with the original and
 *    **ignored** — see the transition note above;
 *  - a `ResizeObserver` on the measured element means the ratio stays right when
 *    the content grows after paint (a table that fills in once its data lands),
 *    which a scroll listener alone would never notice.
 *
 * It reports position, so it belongs on regions whose length the reader cannot
 * judge — a long document, a wide table. It carries no state and should never be
 * used as a loading indicator; `text-shimmer` and `text-shimmer-wave` are the
 * app's waiting signals.
 */
export interface ScrollProgressProps {
  /** Placement and size, e.g. `fixed left-0 top-0 h-0.5 w-full`. */
  className?: string;
  /**
   * Region to measure. Omit it to measure the document.
   */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Accepted for API compatibility with the original. Ignored. */
  springOptions?: { stiffness?: number; damping?: number; mass?: number };
  /** Milliseconds of smoothing on the bar's movement. `0` makes it exact. */
  smoothMs?: number;
}

export function ScrollProgress({
  className,
  containerRef,
  smoothMs = 120,
}: ScrollProgressProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  const measure = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;

    const container = containerRef?.current ?? null;
    const verticalRange = container
      ? container.scrollHeight - container.clientHeight
      : document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const horizontalRange = container
      ? container.scrollWidth - container.clientWidth
      : 0;

    // A one-pixel tolerance: sub-pixel rounding on a `h-full` flex layout can
    // report a range of a fraction of a pixel, which is not a scrollable region.
    const axis: 'y' | 'x' | null =
      verticalRange > 1 ? 'y' : horizontalRange > 1 ? 'x' : null;

    if (!axis) {
      bar.style.opacity = '0';
      bar.dataset.scrollAxis = 'none';
      return;
    }

    // A region only reports a horizontal axis when it *has* a container, so this
    // branch can never read a null one.
    const position =
      axis === 'y'
        ? container
          ? container.scrollTop
          : window.scrollY
        : container
          ? container.scrollLeft
          : 0;
    const range = axis === 'y' ? verticalRange : horizontalRange;
    const progress = Math.min(1, Math.max(0, position / range));

    bar.style.opacity = '1';
    bar.dataset.scrollAxis = axis;
    bar.style.transform = `scaleX(${progress})`;
  }, [containerRef]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const container = containerRef?.current ?? null;

    // The bar is the same element the transform is written to, so the transition
    // is managed here rather than left to whatever classes the call site passed.
    bar.style.transformOrigin = 'left center';
    bar.style.transition = reducedMotion ? 'none' : `transform ${smoothMs}ms linear`;

    measure();

    // Content lands after paint — a table fills in, a chart mounts — so the
    // element itself is watched, not just its scroll offset.
    const observer = new ResizeObserver(measure);
    observer.observe(container ?? document.documentElement);
    window.addEventListener('resize', measure);

    // `window` and an element are subscribed separately rather than through a
    // union: their `addEventListener` overloads do not unify.
    const onScroll = () => measure();
    if (container) {
      container.addEventListener('scroll', onScroll, { passive: true });
    } else {
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      if (container) {
        container.removeEventListener('scroll', onScroll);
      } else {
        window.removeEventListener('scroll', onScroll);
      }
    };
  }, [containerRef, measure, reducedMotion, smoothMs]);

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      data-scroll-progress=""
      data-scroll-axis="none"
      className={cn('pointer-events-none opacity-0', className)}
      style={{ transform: 'scaleX(0)' }}
    />
  );
}

export default ScrollProgress;

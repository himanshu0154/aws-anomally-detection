'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Shows one panel at a time and animates the exchange: the incoming panel slides
 * and fades in, the outgoing one slides and fades out beneath it.
 *
 * Adapted for this project from the supplied component:
 *  - **no `motion/react`** (not a dependency here). The original animated
 *    `enter`/`center`/`exit` variants; here the entering panel runs a CSS
 *    keyframe (`panelEnter`) and the leaving one is kept mounted for the exit
 *    duration with `--panel-duration` driving both, so the timing still comes
 *    from one number and no animation frame is involved;
 *  - the panels overlap in a single grid cell, so the container keeps the taller
 *    panel's height for the length of the exchange instead of collapsing under
 *    the leaving content. The leaving panel is `aria-hidden` and
 *    `pointer-events-none`, and the component sets the `inert` attribute on it
 *    directly (`toggleAttribute`) rather than through JSX — React's typings for
 *    that attribute are newer than they look, and this keeps the panel
 *    unfocusable either way;
 *  - the blur in the original's variants is dropped: blurring and un-blurring a
 *    content panel is a per-frame paint for the whole exit duration;
 *  - **every child stays mounted** (React keeps their state), which is the
 *    original's behaviour, and only the active index is ever interactive;
 *  - `prefers-reduced-motion` skips the exit panel entirely and the keyframes
 *    are dropped in CSS, so the switch is a plain swap.
 *
 * Use it where the app swaps one block of content for another under a control —
 * the explanation queue's status views, an expanding card body. Do not use it on
 * a live reading: the panel that is not centred is deliberately hidden.
 */

export interface TransitionPanelProps {
  /** Index of the child to show. */
  activeIndex: number;
  children: React.ReactNode;
  /** Classes for the stacking container. */
  className?: string;
  /** Classes applied to each panel layer. */
  panelClassName?: string;
  /** Seconds for the exchange; `ease` is any CSS timing function. */
  transition?: { duration?: number; ease?: string };
}

interface PanelLayerProps {
  active: boolean;
  className?: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}

function PanelLayer({ active, className, style, children }: PanelLayerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Set as an attribute rather than a JSX prop: `inert` is a real DOM attribute
  // in every browser this app targets, and this keeps it out of the typings.
  useEffect(() => {
    ref.current?.toggleAttribute('inert', !active);
  }, [active]);

  return (
    <div
      ref={ref}
      data-state={active ? 'center' : 'exit'}
      aria-hidden={active ? undefined : true}
      className={cn(
        'col-start-1 row-start-1',
        active
          ? 'panel-enter'
          : 'pointer-events-none translate-y-2 opacity-0',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export function TransitionPanel({
  activeIndex,
  children,
  className,
  panelClassName,
  transition,
}: TransitionPanelProps) {
  const panels = React.Children.toArray(children);
  const reducedMotion = useReducedMotion();
  const [trackedIndex, setTrackedIndex] = useState(activeIndex);
  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);

  const duration = transition?.duration ?? 0.25;
  const ease = transition?.ease ?? 'ease-in-out';

  // Derived during render, not in an effect: the leaving panel has to be part of
  // the same commit as the entering one, or the container's height flickers for
  // one frame between the two.
  if (trackedIndex !== activeIndex) {
    setTrackedIndex(activeIndex);
    setLeavingIndex(reducedMotion ? null : trackedIndex);
  }

  useEffect(() => {
    if (leavingIndex === null) return;
    const timer = window.setTimeout(() => setLeavingIndex(null), duration * 1000);
    return () => window.clearTimeout(timer);
  }, [leavingIndex, duration]);

  const indices =
    leavingIndex === null || leavingIndex === activeIndex
      ? [activeIndex]
      : [activeIndex, leavingIndex];

  return (
    <div className={cn('grid', className)}>
      {indices.map((index) => {
        const panel = panels[index];
        if (panel === undefined) return null;
        return (
          <PanelLayer
            key={index}
            active={index === activeIndex}
            className={panelClassName}
            style={
              {
                '--panel-duration': `${duration}s`,
                '--panel-ease': ease,
                transitionDuration: `${duration}s`,
                transitionTimingFunction: ease,
              } as React.CSSProperties
            }
          >
            {panel}
          </PanelLayer>
        );
      })}
    </div>
  );
}

export default TransitionPanel;

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * One highlight surface that travels between the track's items as the pointer,
 * keyboard focus or selection moves.
 *
 * Adapted for this project from the supplied component:
 *  - **no `motion/react`** (not a dependency here). The original renders a
 *    `layoutId`-shared box *inside* the active child and lets framer-motion FLIP
 *    it between siblings, which is also how it ends up above that child's own
 *    background but under its content. Without a layout-animation library this
 *    keeps **one** highlight as a child of the track, measures the active item
 *    with `getBoundingClientRect` and writes `width`/`height`/`transform`
 *    straight to the node — so changing the active item is a style write, never
 *    a re-render of the items;
 *  - items are **not cloned**. Hover/focus/click are delegated from the track
 *    and resolved with `closest('[data-id]')`, so call sites keep ownership of
 *    their own markup and handlers;
 *  - because the highlight is a sibling of the items rather than a child, it
 *    cannot sit between an item's background and its content. `layer="behind"`
 *    (the default, faithful to the demo) paints it under the items, so items
 *    using it must be positioned — `relative`, so they paint above the
 *    highlight. Use `layer="above"` for items that paint their own opaque
 *    surface; the highlight then reads as a tinted wash or ring travelling over
 *    them (the card-grid case) and no item class is required;
 *  - the highlight is `pointer-events-none`, so an "above" highlight can never
 *    swallow the hover it is reacting to;
 *  - the box is re-measured on container resize (font load, drawer open, grid
 *    reflow) through a `ResizeObserver`, and synchronously on the active item
 *    changing. It never waits for an animation frame, so the highlight still
 *    appears in a document that is not composited;
 *  - `prefers-reduced-motion` drops the travel transition, so the highlight
 *    jumps between items. It is never hidden: it carries the hovered/active
 *    state, not decoration;
 *  - `className` is the highlight's own classes, exactly as in the demo — each
 *    call site picks the tint/ring. `containerClassName` lands on the track,
 *    because the layout classes (grid/flex gap) belong to the caller.
 *
 * Items opt in with `data-id`; the demo's `card-0`-style values are replaced
 * with the app's own keys (route hrefs, view names). The demo's `data-checked`
 * per-item marker is dropped — nothing in this app styles off it, and the
 * highlight's own classes carry the state.
 */

export interface AnimatedBackgroundTransition {
  /**
   * Seconds the highlight takes to travel between items.
   * @default 0.4
   */
  duration?: number;
  /**
   * Seconds to wait before travelling.
   * @default 0
   */
  delay?: number;
  /**
   * Any CSS timing function. The default overshoots slightly, which reads like
   * the spring the original used.
   * @default 'cubic-bezier(0.32, 0.72, 0, 1)'
   */
  ease?: string;
  /** Accepted for API compatibility with the framer-motion original. Ignored. */
  type?: string;
  /** Accepted for API compatibility with the framer-motion original. Ignored. */
  bounce?: number;
}

export interface AnimatedBackgroundProps {
  children: React.ReactNode;
  /** Classes for the travelling highlight (tint, radius, ring…). */
  className?: string;
  /** Layout classes for the track that holds the items (grid/flex gap…). */
  containerClassName?: string;
  /** Controlled active item. */
  value?: string | null;
  /** Item highlighted before any interaction (uncontrolled). */
  defaultValue?: string | null;
  /** Called when an item is clicked; only needed alongside `value`. */
  onValueChange?: (id: string | null) => void;
  transition?: AnimatedBackgroundTransition;
  /** Move the highlight to whatever the pointer is over. */
  enableHover?: boolean;
  /**
   * `behind` (default) paints the highlight under the items — items must be
   * `relative` so they paint above it. `above` paints it over them — use it for
   * items with opaque surfaces of their own.
   */
  layer?: 'behind' | 'above';
}

export function AnimatedBackground({
  children,
  className,
  containerClassName,
  value,
  defaultValue = null,
  onValueChange,
  transition,
  enableHover = false,
  layer = 'behind',
}: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(defaultValue);
  const reducedMotion = useReducedMotion();

  // A `value` prop (even `null`) means the caller owns the selection.
  const controlled = value !== undefined;
  const activeId = hoveredId ?? (controlled ? value : selectedId);

  const duration = transition?.duration ?? 0.4;
  const delay = transition?.delay ?? 0;
  const ease = transition?.ease ?? 'cubic-bezier(0.32, 0.72, 0, 1)';

  /** Nearest item id for an event target, ignoring anything outside the track. */
  const itemIdFrom = (node: EventTarget | null): string | null => {
    const container = containerRef.current;
    if (!container || !(node instanceof Element)) return null;
    const item = node.closest('[data-id]');
    if (!item || !container.contains(item)) return null;
    return item.getAttribute('data-id');
  };

  const handlePointerOver = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!enableHover) return;
    const id = itemIdFrom(event.target);
    if (id) setHoveredId(id);
  };

  /**
   * `over`/`out` rather than `enter`/`leave`: they bubble reliably and cover
   * moves between an item's own descendants. Only clear the highlight when the
   * pointer actually crosses into a different item (or out of the track), which
   * is what `relatedTarget` tells us.
   */
  const handlePointerOut = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!enableHover) return;
    const from = itemIdFrom(event.target);
    if (!from || from === itemIdFrom(event.relatedTarget)) return;
    setHoveredId((current) => (current === from ? null : current));
  };

  const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    const id = itemIdFrom(event.target);
    if (id) setHoveredId(id);
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const from = itemIdFrom(event.target);
    if (!from || from === itemIdFrom(event.relatedTarget)) return;
    setHoveredId((current) => (current === from ? null : current));
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const id = itemIdFrom(event.target);
    if (!id) return;
    if (!controlled) setSelectedId(id);
    onValueChange?.(id);
  };

  /**
   * Write the active item's box to the highlight. Synchronous on purpose: a
   * document that is not composited never fires `requestAnimationFrame`, so the
   * highlight must never depend on one to appear.
   */
  const positionHighlight = useCallback(() => {
    const container = containerRef.current;
    const highlight = highlightRef.current;
    if (!container || !highlight) return;

    const target = activeId
      ? Array.from(container.querySelectorAll<HTMLElement>('[data-id]')).find(
          (node) => node.getAttribute('data-id') === activeId
        )
      : undefined;

    if (!target) {
      highlight.style.opacity = '0';
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    highlight.style.transform = `translate(${rect.left - containerRect.left}px, ${
      rect.top - containerRect.top
    }px)`;
    highlight.style.opacity = '1';
  }, [activeId]);

  useEffect(() => {
    positionHighlight();
  }, [positionHighlight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(positionHighlight);
    observer.observe(container);
    window.addEventListener('resize', positionHighlight);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', positionHighlight);
    };
  }, [positionHighlight]);

  const highlight = (
    <div
      ref={highlightRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute left-0 top-0',
        layer === 'above' ? 'z-20' : 'z-0',
        className
      )}
      style={{
        opacity: 0,
        transition: reducedMotion
          ? 'none'
          : [
              `transform ${duration}s ${ease} ${delay}s`,
              `width ${duration}s ${ease} ${delay}s`,
              `height ${duration}s ${ease} ${delay}s`,
              'opacity 150ms ease',
            ].join(', '),
      }}
    />
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative', containerClassName)}
      onMouseOver={handlePointerOver}
      onMouseOut={handlePointerOut}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
    >
      {layer === 'behind' && highlight}
      {children}
      {layer === 'above' && highlight}
    </div>
  );
}

export default AnimatedBackground;

'use client';

import React, { useCallback, useContext, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * A horizontal rail of icons that grows the ones nearest the pointer.
 *
 * Adapted for this project from the supplied component:
 *  - **no `motion/react`** (not a dependency here). The original gave every item a
 *    `useTransform` on the pointer's x offset and let framer-motion spring each
 *    one's scale; here `Dock` measures every item once per pointer move, then
 *    writes `transform` straight to the nodes — a read pass, then a write pass, so
 *    nothing forces a layout mid-loop. The springiness is a CSS transition on the
 *    item, which costs no React render and keeps the growth smooth between
 *    pointer samples;
 *  - items are **not cloned**. `DockItem` registers its own node with the rail
 *    through context, so call sites keep ownership of their markup;
 *  - growth is measured from each item's **centre**, which a centred scale cannot
 *    move — so the magnification never feeds back into the next measurement, and
 *    only the item's own scale changes, so the rail never reflows while the
 *    pointer travels across it;
 *  - growth falls off smoothly from the pointer rather than linearly: the cosine
 *    window means neighbours rise together instead of snapping at a hard radius;
 *  - `prefers-reduced-motion` skips the tracking entirely and leaves every item at
 *    its resting size; a pointer-less device (touch) never magnifies either,
 *    because there is no hover to react to. There the rail also promotes its
 *    labels from tooltips into the items themselves — an icon row whose labels
 *    only appear on hover is unusable on touch;
 *  - the demo rendered plain `div`s. This renders `ul`/`li`, because a rail of
 *    destinations is a list — inside the footer's `nav` the result is the
 *    conventional `nav > ul > li > a`;
 *  - `DockLabel` is a tooltip, not a substitute for an accessible name: the item
 *    is labelled by its `label` prop as well, and the tooltip is `aria-hidden` so
 *    assistive tech is not told the same thing twice. It is unreachable by
 *    pointer events by design, so it can never sit between the pointer and the
 *    item it describes.
 *
 * The rail is an *overflow* affordance for a small, fixed set of destinations —
 * the app's five routes in the footer. It is not a second primary navigation, so
 * it must not be added anywhere the header or the drawer already covers.
 */

/** How much of its own size an item gains directly under the pointer. */
const MAX_GROWTH = 0.45;
/**
 * How far from the pointer an item stops reacting, in item half-widths. Sized so
 * that *neighbours* react: at 4.5 half-widths the item under the pointer is at
 * full growth, its immediate neighbour is around 0.8, the one after around 0.45,
 * and the fourth is settling. A smaller reach makes a rail where only the item
 * under the pointer moves, which reads as a hover effect rather than a dock — the
 * swelling arc across several items is the whole point.
 */
const REACH = 4.5;
/** How far the pointer's neighbours lift, in px. */
const LIFT = 5;

interface DockContextValue {
  register: (node: HTMLElement) => () => void;
  /**
   * True on a device that cannot hover, where a hover-only tooltip would hide the
   * only label the item has. The rail then shows its labels inline instead.
   */
  labelsInline: boolean;
}

const DockContext = React.createContext<DockContextValue | null>(null);

export interface DockProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Classes for the rail itself (padding, gap, background). */
  className?: string;
}

export function Dock({ children, className, ...rest }: DockProps) {
  const railRef = useRef<HTMLUListElement | null>(null);
  const itemsRef = useRef(new Set<HTMLElement>());
  const reducedMotion = useReducedMotion();
  // Inverted on purpose: `false` until proven otherwise, so a pointer device
  // never flashes its labels before the tooltip takes over.
  const labelsInline = useMediaQuery('(hover: none)');

  /** Returns the unregister for the node, so React can clean it up itself. */
  const register = useCallback((node: HTMLElement) => {
    itemsRef.current.add(node);
    return () => {
      itemsRef.current.delete(node);
    };
  }, []);

  const reset = useCallback(() => {
    itemsRef.current.forEach((item) => {
      item.style.transform = '';
    });
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      if (reducedMotion) return;

      const items = Array.from(itemsRef.current);
      if (items.length === 0) return;

      // Read pass: every box before any write, so scaling one item can never
      // invalidate the measurement of the next.
      const centres = items.map((item) => {
        const box = item.getBoundingClientRect();
        return { centre: box.left + box.width / 2, halfWidth: box.width / 2 };
      });

      // Write pass.
      items.forEach((item, index) => {
        const { centre, halfWidth } = centres[index];
        if (halfWidth <= 0) return;

        const reach = Math.abs(event.clientX - centre) / halfWidth / REACH;
        if (reach >= 1) {
          item.style.transform = '';
          return;
        }

        // Cosine window: 1 at the pointer, 0 at the edge of the reach, smooth
        // between — so two adjacent items share the growth instead of one
        // snapping in as the other snaps out.
        const proximity = (Math.cos(reach * Math.PI) + 1) / 2;
        item.style.transform = `translateY(${(-LIFT * proximity).toFixed(2)}px) scale(${(
          1 +
          MAX_GROWTH * proximity
        ).toFixed(3)})`;
      });
    },
    [reducedMotion]
  );

  return (
    <DockContext.Provider value={{ register, labelsInline }}>
      <ul
        {...rest}
        ref={railRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={reset}
        onPointerCancel={reset}
        className={cn('flex items-end', className)}
      >
        {children}
      </ul>
    </DockContext.Provider>
  );
}

export interface DockItemProps {
  children: React.ReactNode;
  className?: string;
  /** Destination. Renders a `next/link` — the reason the item magnifies. */
  href?: string;
  /** Action instead of a destination. */
  onClick?: () => void;
  /** Accessible name. The tooltip is deliberately not one. */
  label: string;
  /** Marks the current route. */
  current?: boolean;
}

/**
 * One rail entry: a `<Link>`, a `<button>`, and the tooltip on hover and keyboard
 * focus.
 */
export function DockItem({
  children,
  className,
  href,
  onClick,
  label,
  current = false,
}: DockItemProps) {
  const context = useContext(DockContext);

  const attach = useCallback(
    (node: HTMLElement | null) => {
      if (!node || !context) return;
      return context.register(node);
    },
    [context]
  );

  const itemClassName = cn(
    'group relative flex justify-center border border-border bg-card text-muted-foreground outline-none transition-[transform,color,border-color] duration-150 ease-out hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
    // Without hover the label is part of the item, so the item stacks; with hover
    // the label floats and the item stays a single centred glyph.
    context?.labelsInline ? 'flex-col items-center gap-1 px-3 py-2' : 'items-center',
    current && 'border-primary/50 text-primary',
    className
  );

  // The label renders after the icon: in tooltip mode it is absolute and its
  // position in the DOM is irrelevant, and in inline mode this is what puts it
  // underneath rather than above.
  const content = (
    <>
      {children}
      <DockLabel>{label}</DockLabel>
    </>
  );

  return (
    <li className="flex items-end">
      {href ? (
        <Link
          ref={attach as React.Ref<HTMLAnchorElement>}
          href={href}
          aria-label={label}
          aria-current={current ? 'page' : undefined}
          className={itemClassName}
        >
          {content}
        </Link>
      ) : (
        <button
          ref={attach as React.Ref<HTMLButtonElement>}
          type="button"
          onClick={onClick}
          aria-label={label}
          className={itemClassName}
        >
          {content}
        </button>
      )}
    </li>
  );
}

/**
 * An item's label: a tooltip above it while the rail is on a pointer device, and
 * plain text underneath it on a device that cannot hover.
 *
 * That fallback is not a nicety. An icon rail whose only labels need a hover is
 * unusable on touch — the icons for "Dashboard" and "Anomaly History" are not
 * self-evident — so the rail detects `(hover: none)` and promotes the labels into
 * the item itself.
 *
 * `aria-hidden` either way: the item already carries the same string as its
 * accessible name (`aria-label`), and announcing it twice would be a stutter.
 */
export function DockLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(DockContext);
  const labelsInline = context?.labelsInline ?? false;

  return (
    <span
      aria-hidden="true"
      className={cn(
        labelsInline
          ? 'pointer-events-none relative text-center text-label-sm font-medium text-muted-foreground'
          : 'pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card/95 px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100',
        className
      )}
    >
      {children}
    </span>
  );
}

export default Dock;

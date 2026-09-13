'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Reveals a group's direct children, in sequence, the first time the group
 * scrolls into view.
 *
 * Adapted for this project from the supplied component:
 *  - **no `motion/react`** (not a dependency here). The original propagated
 *    `hidden`/`visible` variants to `motion.div` children with
 *    `staggerChildren`; here the observer only flips a `data-in-view` attribute
 *    on the group and `styles/tailwind.css` owns the fade/rise and the stagger
 *    (`nth-child` sets each child's `--reveal-index`). Children are never cloned
 *    and nothing in the group re-renders per frame;
 *  - **it fails open.** Arming — hiding the children — only happens after mount,
 *    and only for a group whose top edge is still below the fold. Content that
 *    is on screen at load is therefore never hidden, and a document that never
 *    delivers an intersection callback (a non-composited webview, an environment
 *    without `IntersectionObserver`) renders everything visible instead of a
 *    page of blank cards;
 *  - reduced motion never arms and never animates; `tailwind.css` neutralises the
 *    reveal under the media query as well, so the preference is honoured even
 *    when it lands mid-transition;
 *  - the blur in the original's variants is dropped: re-blurring a card of text
 *    costs a paint per frame for an effect that reads as smudge rather than
 *    quality;
 *  - `useRevealGroup` exists so a page can reveal an element it already renders
 *    (`ref` + `data-in-view` + the `reveal-group` class on that element) instead
 *    of gaining a wrapper node. `InView` is the same thing for call sites that
 *    are inside a loop and cannot call a hook, or that are server components.
 *    The group attaches through a **callback ref**, so a group whose element only
 *    mounts after its data lands is still observed; an object ref read in a
 *    mount-time effect would leave it permanently unobserved (visible, but never
 *    animated).
 *
 * Use it on sections that start below the fold (a page's lower content, the step
 * list on /how-model-works, the event cards on /explanations). Never wrap live
 * readings or anything that must be readable the instant the page paints.
 */

/** The value for a group's `data-in-view` attribute. */
export type RevealState = 'idle' | 'hidden' | 'visible';

export interface InViewOptions {
  /**
   * Stop observing once revealed, so a group does not re-hide when scrolled
   * back past it.
   * @default true
   */
  once?: boolean;
  /**
   * `rootMargin` for the observer. The negative bottom value is what makes the
   * reveal land as the group's top edge clears the fold rather than the moment
   * one pixel appears.
   * @default '0px 0px -12% 0px'
   */
  margin?: string;
  /**
   * `threshold` for the observer.
   * @default 0
   */
  threshold?: number;
  /**
   * Seconds between each child starting its reveal, applied to the first twelve
   * children.
   * @default 0.09
   */
  stagger?: number;
}

export interface RevealGroup<T extends HTMLElement = HTMLDivElement> {
  /**
   * Attach to the element that carries the `reveal-group` class. It is a callback
   * ref on purpose: a group that mounts later than its component — the
   * dashboard's blocks only exist once the first reading has loaded — has to be
   * observed when its node arrives, and an object ref read inside a mount-time
   * effect would miss it.
   */
  ref: React.RefCallback<T>;
  /** Spread onto the same element. */
  revealProps: { 'data-in-view': RevealState };
  /** Merge into the element's own `style`, if it has one. */
  revealStyle: React.CSSProperties;
}

/**
 * The reveal behaviour for an element the caller already has. The element must
 * also carry the `reveal-group` class (it is the selector `tailwind.css` styles).
 */
export function useRevealGroup<T extends HTMLElement = HTMLDivElement>(
  options: InViewOptions = {}
): RevealGroup<T> {
  const { once = true, margin = '0px 0px -12% 0px', threshold = 0, stagger = 0.09 } = options;

  const [node, setNode] = useState<T | null>(null);
  const ref = useCallback((element: T | null) => setNode(element), []);
  const reducedMotion = useReducedMotion();
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!node) return;

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      // Whatever a previous render hid must be shown again.
      setArmed(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin: margin, threshold }
    );

    observer.observe(node);

    // Only a group still entirely below the fold may be hidden: nothing the
    // reader can already see is allowed to depend on the observer to appear.
    const rect = node.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    setArmed(rect.top >= viewport);

    return () => observer.disconnect();
  }, [node, once, margin, threshold, reducedMotion]);

  return {
    ref,
    revealProps: { 'data-in-view': inView ? 'visible' : armed ? 'hidden' : 'idle' },
    revealStyle: { '--reveal-stagger': `${stagger}s` } as React.CSSProperties,
  };
}

export interface InViewProps extends InViewOptions {
  children: React.ReactNode;
  /** Classes for the group wrapper; `reveal-group` is added for you. */
  className?: string;
}

/** Wrapper form, for loops and server components. */
export function InView({ children, className, ...options }: InViewProps) {
  const { ref, revealProps, revealStyle } = useRevealGroup<HTMLDivElement>(options);

  return (
    <div
      ref={ref}
      {...revealProps}
      className={cn('reveal-group', className)}
      style={revealStyle}
    >
      {children}
    </div>
  );
}

export default InView;

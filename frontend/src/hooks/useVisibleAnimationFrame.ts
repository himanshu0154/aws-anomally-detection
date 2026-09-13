'use client';

import { useEffect, useRef } from 'react';

/**
 * The app's animation-frame policy for canvas layers, shared by the ambient cloud
 * backdrop and the inline canvas text so every animated canvas behaves the same
 * wherever it appears:
 *
 *  - the callback runs once **synchronously** on mount, then on animation frames.
 *    A document that is not being composited (background tab, prerender, a
 *    non-composited preview webview) never fires rAF at all, so a canvas that
 *    waits for one renders blank — the first paint cannot depend on the loop;
 *  - the loop stops while the document is hidden, so a decorative layer never
 *    holds the main thread for a tab nobody is looking at;
 *  - the newest callback is always the one invoked, so callers close over fresh
 *    props without restarting the loop or re-creating a GL context.
 *
 * Callers own *what* to do with each timestamp: reduced-motion and "did anything
 * change" checks belong with the drawing code, which is the only place that knows
 * whether its frame differs from the last one.
 */
export function useVisibleAnimationFrame(draw: (now: number) => void): void {
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    let frame = 0;

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      drawRef.current(now);
    };

    const start = () => {
      if (frame === 0) frame = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
    };

    const onVisibility = () => (document.visibilityState === 'hidden' ? stop() : start());

    drawRef.current(performance.now());
    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}

export default useVisibleAnimationFrame;

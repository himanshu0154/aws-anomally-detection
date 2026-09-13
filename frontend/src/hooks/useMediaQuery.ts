'use client';

import { useEffect, useState } from 'react';

/**
 * Subscribes to a CSS media query. Used to size chrome that cannot be resized
 * with CSS alone — the split-flap board's column count is a React prop, and the
 * cloud background's density is a WebGL uniform.
 *
 * Starts `false` so server and first client render agree; the subscription
 * corrects it on mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);
    sync();
    list.addEventListener('change', sync);
    return () => list.removeEventListener('change', sync);
  }, [query]);

  return matches;
}

export default useMediaQuery;

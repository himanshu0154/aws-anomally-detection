'use client';

import { useEffect, useState } from 'react';

/**
 * `prefers-reduced-motion: reduce`, kept in sync with the user's OS setting.
 *
 * One owner for every ambient animation in the app (cloud background, split-flap
 * board, wordmark): each component needs the same answer, and each one used to
 * carry its own `matchMedia` effect.
 *
 * Starts `false` so server and first client render agree; the subscription
 * corrects it on mount.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return reduced;
}

export default useReducedMotion;

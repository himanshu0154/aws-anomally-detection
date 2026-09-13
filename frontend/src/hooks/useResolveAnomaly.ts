'use client';

/**
 * Wraps anomaly resolution with operator feedback. Used by the explanation page and
 * the history page so both report success and failure identically.
 *
 * The checkbox is never optimistically checked: the provider only applies the
 * Resolved state after the backend confirms it, so a failed call leaves the event
 * Active instead of showing a resolution that was not stored.
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useLiveDashboardData } from '@/hooks/useLiveDashboardData';
import type { AnomalyEvent } from '@/types/skyguard';

export function useResolveAnomaly() {
  const { resolveEvent, resolvingIds } = useLiveDashboardData();

  const resolve = useCallback(
    async (event: AnomalyEvent) => {
      try {
        await resolveEvent(event.id);
        toast.success(`Anomaly ${event.id} marked as Resolved`);
        return true;
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to resolve anomaly — ${detail}. It remains Active.`);
        return false;
      }
    },
    [resolveEvent]
  );

  return {
    resolve,
    resolveAll: async (events: AnomalyEvent[]) => {
      for (const event of events) {
        await resolve(event);
      }
    },
    isResolving: (eventId: string) => resolvingIds.includes(eventId),
    resolvingCount: resolvingIds.length,
  };
}

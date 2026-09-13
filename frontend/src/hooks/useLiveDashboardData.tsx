'use client';

/**
 * Single owner of dashboard state.
 *
 * `DashboardDataProvider` mounts once in the app shell and is the only place the
 * app polls the backend (live + series + history in one 4s cycle). Every page reads
 * the same state through `useLiveDashboardData()`, so navigating between pages never
 * multiplies timers and never produces a second, disagreeing copy of an event.
 *
 * Resolution safety: the backend owns anomaly lifecycle. A local override is applied
 * only after `POST /api/history/{id}/resolve` succeeds, and it is kept until a poll
 * confirms the stored record really says `Resolved` — so a poll in flight at the
 * moment of resolution can never flip a checkbox back to Active.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getHistory, getLive, getSeries, resolveAnomalyEvent } from '@/lib/api';
import { countUnresolved } from '@/lib/anomaly';
import type { AnomalyEvent, DashboardData, LiveReading, SeriesPoint } from '@/types/skyguard';

export const POLL_INTERVAL_MS = 4000;
export const SERIES_LIMIT = 40;
export const HISTORY_LIMIT = 200;

const EMPTY_LIVE: LiveReading = {
  station_id: '',
  timestamp: '',
  temperature: null,
  humidity: null,
  pressure: null,
  overall_status: 'healthy',
  anomaly_status: 'normal',
  anomaly_score: null,
  severity: 'none',
  anomaly_type: 'normal',
  affected_sensor: 'none',
  explanation: 'Connecting to station…',
  corrected_value: { temperature: null, humidity: null, pressure: null },
  root_cause_probabilities: {
    spike: 20,
    frozen: 20,
    drift: 20,
    communication_error: 20,
    multivariate_inconsistency: 20,
  },
  sensor_health: {},
  recommendations: [],
  model_meta: {
    readings_in_buffer: 0,
    fully_warmed_up: false,
    inference_latency_ms: null,
    algorithm: 'Isolation Forest + per-sensor residual regressors + rule-based thresholds',
  },
  raw_reading: { T2M: null, RH2M: null, PS: null },
  gemini_classification: null,
};

const DashboardDataContext = createContext<DashboardData | null>(null);

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<LiveReading>(EMPTY_LIVE);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [history, setHistory] = useState<AnomalyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingIds, setResolvingIds] = useState<string[]>([]);

  /** Resolved records awaiting backend confirmation, keyed by event id. */
  const confirmedResolutions = useRef(new Map<string, AnomalyEvent>());
  const loadRef = useRef<() => void>(() => {});

  const applyResolutions = useCallback((fetched: AnomalyEvent[]) => {
    return fetched.map((event) => {
      const override = confirmedResolutions.current.get(event.id);
      if (!override) return event;
      if (event.status === 'Resolved') {
        confirmedResolutions.current.delete(event.id);
        return event;
      }
      return {
        ...event,
        status: override.status,
        resolved: true,
        resolved_at: override.resolved_at,
      };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [liveResult, seriesResult, historyResult] = await Promise.allSettled([
        getLive(),
        getSeries(SERIES_LIMIT),
        getHistory(HISTORY_LIMIT),
      ]);
      if (cancelled) return;

      if (liveResult.status === 'fulfilled') {
        setLive(liveResult.value);
        setError(null);
      } else {
        setError(
          liveResult.reason instanceof Error
            ? liveResult.reason.message
            : 'Unable to connect to SkyGuard AI backend'
        );
      }

      if (seriesResult.status === 'fulfilled') setSeries(seriesResult.value);
      if (historyResult.status === 'fulfilled') setHistory(applyResolutions(historyResult.value));

      setLoading(false);
    };

    loadRef.current = () => void load();
    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [applyResolutions]);

  const resolveEvent = useCallback(async (eventId: string) => {
    setResolvingIds((ids) => (ids.includes(eventId) ? ids : [...ids, eventId]));
    try {
      const resolved = await resolveAnomalyEvent(eventId);
      confirmedResolutions.current.set(eventId, resolved);
      setHistory((events) =>
        events.map((event) =>
          event.id === eventId
            ? {
                ...event,
                status: resolved.status,
                resolved: true,
                resolved_at: resolved.resolved_at,
              }
            : event
        )
      );
    } finally {
      setResolvingIds((ids) => ids.filter((id) => id !== eventId));
    }
  }, []);

  const refresh = useCallback(() => loadRef.current(), []);

  const value = useMemo<DashboardData>(
    () => ({
      live,
      series,
      history,
      unresolvedCount: countUnresolved(history),
      loading,
      error,
      resolvingIds,
      refresh,
      resolveEvent,
    }),
    [live, series, history, loading, error, resolvingIds, refresh, resolveEvent]
  );

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useLiveDashboardData(): DashboardData {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error('useLiveDashboardData must be used inside <DashboardDataProvider>');
  }
  return context;
}

export default useLiveDashboardData;

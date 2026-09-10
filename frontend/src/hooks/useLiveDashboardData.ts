'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SensorHealth {
  status: 'healthy' | 'warning' | 'critical';
  detail: string;
  label: string;
}

export interface CorrectedValue {
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
}

export interface RootCauseProbabilities {
  spike: number;
  frozen: number;
  drift: number;
  communication_error: number;
  multivariate_inconsistency: number;
}

export interface Recommendation {
  priority: number;
  action: string;
  urgency: string;
}

export interface ModelMeta {
  readings_in_buffer: number;
  fully_warmed_up: boolean;
  algorithm: string;
}

export interface LiveReading {
  station_id: string;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  overall_status: 'critical' | 'warning' | 'healthy';
  anomaly_status: 'anomaly' | 'normal';
  anomaly_score: number | null;
  severity: 'high' | 'medium' | 'none';
  anomaly_type: string;
  affected_sensor: string;
  explanation: string;
  corrected_value: CorrectedValue;
  root_cause_probabilities: RootCauseProbabilities;
  sensor_health: Record<string, SensorHealth>;
  recommendations: Recommendation[];
  model_meta: ModelMeta;
  raw_reading?: { T2M: number | null; RH2M: number | null; PS: number | null };
}

export interface SeriesPoint {
  time: string;
  temp: number | null;
  humidity: number | null;
  pressureScaled: number | null;
  anomaly: boolean;
}

export interface HistoryEvent {
  id: string;
  time: string;
  date: string;
  sensor: string;
  reading: string;
  type: string;
  raw_type: string;
  severity: string;
  status: string;
  explanation: string;
  recommendations: Recommendation[];
  anomaly_score: number | null;
  corrected_value: CorrectedValue;
}

export interface DashboardData {
  live: LiveReading;
  series: SeriesPoint[];
  history: HistoryEvent[];
  loading: boolean;
  error: string | null;
}

// ─── Default empty data ──────────────────────────────────────────────────────

const EMPTY_LIVE: LiveReading = {
  station_id: 'AWS-MH-042',
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
  explanation: 'Connecting to station...',
  corrected_value: { temperature: null, humidity: null, pressure: null },
  root_cause_probabilities: { spike: 20, frozen: 20, drift: 20, communication_error: 20, multivariate_inconsistency: 20 },
  sensor_health: {},
  recommendations: [],
  model_meta: { readings_in_buffer: 0, fully_warmed_up: false, algorithm: 'Isolation Forest + per-sensor residual regressors + rule-based thresholds' },
  raw_reading: { T2M: null, RH2M: null, PS: null },
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useLiveDashboardData(): DashboardData {
  const [live, setLive] = useState<LiveReading>(EMPTY_LIVE);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const liveCountRef = useRef(0);

  const fetchLiveData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/live`);
      if (!res.ok) throw new Error(`Live: ${res.status}`);
      const data: LiveReading = await res.json();
      setLive(data);
      liveCountRef.current++;
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSeries = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/series?limit=40`);
      if (!res.ok) throw new Error(`Series: ${res.status}`);
      const data: SeriesPoint[] = await res.json();
      setSeries(data);
    } catch {
      // Silently ignore — series will keep its last value
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history?limit=50`);
      if (!res.ok) throw new Error(`History: ${res.status}`);
      const data: HistoryEvent[] = await res.json();
      setHistory(data);
    } catch {
      // Silently ignore
    }
  }, []);

  // Poll live + series + history together every 4 seconds
  useEffect(() => {
    fetchLiveData();
    fetchSeries();
    fetchHistory();
    const interval = setInterval(() => {
      fetchLiveData();
      fetchSeries();
      fetchHistory();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchLiveData, fetchSeries, fetchHistory]);

  return { live, series, history, loading, error };
}

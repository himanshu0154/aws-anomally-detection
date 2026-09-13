/**
 * SkyGuard AI — shared API contract.
 *
 * These types mirror the FastAPI canonical schema in `api/main.py` exactly.
 * They are the single description of the data the frontend renders, so a change
 * on the backend surface is visible in one place.
 */

export type AnomalyStatus = 'normal' | 'anomaly';
export type Severity = 'high' | 'medium' | 'low' | 'none';

/** Lifecycle of a stored event. An anomaly is resolved by an operator, never by polling. */
export type LifecycleStatus = 'Normal' | 'Active' | 'Resolved';

export type SensorKey = 'temperature' | 'humidity' | 'pressure';

export interface RawReading {
  T2M: number | null;
  RH2M: number | null;
  PS: number | null;
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

export interface SensorHealth {
  status: 'healthy' | 'warning' | 'critical';
  detail: string;
  label: string;
}

export interface Recommendation {
  priority: number;
  action: string;
  urgency: string;
}

export interface GeminiClassification {
  status?: string;
  category?: string;
  classification?: string;
  confidence?: number;
  severity?: string;
  explanation?: string;
  possible_cause?: string;
  recommended_action?: string;
}

export interface ModelMeta {
  readings_in_buffer: number;
  fully_warmed_up: boolean;
  inference_latency_ms: number | null;
  algorithm: string;
}

/** The daemon's current view of the station — detection state, not event lifecycle. */
export interface LiveReading {
  station_id: string;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  overall_status: 'critical' | 'warning' | 'healthy';
  anomaly_status: AnomalyStatus;
  anomaly_score: number | null;
  severity: Severity;
  anomaly_type: string;
  affected_sensor: string;
  explanation: string;
  corrected_value: CorrectedValue;
  root_cause_probabilities: RootCauseProbabilities;
  sensor_health: Record<string, SensorHealth>;
  recommendations: Recommendation[];
  model_meta: ModelMeta;
  raw_reading?: RawReading;
  gemini_classification?: GeminiClassification | null;
}

/** One chart point. `pressure` is the real hPa reading, `pressureScaled` the legacy ÷10 view. */
export interface SeriesPoint {
  time: string;
  temp: number | null;
  humidity: number | null;
  pressure: number | null;
  pressureScaled: number | null;
  anomaly: boolean;
}

/**
 * A persistent anomaly event (or plain sensor reading) stored by the backend.
 *
 * `status` is the lifecycle (`Normal` | `Active` | `Resolved`); `timestamp`, `reading`,
 * `explanation`, `recommendations` and root causes are frozen at detection time and are
 * never re-derived from the current live reading.
 */
export interface AnomalyEvent {
  id: string;
  station_id: string;
  timestamp: string;
  date: string;
  day: string;
  time: string;
  sensor: string;
  reading: string;
  type: string;
  raw_type: string;
  severity: string;
  status: LifecycleStatus;
  explanation: string;
  recommendations: Recommendation[];
  anomaly_score: number | null;
  corrected_value: CorrectedValue;
  root_cause_probabilities: RootCauseProbabilities | null;
  current_raw_reading: RawReading;
  gemini_classification: GeminiClassification | null;
  resolved: boolean;
  resolved_at: string | null;
}

export interface DashboardData {
  live: LiveReading;
  series: SeriesPoint[];
  history: AnomalyEvent[];
  /** Anomaly events stored by the backend that no operator has resolved yet. */
  unresolvedCount: number;
  loading: boolean;
  error: string | null;
  /** Ids currently being resolved, so the UI can disable their controls. */
  resolvingIds: string[];
  refresh: () => void;
  /** Persists the resolution on the backend; throws if the backend rejected it. */
  resolveEvent: (eventId: string) => Promise<void>;
}

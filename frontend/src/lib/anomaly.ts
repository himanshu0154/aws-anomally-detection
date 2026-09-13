/**
 * Anomaly domain logic — labels, lifecycle helpers and history filtering.
 *
 * Kept free of React and JSX so the same rules drive the dashboard, the
 * explanation list and the history page (one definition per behaviour).
 */

import type {
  AnomalyEvent,
  CorrectedValue,
  LifecycleStatus,
  RootCauseProbabilities,
  SensorKey,
} from '@/types/skyguard';

// ─── Labels & classification ─────────────────────────────────────────────────

export const ANOMALY_TYPE_LABELS: Record<string, string> = {
  temperature_spike: 'Sudden Spike',
  temperature_frozen: 'Frozen Sensor',
  multivariate_inconsistency: 'Multivariate Inconsistency',
  ml_anomaly: 'ML Anomaly',
  communication_error: 'Communication Error',
  normal: 'Normal',
};

export function anomalyTypeLabel(rawType: string): string {
  return ANOMALY_TYPE_LABELS[rawType] ?? rawType;
}

/** Human-readable anomaly types offered by the history filter. */
export const ANOMALY_TYPE_OPTIONS = [
  'Sudden Spike',
  'Frozen Sensor',
  'Sensor Drift',
  'Communication Error',
  'Multivariate Inconsistency',
  'ML Anomaly',
  'Normal',
] as const;

export const SENSOR_OPTIONS: { value: SensorKey | 'none'; label: string }[] = [
  { value: 'temperature', label: 'Temperature' },
  { value: 'humidity', label: 'Humidity' },
  { value: 'pressure', label: 'Pressure' },
  { value: 'none', label: 'None / Normal' },
];

export const SEVERITY_OPTIONS = ['High', 'Medium', 'Low', 'None'] as const;
export const STATUS_OPTIONS: LifecycleStatus[] = ['Active', 'Resolved', 'Normal'];
export const DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export enum TimeBucket {
  Night = '00:00–06:00',
  Morning = '06:00–12:00',
  Afternoon = '12:00–18:00',
  Evening = '18:00–24:00',
}

export const TIME_BUCKET_OPTIONS = [
  TimeBucket.Night,
  TimeBucket.Morning,
  TimeBucket.Afternoon,
  TimeBucket.Evening,
];

export const SENSOR_LABELS: Record<string, string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  pressure: 'Pressure',
  none: 'None',
};

export const SENSOR_UNITS: Record<SensorKey, string> = {
  temperature: '°C',
  humidity: '%',
  pressure: 'hPa',
};

const SENSOR_COLORS: Record<SensorKey, string> = {
  temperature: 'text-danger',
  humidity: 'text-primary',
  pressure: 'text-accent',
};

export const sensorLabel = (sensor: string) => SENSOR_LABELS[sensor] ?? sensor;
export const sensorColor = (sensor: string) =>
  SENSOR_COLORS[sensor as SensorKey] ?? 'text-muted-foreground';

/** Tailwind status utilities, shared by badges across every page. */
export const STATUS_CLASS: Record<LifecycleStatus, string> = {
  Active: 'status-critical',
  Resolved: 'status-healthy',
  Normal: 'status-normal',
};

export const SEVERITY_CLASS: Record<string, string> = {
  High: 'status-critical',
  Medium: 'status-warning',
  Low: 'status-normal',
  None: 'status-normal',
};

/** Title-cases the backend's lowercase severity ('high' -> 'High'). */
export function severityLabel(severity: string): string {
  if (!severity) return 'None';
  return severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
}

// ─── Event helpers ───────────────────────────────────────────────────────────

/** A stored event is an anomaly (not a normal reading) when it left the Normal lifecycle. */
export const isAnomalyEvent = (event: AnomalyEvent) =>
  event.raw_type !== 'normal' && event.status !== 'Normal';

export const isUnresolved = (event: AnomalyEvent) =>
  isAnomalyEvent(event) && event.status === 'Active';

export const countUnresolved = (history: AnomalyEvent[]) => history.filter(isUnresolved).length;

export const countByStatus = (history: AnomalyEvent[]) => ({
  Active: history.filter((e) => e.status === 'Active').length,
  Resolved: history.filter((e) => e.status === 'Resolved').length,
  Normal: history.filter((e) => e.status === 'Normal').length,
});

/** Newest unresolved anomaly — what the dashboard alert should surface. */
export const latestUnresolved = (history: AnomalyEvent[]) => history.find(isUnresolved);

/** Unresolved events first, then newest-first within each group. */
export function sortForExplanations(history: AnomalyEvent[]): AnomalyEvent[] {
  return history
    .filter(isAnomalyEvent)
    .slice()
    .sort((a, b) => {
      if (isUnresolved(a) !== isUnresolved(b)) return isUnresolved(a) ? -1 : 1;
      return b.timestamp.localeCompare(a.timestamp);
    });
}

/**
 * The corrected value that belongs to this event's affected sensor, if the model
 * produced one. Historical events always use their own stored value.
 */
export function correctedValueFor(event: AnomalyEvent): { value: number; unit: string } | null {
  const sensor = (Object.keys(SENSOR_UNITS) as SensorKey[]).find((key) =>
    event.sensor.includes(key)
  );
  const candidates: SensorKey[] = sensor ? [sensor] : ['temperature', 'humidity', 'pressure'];
  for (const key of candidates) {
    const value = (event.corrected_value as CorrectedValue | null)?.[key];
    if (value != null) return { value, unit: SENSOR_UNITS[key] };
  }
  return null;
}

export function observedRawValue(event: AnomalyEvent): { value: number; unit: string } | null {
  const sensor = (Object.keys(SENSOR_UNITS) as SensorKey[]).find((key) =>
    event.sensor.includes(key)
  );
  if (!sensor) return null;
  const key = { temperature: 'T2M', humidity: 'RH2M', pressure: 'PS' } as const;
  const value = event.current_raw_reading?.[key[sensor]];
  return value == null ? null : { value, unit: SENSOR_UNITS[sensor] };
}

export function rootCauseValue(
  probabilities: RootCauseProbabilities | null | undefined,
  key: keyof RootCauseProbabilities
): number {
  return probabilities?.[key] ?? 0;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatClock(iso: string, fallback = '--:--:-- UTC'): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  })} UTC`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 19)} UTC`;
}

export function readingValue(value: number | null | undefined, unit: string, digits = 1): string {
  return value == null || Number.isNaN(value) ? '—' : `${value.toFixed(digits)} ${unit}`;
}

// ─── History filtering ───────────────────────────────────────────────────────

export interface HistoryFilters {
  search: string;
  day: string;
  date: string;
  timeBucket: string;
  sensor: string;
  anomalyType: string;
  severity: string;
  status: string;
}

export const EMPTY_FILTERS: HistoryFilters = {
  search: '',
  day: '',
  date: '',
  timeBucket: '',
  sensor: '',
  anomalyType: '',
  severity: '',
  status: '',
};

export const countActiveFilters = (filters: HistoryFilters) =>
  Object.values(filters).filter((value) => value !== '').length;

export function timeBucketOf(event: AnomalyEvent): TimeBucket | null {
  const hour = Number.parseInt(event.time?.slice(0, 2) ?? '', 10);
  if (Number.isNaN(hour)) return null;
  if (hour < 6) return TimeBucket.Night;
  if (hour < 12) return TimeBucket.Morning;
  if (hour < 18) return TimeBucket.Afternoon;
  return TimeBucket.Evening;
}

function searchHaystack(event: AnomalyEvent): string {
  return [
    event.id,
    event.date,
    event.day,
    event.time,
    event.sensor,
    sensorLabel(event.sensor),
    event.type,
    event.raw_type,
    event.reading,
    event.severity,
    event.status,
    event.explanation,
    ...(event.recommendations ?? []).map((rec) => `${rec.action} ${rec.urgency}`),
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * Client-side filtering for the loaded session window. The predicate per field is
 * independent, which keeps it cheap to push to the server later if history grows.
 */
export function filterHistory(history: AnomalyEvent[], filters: HistoryFilters): AnomalyEvent[] {
  const search = filters.search.trim().toLowerCase();
  const terms = search ? search.split(/\s+/) : [];

  return history.filter((event) => {
    if (filters.status && event.status !== filters.status) return false;
    if (filters.severity && severityLabel(event.severity) !== filters.severity) return false;
    if (filters.sensor && !event.sensor.includes(filters.sensor)) return false;
    if (filters.anomalyType && event.type !== filters.anomalyType) return false;
    if (filters.day && event.day !== filters.day) return false;
    if (filters.date && event.date !== filters.date) return false;
    if (filters.timeBucket && timeBucketOf(event) !== filters.timeBucket) return false;

    if (terms.length > 0) {
      const haystack = searchHaystack(event);
      if (!terms.every((term) => haystack.includes(term))) return false;
    }

    return true;
  });
}

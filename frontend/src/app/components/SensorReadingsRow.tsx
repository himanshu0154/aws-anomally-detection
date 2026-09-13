import React from 'react';
import {
  AlertCircle,
  CheckCircle,
  Droplets,
  Gauge,
  Minus,
  Thermometer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { SensorHealth, SeriesPoint } from '@/types/skyguard';
import { formatClock } from '@/lib/anomaly';

interface SensorReadingsRowProps {
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  sensorHealth: Record<string, SensorHealth>;
  timestamp: string;
  series: SeriesPoint[];
}

type TrendKey = 'temp' | 'humidity' | 'pressure';

function computeTrend(
  series: SeriesPoint[],
  key: TrendKey,
  unit: string
): { trend: 'up' | 'down' | 'stable'; label: string } {
  if (series.length < 2) return { trend: 'stable', label: `±0.0 ${unit}` };
  const current = series[series.length - 1]?.[key];
  const previous = series[series.length - 2]?.[key];
  if (current == null || previous == null) return { trend: 'stable', label: `±0.0 ${unit}` };

  const diff = current - previous;
  const magnitude = Math.abs(diff);
  if (magnitude < 0.05) return { trend: 'stable', label: `±${magnitude.toFixed(1)} ${unit}` };
  return diff > 0
    ? { trend: 'up', label: `+${magnitude.toFixed(1)} ${unit}` }
    : { trend: 'down', label: `−${magnitude.toFixed(1)} ${unit}` };
}

/** Range actually observed in the loaded window — real values, not a hardcoded claim. */
function observedRange(series: SeriesPoint[], key: TrendKey, unit: string): string {
  const values = series
    .map((point) => point[key])
    .filter((value): value is number => value != null);
  if (values.length < 2) return '—';
  return `${Math.min(...values).toFixed(1)} – ${Math.max(...values).toFixed(1)} ${unit}`;
}

interface SensorDef {
  id: string;
  label: string;
  icon: React.ElementType;
  value: number | null;
  unit: string;
  cardClass: string;
  valueColor: string;
  iconColor: string;
  observed: string;
  trend: 'up' | 'down' | 'stable';
  trendLabel: string;
  health: 'anomaly' | 'healthy' | 'warning';
  healthLabel: string;
  testId: string;
}

export default function SensorReadingsRow({
  temperature,
  humidity,
  pressure,
  sensorHealth,
  timestamp,
  series,
}: SensorReadingsRowProps) {
  const tempHealth = sensorHealth?.temperature;
  const humidHealth = sensorHealth?.humidity;
  const pressHealth = sensorHealth?.pressure;

  const healthOf = (health?: SensorHealth): SensorDef['health'] =>
    health?.status === 'critical'
      ? 'anomaly'
      : health?.status === 'warning'
        ? 'warning'
        : 'healthy';

  const tempTrend = computeTrend(series, 'temp', '°C');
  const humidTrend = computeTrend(series, 'humidity', '%');
  const pressTrend = computeTrend(series, 'pressure', 'hPa');

  const sensors: SensorDef[] = [
    {
      id: 'sensor-temp',
      label: 'Temperature',
      icon: Thermometer,
      value: temperature,
      unit: '°C',
      trend: tempTrend.trend,
      trendLabel: tempTrend.label,
      observed: observedRange(series, 'temp', '°C'),
      health: healthOf(tempHealth),
      healthLabel: tempHealth?.detail || 'Healthy',
      cardClass: '',
      valueColor: 'text-danger',
      iconColor: 'text-danger',
      testId: 'temperature',
    },
    {
      id: 'sensor-humidity',
      label: 'Relative Humidity',
      icon: Droplets,
      value: humidity,
      unit: '%',
      trend: humidTrend.trend,
      trendLabel: humidTrend.label,
      observed: observedRange(series, 'humidity', '%'),
      health: healthOf(humidHealth),
      healthLabel: humidHealth?.detail || 'Healthy',
      cardClass: '',
      valueColor: 'text-primary',
      iconColor: 'text-primary',
      testId: 'humidity',
    },
    {
      id: 'sensor-pressure',
      label: 'Pressure',
      icon: Gauge,
      value: pressure,
      unit: 'hPa',
      trend: pressTrend.trend,
      trendLabel: pressTrend.label,
      observed: observedRange(series, 'pressure', 'hPa'),
      health: healthOf(pressHealth),
      healthLabel: pressHealth?.detail || 'Healthy',
      cardClass: '',
      valueColor: 'text-accent',
      iconColor: 'text-accent',
      testId: 'pressure',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {sensors.map((sensor) => {
        const Icon = sensor.icon;
        const TrendIcon =
          sensor.trend === 'up' ? TrendingUp : sensor.trend === 'down' ? TrendingDown : Minus;
        const trendColor =
          sensor.trend === 'up'
            ? sensor.id === 'sensor-temp'
              ? 'text-danger'
              : 'text-positive'
            : sensor.trend === 'down'
              ? 'text-warning'
              : 'text-muted-foreground';

        return (
          <div
            key={sensor.id}
            data-testid={`sensor-card-${sensor.testId}`}
            className={`card-elevated relative overflow-hidden p-5 ${sensor.cardClass}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-muted/60 p-2">
                  <Icon size={18} className={sensor.iconColor} />
                </div>
                <span className="text-label-sm text-muted-foreground">{sensor.label}</span>
              </div>
              {sensor.health === 'anomaly' ? (
                <span className="flex items-center gap-1 rounded-full status-critical px-2 py-0.5 text-xs font-semibold">
                  <AlertCircle size={11} />
                  Anomaly Detected
                </span>
              ) : sensor.health === 'warning' ? (
                <span className="flex items-center gap-1 rounded-full status-warning px-2 py-0.5 text-xs font-semibold">
                  <AlertCircle size={11} />
                  {sensor.healthLabel}
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full status-healthy px-2 py-0.5 text-xs font-semibold">
                  <CheckCircle size={11} />
                  Healthy
                </span>
              )}
            </div>

            <div className="mb-2 flex items-end gap-2">
              <span className={`text-value-xl font-tabular ${sensor.valueColor}`}>
                {sensor.value != null && !Number.isNaN(sensor.value)
                  ? sensor.value.toFixed(1)
                  : '—'}
              </span>
              <span className={`mb-0.5 text-lg font-semibold ${sensor.valueColor}`}>
                {sensor.unit}
              </span>
            </div>

            <div className={`mb-3 flex items-center gap-1.5 ${trendColor}`}>
              <TrendIcon size={14} />
              <span className="font-tabular text-xs font-medium">{sensor.trendLabel}</span>
              <span className="text-xs text-muted-foreground">vs previous reading</span>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2.5">
              <span className="font-tabular text-xs text-muted-foreground">
                {formatClock(timestamp)}
              </span>
              <span className="text-right text-xs text-muted-foreground">
                Observed:{' '}
                <span className="font-tabular font-medium text-foreground/70">
                  {sensor.observed}
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

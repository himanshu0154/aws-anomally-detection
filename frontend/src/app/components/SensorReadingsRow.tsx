import React from 'react';
import { Thermometer, Droplets, Gauge, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from 'lucide-react';
import type { SensorHealth, SeriesPoint } from '@/hooks/useLiveDashboardData';

interface SensorReadingsRowProps {
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  sensorHealth: Record<string, SensorHealth>;
  timestamp: string;
  series: SeriesPoint[];
}

function formatTime(iso: string): string {
  if (!iso) return '--:--:-- UTC';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC';
  } catch {
    return iso.slice(11, 19) + ' UTC';
  }
}

function computeTrend(series: SeriesPoint[], key: 'temp' | 'humidity', unit: string): { trend: 'up' | 'down' | 'stable'; label: string } {
  if (series.length < 2) return { trend: 'stable', label: `±0.0 ${unit}` };
  const current = series[series.length - 1]?.[key];
  const prev = series[series.length - 2]?.[key];
  if (current == null || prev == null) return { trend: 'stable', label: `±0.0 ${unit}` };
  const diff = current - prev;
  const absDiff = Math.abs(diff);
  if (absDiff < 0.1) return { trend: 'stable', label: `±${absDiff.toFixed(1)} ${unit}` };
  if (diff > 0) return { trend: 'up', label: `+${absDiff.toFixed(1)} ${unit}` };
  return { trend: 'down', label: `−${absDiff.toFixed(1)} ${unit}` };
}

function computePressureTrend(series: SeriesPoint[]): { trend: 'up' | 'down' | 'stable'; label: string } {
  if (series.length < 2) return { trend: 'stable', label: '±0.0 hPa' };
  const current = series[series.length - 1]?.pressureScaled;
  const prev = series[series.length - 2]?.pressureScaled;
  if (current == null || prev == null) return { trend: 'stable', label: '±0.0 hPa' };
  const diff = (current - prev) * 10;
  const absDiff = Math.abs(diff);
  if (absDiff < 0.1) return { trend: 'stable', label: `±${absDiff.toFixed(1)} hPa` };
  if (diff > 0) return { trend: 'up', label: `+${absDiff.toFixed(1)} hPa` };
  return { trend: 'down', label: `−${absDiff.toFixed(1)} hPa` };
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
  normalRange: string;
  trend: 'up' | 'down' | 'stable';
  trendLabel: string;
  timestamp: string;
  health: 'anomaly' | 'healthy' | 'warning';
  healthLabel: string;
}

export default function SensorReadingsRow({ temperature, humidity, pressure, sensorHealth, timestamp, series }: SensorReadingsRowProps) {
  const tempTrend = computeTrend(series, 'temp', '°C');
  const humidTrend = computeTrend(series, 'humidity', '%');
  const pressTrend = computePressureTrend(series);

  const tempHealth = sensorHealth?.temperature;
  const humidHealth = sensorHealth?.humidity;
  const pressHealth = sensorHealth?.pressure;

  const sensors: SensorDef[] = [
    {
      id: 'sensor-temp',
      label: 'Temperature',
      icon: Thermometer,
      value: temperature,
      unit: '°C',
      trend: tempTrend.trend,
      trendLabel: tempTrend.label,
      timestamp: formatTime(timestamp),
      health: tempHealth?.status === 'critical' ? 'anomaly' : tempHealth?.status === 'warning' ? 'warning' : 'healthy',
      healthLabel: tempHealth?.detail || 'Healthy',
      normalRange: '18 – 38 °C',
      cardClass: 'gradient-temp',
      valueColor: tempHealth?.status === 'critical' ? 'text-danger' : 'text-danger',
      iconColor: 'text-danger',
    },
    {
      id: 'sensor-humidity',
      label: 'Relative Humidity',
      icon: Droplets,
      value: humidity,
      unit: '%',
      trend: humidTrend.trend,
      trendLabel: humidTrend.label,
      timestamp: formatTime(timestamp),
      health: humidHealth?.status === 'critical' ? 'anomaly' : humidHealth?.status === 'warning' ? 'warning' : 'healthy',
      healthLabel: humidHealth?.detail || 'Healthy',
      normalRange: '40 – 90 %',
      cardClass: 'gradient-humidity',
      valueColor: 'text-primary',
      iconColor: 'text-primary',
    },
    {
      id: 'sensor-pressure',
      label: 'Pressure',
      icon: Gauge,
      value: pressure,
      unit: 'hPa',
      trend: pressTrend.trend,
      trendLabel: pressTrend.label,
      timestamp: formatTime(timestamp),
      health: pressHealth?.status === 'critical' ? 'anomaly' : pressHealth?.status === 'warning' ? 'warning' : 'healthy',
      healthLabel: pressHealth?.detail || 'Healthy',
      normalRange: '980 – 1050 hPa',
      cardClass: 'gradient-pressure',
      valueColor: 'text-accent',
      iconColor: 'text-accent',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {sensors.map((sensor) => {
        const Icon = sensor.icon;
        const TrendIcon =
          sensor.trend === 'up'
            ? TrendingUp
            : sensor.trend === 'down'
            ? TrendingDown
            : Minus;

        const trendColor =
          sensor.trend === 'up'
            ? sensor.id === 'sensor-temp' ? 'text-danger' : 'text-positive'
            : sensor.trend === 'down' ? 'text-warning' : 'text-muted-foreground';

        return (
          <div
            key={sensor.id}
            className={`card-elevated p-5 ${sensor.cardClass} relative overflow-hidden`}
          >
            {/* Top row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-muted/60">
                  <Icon size={18} className={sensor.iconColor} />
                </div>
                <span className="text-label-sm text-muted-foreground">{sensor.label}</span>
              </div>
              {sensor.health === 'anomaly' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full status-critical text-xs font-semibold">
                  <AlertCircle size={11} />
                  Anomaly Detected
                </span>
              ) : sensor.health === 'warning' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full status-warning text-xs font-semibold">
                  <AlertCircle size={11} />
                  {sensor.healthLabel}
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full status-healthy text-xs font-semibold">
                  <CheckCircle size={11} />
                  Healthy
                </span>
              )}
            </div>
            {/* Value */}
            <div className="flex items-end gap-2 mb-2">
              <span className={`text-value-xl font-tabular ${sensor.valueColor}`}>
                {sensor.value != null ? sensor.value.toFixed(1) : '—'}
              </span>
              <span className={`text-lg font-semibold mb-0.5 ${sensor.valueColor}`}>
                {sensor.unit}
              </span>
            </div>
            {/* Trend */}
            <div className={`flex items-center gap-1.5 mb-3 ${trendColor}`}>
              <TrendIcon size={14} />
              <span className="text-xs font-medium font-tabular">{sensor.trendLabel}</span>
            </div>
            {/* Footer */}
            <div className="border-t border-border/50 pt-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-tabular">{sensor.timestamp}</span>
              <span className="text-xs text-muted-foreground">
                Normal: <span className="text-foreground/60 font-medium">{sensor.normalRange}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

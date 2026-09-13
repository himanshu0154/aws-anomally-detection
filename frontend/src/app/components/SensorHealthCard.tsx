import React from 'react';
import {
  Thermometer,
  Droplets,
  Gauge,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import type { SensorHealth } from '@/types/skyguard';

interface SensorHealthCardsProps {
  sensorHealth: Record<string, SensorHealth>;
}

const SENSOR_ICONS: Record<string, React.ElementType> = {
  temperature: Thermometer,
  humidity: Droplets,
  pressure: Gauge,
};

const SENSOR_COLORS: Record<string, string> = {
  temperature: 'text-danger',
  humidity: 'text-primary',
  pressure: 'text-accent',
};

export default function SensorHealthCards({ sensorHealth }: SensorHealthCardsProps) {
  const sensors = Object.entries(sensorHealth);

  if (sensors.length === 0) {
    return (
      <div className="card-elevated p-5 h-full">
        <h2 className="text-base font-semibold text-foreground mb-1">Sensor Health</h2>
        <p className="text-xs text-muted-foreground mb-4">Physical sensor diagnostics</p>
        <p className="text-sm text-muted-foreground">Waiting for sensor data...</p>
      </div>
    );
  }

  return (
    <div className="card-elevated p-5 h-full">
      <h2 className="text-base font-semibold text-foreground mb-1">Sensor Health</h2>
      <p className="text-xs text-muted-foreground mb-4">Physical sensor diagnostics</p>
      <div className="space-y-3">
        {sensors.map(([key, health]) => {
          const Icon = SENSOR_ICONS[key] || Thermometer;
          const iconColor = SENSOR_COLORS[key] || 'text-muted-foreground';
          const isCritical = health.status === 'critical';
          const isWarning = health.status === 'warning';

          return (
            <div
              key={key}
              className={`p-3 rounded-lg border ${
                isCritical
                  ? 'bg-danger/5 border-danger/30'
                  : isWarning
                    ? 'bg-warning/5 border-warning/30'
                    : 'bg-muted/30 border-border/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={15} className={iconColor} />
                  <span className="text-xs font-semibold text-foreground">
                    {health.label || key}
                  </span>
                </div>
                {isCritical ? (
                  <span className="flex items-center gap-1 text-xs status-critical px-1.5 py-0.5 rounded-full font-semibold">
                    <AlertCircle size={10} />
                    Anomalous
                  </span>
                ) : isWarning ? (
                  <span className="flex items-center gap-1 text-xs status-warning px-1.5 py-0.5 rounded-full font-semibold">
                    <AlertTriangle size={10} />
                    Warning
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs status-healthy px-1.5 py-0.5 rounded-full font-semibold">
                    <CheckCircle size={10} />
                    Healthy
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Status Detail</p>
                  <p className="text-xs font-bold text-foreground">{health.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

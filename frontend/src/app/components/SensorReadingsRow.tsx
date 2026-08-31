import React from 'react';
import { Thermometer, Droplets, Gauge, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const sensors = [
  {
    id: 'sensor-temp',
    label: 'Temperature',
    icon: Thermometer,
    value: '52.4',
    unit: '°C',
    trend: 'up',
    trendLabel: '+18.7°C in 4 min',
    timestamp: '10:16:35 UTC',
    health: 'anomaly',
    healthLabel: 'Anomaly Detected',
    normalRange: '18 – 38 °C',
    cardClass: 'gradient-temp',
    valueColor: 'text-danger',
    iconColor: 'text-danger',
  },
  {
    id: 'sensor-humidity',
    label: 'Relative Humidity',
    icon: Droplets,
    value: '67.3',
    unit: '%',
    trend: 'down',
    trendLabel: '−2.1% in 4 min',
    timestamp: '10:16:35 UTC',
    health: 'healthy',
    healthLabel: 'Healthy',
    normalRange: '40 – 90 %',
    cardClass: 'gradient-humidity',
    valueColor: 'text-primary',
    iconColor: 'text-primary',
  },
  {
    id: 'sensor-pressure',
    label: 'Pressure',
    icon: Gauge,
    value: '1013.2',
    unit: 'hPa',
    trend: 'stable',
    trendLabel: '±0.1 hPa in 4 min',
    timestamp: '10:16:35 UTC',
    health: 'healthy',
    healthLabel: 'Healthy',
    normalRange: '980 – 1050 hPa',
    cardClass: 'gradient-pressure',
    valueColor: 'text-accent',
    iconColor: 'text-accent',
  },
];

export default function SensorReadingsRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {sensors?.map((sensor) => {
        const Icon = sensor?.icon;
        const TrendIcon =
          sensor?.trend === 'up'
            ? TrendingUp
            : sensor?.trend === 'down'
            ? TrendingDown
            : Minus;

        const trendColor =
          sensor?.trend === 'up'
            ? sensor?.id === 'sensor-temp' ?'text-danger' :'text-positive'
            : sensor?.trend === 'down' ?'text-warning' :'text-muted-foreground';

        return (
          <div
            key={sensor?.id}
            className={`card-elevated p-5 ${sensor?.cardClass} relative overflow-hidden`}
          >
            {/* Top row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-muted/60">
                  <Icon size={18} className={sensor?.iconColor} />
                </div>
                <span className="text-label-sm text-muted-foreground">{sensor?.label}</span>
              </div>
              {sensor?.health === 'anomaly' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full status-critical text-xs font-semibold">
                  <AlertCircle size={11} />
                  {sensor?.healthLabel}
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full status-healthy text-xs font-semibold">
                  <CheckCircle size={11} />
                  {sensor?.healthLabel}
                </span>
              )}
            </div>
            {/* Value */}
            <div className="flex items-end gap-2 mb-2">
              <span className={`text-value-xl font-tabular ${sensor?.valueColor}`}>
                {sensor?.value}
              </span>
              <span className={`text-lg font-semibold mb-0.5 ${sensor?.valueColor}`}>
                {sensor?.unit}
              </span>
            </div>
            {/* Trend */}
            <div className={`flex items-center gap-1.5 mb-3 ${trendColor}`}>
              <TrendIcon size={14} />
              <span className="text-xs font-medium font-tabular">{sensor?.trendLabel}</span>
            </div>
            {/* Footer */}
            <div className="border-t border-border/50 pt-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-tabular">{sensor?.timestamp}</span>
              <span className="text-xs text-muted-foreground">
                Normal: <span className="text-foreground/60 font-medium">{sensor?.normalRange}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
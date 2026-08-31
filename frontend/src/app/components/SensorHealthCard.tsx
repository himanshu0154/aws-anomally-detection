import React from 'react';
import { Thermometer, Droplets, Gauge, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const healthData = [
  {
    id: 'health-temp',
    sensor: 'Temperature Sensor',
    icon: Thermometer,
    status: 'critical',
    statusLabel: 'Anomalous',
    lastCalibrated: '2026-08-10',
    signalStrength: 98,
    dataGaps: 0,
    battery: 87,
    uptime: '99.2%',
    iconColor: 'text-danger',
  },
  {
    id: 'health-humidity',
    sensor: 'Humidity Sensor',
    icon: Droplets,
    status: 'healthy',
    statusLabel: 'Healthy',
    lastCalibrated: '2026-08-10',
    signalStrength: 96,
    dataGaps: 0,
    battery: 91,
    uptime: '99.8%',
    iconColor: 'text-primary',
  },
  {
    id: 'health-pressure',
    sensor: 'Pressure Sensor',
    icon: Gauge,
    status: 'healthy',
    statusLabel: 'Healthy',
    lastCalibrated: '2026-08-10',
    signalStrength: 99,
    dataGaps: 0,
    battery: 88,
    uptime: '100%',
    iconColor: 'text-accent',
  },
];

export default function SensorHealthCards() {
  return (
    <div className="card-elevated p-5 h-full">
      <h2 className="text-base font-semibold text-foreground mb-1">Sensor Health</h2>
      <p className="text-xs text-muted-foreground mb-4">Physical sensor diagnostics</p>
      <div className="space-y-3">
        {healthData?.map((s) => {
          const Icon = s?.icon;
          return (
            <div
              key={s?.id}
              className={`p-3 rounded-lg border ${
                s?.status === 'critical' ?'bg-danger/5 border-danger/30' :'bg-muted/30 border-border/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={15} className={s?.iconColor} />
                  <span className="text-xs font-semibold text-foreground">{s?.sensor}</span>
                </div>
                {s?.status === 'critical' ? (
                  <span className="flex items-center gap-1 text-xs status-critical px-1.5 py-0.5 rounded-full font-semibold">
                    <AlertCircle size={10} />
                    {s?.statusLabel}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs status-healthy px-1.5 py-0.5 rounded-full font-semibold">
                    <CheckCircle size={10} />
                    {s?.statusLabel}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Signal</p>
                  <p className="text-xs font-bold text-foreground font-tabular">{s?.signalStrength}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Battery</p>
                  <p className="text-xs font-bold text-foreground font-tabular">{s?.battery}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                  <p className="text-xs font-bold text-positive font-tabular">{s?.uptime}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Clock size={10} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Last calibrated: <span className="text-foreground/60">{s?.lastCalibrated}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

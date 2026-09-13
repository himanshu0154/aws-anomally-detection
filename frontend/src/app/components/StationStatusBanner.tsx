import React from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, CheckCheck, XCircle } from 'lucide-react';
import type { SensorHealth } from '@/types/skyguard';

interface StationStatusBannerProps {
  overallStatus: 'critical' | 'warning' | 'healthy';
  sensorHealth: Record<string, SensorHealth>;
  unresolvedCount: number;
  resolvedCount: number;
}

export default function StationStatusBanner({
  overallStatus,
  sensorHealth,
  unresolvedCount,
  resolvedCount,
}: StationStatusBannerProps) {
  const sensorsOk = Object.values(sensorHealth).filter(
    (sensor) => sensor.status === 'healthy'
  ).length;
  const totalSensors = Object.keys(sensorHealth).length || 3;

  const statusConfig: Record<
    string,
    {
      label: string;
      icon: React.ElementType;
      wrapperClass: string;
      iconClass: string;
      textClass: string;
    }
  > = {
    critical: {
      label: 'CRITICAL',
      icon: XCircle,
      wrapperClass: 'status-critical',
      iconClass: 'text-danger',
      textClass: 'text-danger',
    },
    warning: {
      label: 'WARNING',
      icon: AlertTriangle,
      wrapperClass: 'status-warning',
      iconClass: 'text-warning',
      textClass: 'text-warning',
    },
    healthy: {
      label: 'HEALTHY',
      icon: CheckCircle,
      wrapperClass: 'status-healthy',
      iconClass: 'text-positive',
      textClass: 'text-positive',
    },
  };

  const config = statusConfig[overallStatus] ?? statusConfig.healthy;
  const StatusIcon = config.icon;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className={`flex items-center gap-3 rounded-xl px-5 py-4 ${config.wrapperClass}`}>
        <StatusIcon size={22} className={`shrink-0 ${config.iconClass}`} />
        <div>
          <p className={`text-label-sm ${config.textClass}/70`}>Overall AWS Status</p>
          <p className={`text-lg font-bold tracking-tight ${config.textClass}`}>{config.label}</p>
        </div>
      </div>

      <Link
        href="/explanations"
        className={`flex items-center gap-3 rounded-xl px-5 py-4 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          unresolvedCount > 0 ? 'status-warning' : 'status-healthy'
        }`}
      >
        <AlertTriangle
          size={22}
          className={`shrink-0 ${unresolvedCount > 0 ? 'text-warning' : 'text-positive'}`}
        />
        <div>
          <p
            className={`text-label-sm ${unresolvedCount > 0 ? 'text-warning/70' : 'text-positive/70'}`}
          >
            Unresolved anomalies
          </p>
          <p
            className={`text-lg font-bold tracking-tight ${
              unresolvedCount > 0 ? 'text-warning' : 'text-positive'
            }`}
          >
            {unresolvedCount} unresolved
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-3 rounded-xl px-5 py-4 status-healthy">
        <CheckCheck size={22} className="shrink-0 text-positive" />
        <div>
          <p className="text-label-sm text-positive/70">Resolved · data integrity</p>
          <p className="text-lg font-bold tracking-tight text-positive">
            {resolvedCount} resolved · {sensorsOk}/{totalSensors} sensors OK
          </p>
        </div>
      </div>
    </div>
  );
}

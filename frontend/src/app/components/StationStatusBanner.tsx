import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { SensorHealth, HistoryEvent } from '@/hooks/useLiveDashboardData';

interface StationStatusBannerProps {
  overallStatus: 'critical' | 'warning' | 'healthy';
  sensorHealth: Record<string, SensorHealth>;
  history: HistoryEvent[];
  anomalyStatus: string;
  severity: string;
}

export default function StationStatusBanner({ overallStatus, sensorHealth, history, anomalyStatus, severity }: StationStatusBannerProps) {
  const sensorsOK = Object.values(sensorHealth).filter(s => s.status === 'healthy').length;
  const totalSensors = Object.keys(sensorHealth).length || 3;
  const activeAnomalies = history.filter(h => h.status === 'Active').length;

  const statusConfig: Record<string, { label: string; icon: React.ElementType; wrapperClass: string; iconClass: string; textClass: string }> = {
    critical: { label: 'CRITICAL', icon: XCircle, wrapperClass: 'status-critical anomaly-pulse', iconClass: 'text-danger', textClass: 'text-danger' },
    warning: { label: 'WARNING', icon: AlertTriangle, wrapperClass: 'status-warning', iconClass: 'text-warning', textClass: 'text-warning' },
    healthy: { label: 'HEALTHY', icon: CheckCircle, wrapperClass: 'status-healthy', iconClass: 'text-positive', textClass: 'text-positive' },
  };

  const cfg = statusConfig[overallStatus] || statusConfig.healthy;
  const StatusIcon = cfg.icon;

  const sevLabel = severity === 'high' ? 'High Severity' : severity === 'medium' ? 'Medium Severity' : 'None';
  const anomalyCountLabel = activeAnomalies > 0 ? `${sevLabel} (${activeAnomalies})` : 'None';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Overall Status */}
      <div className={`sm:col-span-1 flex items-center gap-3 px-5 py-4 rounded-xl ${cfg.wrapperClass}`}>
        <StatusIcon size={22} className={`${cfg.iconClass} shrink-0`} />
        <div>
          <p className={`text-label-sm ${cfg.textClass}/70`}>Overall AWS Status</p>
          <p className={`text-lg font-bold ${cfg.textClass} tracking-tight`}>{cfg.label}</p>
        </div>
      </div>

      {/* Active Anomalies */}
      <div className={`flex items-center gap-3 px-5 py-4 rounded-xl ${activeAnomalies > 0 ? 'status-warning' : 'status-healthy'}`}>
        <AlertTriangle size={22} className={`${activeAnomalies > 0 ? 'text-warning' : 'text-positive'} shrink-0`} />
        <div>
          <p className={`text-label-sm ${activeAnomalies > 0 ? 'text-warning/70' : 'text-positive/70'}`}>Active Anomalies</p>
          <p className={`text-lg font-bold ${activeAnomalies > 0 ? 'text-warning' : 'text-positive'} tracking-tight`}>{anomalyCountLabel}</p>
        </div>
      </div>

      {/* Data Integrity */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl status-healthy">
        <CheckCircle size={22} className="text-positive shrink-0" />
        <div>
          <p className="text-label-sm text-positive/70">Data Integrity</p>
          <p className="text-lg font-bold text-positive tracking-tight">{sensorsOK} / {totalSensors} Sensors OK</p>
        </div>
      </div>
    </div>
  );
}

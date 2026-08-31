import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function StationStatusBanner() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Overall Status */}
      <div className="sm:col-span-1 flex items-center gap-3 px-5 py-4 rounded-xl status-critical anomaly-pulse">
        <XCircle size={22} className="text-danger shrink-0" />
        <div>
          <p className="text-label-sm text-danger/70">Overall AWS Status</p>
          <p className="text-lg font-bold text-danger tracking-tight">CRITICAL</p>
        </div>
      </div>

      {/* Active Anomalies */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl status-warning">
        <AlertTriangle size={22} className="text-warning shrink-0" />
        <div>
          <p className="text-label-sm text-warning/70">Active Anomalies</p>
          <p className="text-lg font-bold text-warning tracking-tight">1 High Severity</p>
        </div>
      </div>

      {/* Data Integrity */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl status-healthy">
        <CheckCircle size={22} className="text-positive shrink-0" />
        <div>
          <p className="text-label-sm text-positive/70">Data Integrity</p>
          <p className="text-lg font-bold text-positive tracking-tight">2 / 3 Sensors OK</p>
        </div>
      </div>
    </div>
  );
}
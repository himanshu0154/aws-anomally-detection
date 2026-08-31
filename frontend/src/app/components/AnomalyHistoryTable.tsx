import React from 'react';
import { History, AlertTriangle, AlertCircle, Info } from 'lucide-react';

// Backend integration point: fetch from /api/anomaly-history?station=AWS-MH-042
const historyData = [
  {
    id: 'hist-001',
    time: '10:16:35',
    date: '2026-08-23',
    sensor: 'Temperature',
    reading: '52.4 °C',
    type: 'Sudden Spike',
    severity: 'High',
    status: 'Active',
  },
  {
    id: 'hist-002',
    time: '06:42:10',
    date: '2026-08-23',
    sensor: 'Humidity',
    reading: '98.7 %',
    type: 'Drift',
    severity: 'Medium',
    status: 'Resolved',
  },
  {
    id: 'hist-003',
    time: '22:15:44',
    date: '2026-08-22',
    sensor: 'Temperature',
    reading: '39.1 °C',
    type: 'Sudden Spike',
    severity: 'Medium',
    status: 'Resolved',
  },
  {
    id: 'hist-004',
    time: '14:30:22',
    date: '2026-08-22',
    sensor: 'Pressure',
    reading: '978.3 hPa',
    type: 'Multivariate Inconsistency',
    severity: 'Low',
    status: 'Resolved',
  },
  {
    id: 'hist-005',
    time: '09:05:17',
    date: '2026-08-22',
    sensor: 'Humidity',
    reading: '17.2 %',
    type: 'Sudden Spike',
    severity: 'Medium',
    status: 'Resolved',
  },
  {
    id: 'hist-006',
    time: '03:18:50',
    date: '2026-08-21',
    sensor: 'Temperature',
    reading: '−2.8 °C',
    type: 'Frozen Sensor',
    severity: 'High',
    status: 'Resolved',
  },
  {
    id: 'hist-007',
    time: '18:44:03',
    date: '2026-08-20',
    sensor: 'Pressure',
    reading: '1051.7 hPa',
    type: 'Drift',
    severity: 'Low',
    status: 'Resolved',
  },
  {
    id: 'hist-008',
    time: '11:22:39',
    date: '2026-08-20',
    sensor: 'Temperature',
    reading: '41.6 °C',
    type: 'Sudden Spike',
    severity: 'High',
    status: 'Resolved',
  },
];

const severityConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  High: { label: 'High', className: 'status-critical', icon: AlertCircle },
  Medium: { label: 'Medium', className: 'status-warning', icon: AlertTriangle },
  Low: { label: 'Low', className: 'status-normal', icon: Info },
};

const statusConfig: Record<string, string> = {
  Active: 'status-critical',
  Resolved: 'status-healthy',
  Investigating: 'status-warning',
};

export default function AnomalyHistoryTable() {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={17} className="text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Anomaly History</h2>
            <p className="text-xs text-muted-foreground">Last 7 days — AWS-MH-042</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-tabular">{historyData.length} events</span>
          <span className="px-2 py-0.5 rounded-full status-critical text-xs font-bold">1 Active</span>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Time', 'Sensor', 'Reading', 'Anomaly Type', 'Severity', 'Status'].map((col) => (
                <th
                  key={`col-${col}`}
                  className="text-left pb-2.5 text-label-sm text-muted-foreground font-medium pr-4 last:pr-0"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {historyData.map((row) => {
              const sev = severityConfig[row.severity] || severityConfig.Low;
              const SevIcon = sev.icon;
              return (
                <tr
                  key={row.id}
                  className={`group transition-colors ${
                    row.status === 'Active' ?'bg-danger/5 hover:bg-danger/10' :'hover:bg-muted/30'
                  }`}
                >
                  {/* Time */}
                  <td className="py-3 pr-4">
                    <p className="text-xs font-semibold text-foreground font-tabular">{row.time}</p>
                    <p className="text-xs text-muted-foreground font-tabular">{row.date}</p>
                  </td>

                  {/* Sensor */}
                  <td className="py-3 pr-4">
                    <span className="text-xs font-medium text-foreground">{row.sensor}</span>
                  </td>

                  {/* Reading */}
                  <td className="py-3 pr-4">
                    <span
                      className={`text-xs font-bold font-tabular ${
                        row.status === 'Active' ? 'text-danger' : 'text-foreground'
                      }`}
                    >
                      {row.reading}
                    </span>
                  </td>

                  {/* Type */}
                  <td className="py-3 pr-4">
                    <span className="text-xs text-foreground/80">{row.type}</span>
                  </td>

                  {/* Severity */}
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${sev.className}`}
                    >
                      <SevIcon size={10} />
                      {sev.label}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3">
                    <span
                      className={`inline-flex text-xs px-2 py-0.5 rounded-full font-semibold ${statusConfig[row.status] || 'status-normal'}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table footer */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing 8 of 23 events in the last 7 days
        </p>
        <button className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
          View full history →
        </button>
      </div>
    </div>
  );
}
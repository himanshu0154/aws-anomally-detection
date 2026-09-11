'use client';

import React, { useState } from 'react';
import {
  History,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Brain,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import type { HistoryEvent } from '@/hooks/useLiveDashboardData';

interface AnomalyHistoryTableProps {
  history: HistoryEvent[];
}

const severityConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  High: { label: 'High', className: 'status-critical', icon: AlertCircle },
  Medium: { label: 'Medium', className: 'status-warning', icon: AlertTriangle },
  Low: { label: 'Low', className: 'status-normal', icon: Info },
  None: { label: 'None', className: 'status-normal', icon: CheckCircle2 },
};

const statusConfig: Record<string, string> = {
  Active: 'status-critical',
  Resolved: 'status-healthy',
  Investigating: 'status-warning',
};

function urgencyClass(urgency: string): string {
  if (urgency.toLowerCase().includes('immediate')) return 'status-critical';
  if (urgency.toLowerCase().includes('hour')) return 'status-warning';
  return 'status-normal';
}

export default function AnomalyHistoryTable({ history }: AnomalyHistoryTableProps) {
  const activeCount = history.filter(h => h.status === 'Active').length;
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRowId(prev => prev === id ? null : id);
  };

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={17} className="text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Anomaly History</h2>
            <p className="text-xs text-muted-foreground">Session anomaly detections — AWS-MH-042</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-tabular">{history.length} events</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full status-critical text-xs font-bold">{activeCount} Active</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No anomalies detected yet — the model is monitoring...
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border">
                {['', 'Time', 'Sensor', 'Reading', 'Anomaly Type', 'Severity', 'Status'].map((col) => (
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
              {history.map((row, index) => {
                const sevKey = row.severity.charAt(0).toUpperCase() + row.severity.slice(1).toLowerCase();
                const sev = severityConfig[sevKey] || severityConfig.None;
                const SevIcon = sev.icon;
                const isExpanded = expandedRowId === String(index);
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className={`group transition-colors cursor-pointer ${
                        row.status === 'Active' ? 'bg-danger/5 hover:bg-danger/10' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => toggleRow(String(index))}
                    >
                      {/* Expand chevron */}
                      <td className="py-3 pr-4 w-8">
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(row.id);
                          }}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>

                      {/* Time */}
                      <td className="py-3 pr-4">
                        <p className="text-xs font-semibold text-foreground font-tabular">{row.time}</p>
                        <p className="text-xs text-muted-foreground font-tabular">{row.date}</p>
                      </td>

                      {/* Sensor */}
                      <td className="py-3 pr-4">
                        <span className="text-xs font-medium text-foreground capitalize">{row.sensor}</span>
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

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-4 pb-4 pt-1">
                          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
                            {/* AI Reasoning */}
                            {row.explanation && (
                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="flex items-start gap-2">
                                  <Brain size={14} className="text-primary mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">
                                      Detection Reasoning
                                    </p>
                                    <p className="text-xs text-foreground leading-relaxed">
                                      {row.explanation}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Confidence + Corrected Value row */}
                            <div className="flex flex-wrap gap-4">
                              {row.anomaly_score != null && (
                                <div className="flex items-center gap-2">
                                  <Brain size={13} className="text-primary" />
                                  <span className="text-xs text-muted-foreground">Confidence:</span>
                                  <span className="text-xs font-bold text-primary font-tabular">
                                    {Math.round(row.anomaly_score)}%
                                  </span>
                                  <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full"
                                      style={{ width: `${row.anomaly_score}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {row.corrected_value && (
                                <div className="flex items-center gap-2">
                                  <AlertCircle size={13} className="text-accent" />
                                  <span className="text-xs text-muted-foreground">Est. true value:</span>
                                  <span className="text-xs font-bold text-accent font-tabular">
                                    {row.corrected_value.temperature != null
                                      ? `~${row.corrected_value.temperature.toFixed(1)} °C`
                                      : row.corrected_value.humidity != null
                                        ? `~${row.corrected_value.humidity.toFixed(1)} %`
                                        : row.corrected_value.pressure != null
                                          ? `~${row.corrected_value.pressure.toFixed(1)} hPa`
                                          : '—'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Recommended Actions */}
                            {row.recommendations && row.recommendations.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
                                  Recommended Actions
                                </p>
                                <div className="space-y-2">
                                  {row.recommendations.map((rec) => (
                                    <div
                                      key={`rec-${row.id}-${rec.priority}`}
                                      className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/40 group hover:bg-muted/50 transition-colors"
                                    >
                                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                                        {rec.priority}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <p className="text-xs font-semibold text-foreground">{rec.action}</p>
                                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${urgencyClass(rec.urgency)} font-medium`}>
                                            {rec.urgency}
                                          </span>
                                        </div>
                                      </div>
                                      <Wrench size={12} className="text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Table footer */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {history.length} events from this session
        </p>
      </div>
    </div>
  );
}

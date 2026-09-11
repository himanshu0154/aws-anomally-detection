'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Brain,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from 'lucide-react';
import type { LiveReading, HistoryEvent } from '@/hooks/useLiveDashboardData';

interface AnomalyAlertCardProps {
  live: LiveReading;
  isWarmingUp: boolean;
  history: HistoryEvent[];
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

function anomalyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    temperature_spike: 'Sudden Spike',
    temperature_frozen: 'Frozen Sensor',
    multivariate_inconsistency: 'Multivariate Inconsistency',
    ml_anomaly: 'ML Anomaly',
    communication_error: 'Communication Error',
    normal: 'None',
  };
  return labels[type] || type;
}

export default function AnomalyAlertCard({ live, isWarmingUp, history }: AnomalyAlertCardProps) {
  const [expanded, setExpanded] = useState(true);
  const hasLiveAnomaly = live.anomaly_status === 'anomaly' && !isWarmingUp;

  // Determine the anomaly to display: prefer live anomaly, fall back to most recent history entry
  const displayAnomaly = hasLiveAnomaly
    ? {
        station_id: live.station_id,
        timestamp: live.timestamp,
        sensor: live.affected_sensor,
        anomaly_type: live.anomaly_type,
        anomaly_score: live.anomaly_score,
        severity: live.severity,
        explanation: live.explanation,
        corrected_value: live.corrected_value,
        reading_value: live.affected_sensor === 'temperature' ? live.temperature
          : live.affected_sensor === 'humidity' ? live.humidity
          : live.pressure,
        isLive: true,
      }
    : history.length > 0
      ? {
          station_id: live.station_id,
          timestamp: '',
          sensor: history[0].sensor,
          anomaly_type: history[0].raw_type,
          anomaly_score: history[0].anomaly_score,
          severity: history[0].severity.toLowerCase(),
          explanation: history[0].explanation,
          corrected_value: history[0].corrected_value,
          reading_value: null,
          isLive: false,
        }
      : null;

  // No anomaly recorded yet — calm state
  if (!displayAnomaly) {
    return (
      <div className="rounded-xl border border-positive/30 bg-positive/5 overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-positive/10">
            <CheckCircle size={20} className="text-positive" />
          </div>
          <div>
            <span className="text-base font-bold text-positive tracking-tight">
              No Active Anomaly
            </span>
            <p className="text-xs text-positive/70 mt-0.5">
              All sensors operating within normal parameters — {live.station_id}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active anomaly display
  const sevLabel = displayAnomaly.severity?.charAt(0).toUpperCase() + displayAnomaly.severity?.slice(1) || 'High';

  return (
    <div className="rounded-xl border border-danger/50 bg-danger/5 overflow-hidden anomaly-pulse">
      {/* Alert Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-danger/10 border-b border-danger/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-danger/20">
            <AlertTriangle size={20} className="text-danger" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-danger tracking-tight">
                ⚠ ANOMALY DETECTED
              </span>

              <span className={`px-2 py-0.5 rounded-full ${displayAnomaly.severity === 'high' ? 'bg-danger text-white' : 'bg-warning text-white'} text-xs font-bold uppercase tracking-wide`}>
                {sevLabel}
              </span>

              <span className={`px-2 py-0.5 rounded-full ${displayAnomaly.isLive ? 'bg-muted border border-border text-muted-foreground' : 'bg-primary/10 border border-primary/20 text-primary'} text-xs font-semibold`}>              {displayAnomaly.isLive ? 'LIVE' : 'RECENT'}
              </span>
            </div>              <p className="text-xs text-danger/70 mt-0.5">
              {displayAnomaly.isLive
                ? <>Detected at {formatTime(live.timestamp)} — {live.station_id}</>
                : <>Most recent anomaly — {live.station_id}</>
              }
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1.5 rounded-lg hover:bg-danger/20 transition-colors text-danger/60 hover:text-danger"
          aria-label={expanded ? 'Collapse alert' : 'Expand alert'}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Alert Body */}
      {expanded && (
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Sensor */}
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground">Sensor</p>
              <p className="text-sm font-semibold text-foreground capitalize">
                {displayAnomaly.sensor}
              </p>
            </div>

            {/* Type */}
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground">
                Anomaly Type
              </p>

              <div className="flex items-center gap-1.5">
                <Zap size={13} className="text-warning" />
                <p className="text-sm font-semibold text-warning">
                  {anomalyTypeLabel(displayAnomaly.anomaly_type)}
                </p>
              </div>
            </div>

            {/* Reading */}
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground">Reading</p>
              <p className="text-sm font-bold text-danger font-tabular">
                {displayAnomaly.reading_value != null ? `${displayAnomaly.reading_value.toFixed(1)} ${displayAnomaly.sensor === 'temperature' ? '°C' : displayAnomaly.sensor === 'humidity' ? '%' : 'hPa'}` : 'N/A'}
              </p>
            </div>

            {/* Severity */}
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground">Severity</p>

              <span className={`inline-flex px-2 py-0.5 rounded-full ${displayAnomaly.severity === 'high' ? 'status-critical' : 'status-warning'} text-xs font-bold uppercase`}>
                {sevLabel}
              </span>
            </div>

            {/* AI Confidence */}
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground">
                AI Confidence
              </p>

              <div className="flex items-center gap-2">
                <Brain size={14} className="text-primary" />
                <p className="text-sm font-bold text-primary font-tabular">
                  {displayAnomaly.anomaly_score != null ? `${Math.round(displayAnomaly.anomaly_score)}%` : '—'}
                </p>
              </div>

              {displayAnomaly.anomaly_score != null && (
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${displayAnomaly.anomaly_score}%` }}
                  />
                </div>
              )}
            </div>

            {/* Estimated Correct */}
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground">
                Est. True Value
              </p>

              <p className="text-sm font-semibold text-accent font-tabular">
                {displayAnomaly.corrected_value?.temperature != null ? `~${displayAnomaly.corrected_value.temperature.toFixed(1)} °C`
                  : displayAnomaly.corrected_value?.humidity != null ? `~${displayAnomaly.corrected_value.humidity.toFixed(1)} %`
                  : displayAnomaly.corrected_value?.pressure != null ? `~${displayAnomaly.corrected_value.pressure.toFixed(1)} hPa`
                  : '—'}
              </p>
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border/60">
            <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
              Detection Reasoning
            </p>              <p className="text-sm text-foreground leading-relaxed">
              {displayAnomaly.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

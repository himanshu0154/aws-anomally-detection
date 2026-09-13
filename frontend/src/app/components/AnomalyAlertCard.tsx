'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import type { LiveReading } from '@/types/skyguard';
import { anomalyTypeLabel, formatClock, readingValue } from '@/lib/anomaly';
import { SquigglyText } from '@/components/ui/squiggly-text';

interface AnomalyAlertCardProps {
  live: LiveReading;
  isWarmingUp: boolean;
  unresolvedCount: number;
  resolvedCount: number;
}

function unitForSensor(sensor: string): string {
  if (sensor.includes('temperature')) return '°C';
  if (sensor.includes('humidity')) return '%';
  if (sensor.includes('pressure')) return 'hPa';
  return '';
}

/**
 * Current detection state only.
 *
 * The card deliberately does not substitute a past history row when the live reading
 * is normal — an unresolved anomaly is a stored event and belongs to the explanation
 * queue, which this card links to.
 */
export default function AnomalyAlertCard({
  live,
  isWarmingUp,
  unresolvedCount,
  resolvedCount,
}: AnomalyAlertCardProps) {
  const [expanded, setExpanded] = useState(true);
  const liveAnomaly = live.anomaly_status === 'anomaly' && !isWarmingUp;

  if (!liveAnomaly) {
    return (
     <div className="overflow-hidden rounded-xl border border-positive/30 bg-card">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="rounded-lg bg-positive/10 p-2">
            <CheckCircle size={20} className="text-positive" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-label-sm text-positive/70">Current detection</p>
            <p className="text-base font-bold tracking-tight text-positive">
              No Active Current Anomaly
            </p>
            <p className="mt-0.5 text-xs text-positive/80">
              {isWarmingUp
                ? 'Model is warming up — detection is calibrating.'
                : 'All sensors report within expected parameters.'}
            </p>
          </div>

          {unresolvedCount > 0 ? (
            <Link
              href="/explanations"
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {unresolvedCount} unresolved {unresolvedCount === 1 ? 'anomaly' : 'anomalies'}
              <ArrowRight size={12} />
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">
              {resolvedCount > 0
                ? `${resolvedCount} resolved this session`
                : 'No anomalies recorded this session'}
            </span>
          )}
        </div>
      </div>
    );
  }

  const readingValueNumber = live.affected_sensor.includes('temperature')
    ? live.temperature
    : live.affected_sensor.includes('humidity')
      ? live.humidity
      : live.pressure;
  const severityLabelText = live.severity.charAt(0).toUpperCase() + live.severity.slice(1);
  const corrected =
    live.corrected_value?.temperature ??
    live.corrected_value?.humidity ??
    live.corrected_value?.pressure;

  return (
    <div className="anomaly-pulse overflow-hidden rounded-xl border border-danger/50 bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-danger/30 bg-danger/10 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-danger/20 p-2">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-label-sm text-danger/70">Current detection</span>
              {/*
                The wobble is this app's urgency signal, so it is attached to the
                one label that exists *only* while something is actually wrong —
                the calm state above is deliberately still. It stays on this short
                label and never on a reading: the effect deforms glyphs, and a
                number you are meant to read off must not move.
              */}
              <SquigglyText
                className="text-base font-bold tracking-tight text-danger"
                stepDuration={110}
                scale={[2.5, 3.5]}
              >
                Anomaly Detected
              </SquigglyText>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                  live.severity === 'high' ? 'bg-danger text-white' : 'bg-warning text-white'
                }`}
              >
                {severityLabelText}
              </span>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                LIVE
              </span>
            </div>
            <p className="mt-0.5 text-xs text-danger/70">
              Detected at {formatClock(live.timestamp)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-lg p-1.5 text-danger/60 transition-colors hover:bg-danger/20 hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={
            expanded ? 'Collapse current anomaly details' : 'Expand current anomaly details'
          }
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {expanded && (
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-label-sm text-muted-foreground">Sensor</p>
              <p className="mt-0.5 text-sm font-semibold capitalize text-foreground">
                {live.affected_sensor}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-muted-foreground">Anomaly type</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-warning">
                <Zap size={13} />
                {anomalyTypeLabel(live.anomaly_type)}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-muted-foreground">Reading</p>
              <p className="mt-0.5 font-tabular text-sm font-bold text-danger">
                {readingValue(readingValueNumber, unitForSensor(live.affected_sensor))}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-muted-foreground">AI confidence</p>
              <div className="mt-0.5 flex items-center gap-2">
                <Brain size={14} className="text-primary" />
                <p className="font-tabular text-sm font-bold text-primary">
                  {live.anomaly_score != null ? `${Math.round(live.anomaly_score)}%` : '—'}
                </p>
              </div>
              {live.anomaly_score != null && (
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${live.anomaly_score}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <p className="text-label-sm text-muted-foreground">Est. true value</p>
              <p className="mt-0.5 font-tabular text-sm font-semibold text-accent">
                {corrected != null ? `~${corrected.toFixed(1)}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-muted-foreground">Queue</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {unresolvedCount} unresolved
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border/60 bg-muted/40 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Detection reasoning
            </p>
            <p className="text-sm leading-relaxed text-foreground">{live.explanation}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/explanations"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Open explanation &amp; recommendations
              <ArrowRight size={12} />
            </Link>
            <Link
              href="/root-cause"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Root-cause analysis
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

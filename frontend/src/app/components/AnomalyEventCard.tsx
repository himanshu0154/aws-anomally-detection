'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCheck, Loader2 } from 'lucide-react';
import type { AnomalyEvent } from '@/types/skyguard';
import {
  SEVERITY_CLASS,
  STATUS_CLASS,
  anomalyTypeLabel,
  correctedValueFor,
  formatDateTime,
  severityLabel,
} from '@/lib/anomaly';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { ExplanationBody } from './ExplanationRecommendation';

interface AnomalyEventCardProps {
  event: AnomalyEvent;
  resolving: boolean;
  onResolve: (event: AnomalyEvent) => void;
}

/** High-severity events ask for a confirmation before they leave the operator's queue. */
const CONFIRM_SEVERITY = 'High';

function MetaCell({
  label,
  value,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-label-sm text-muted-foreground">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold ${className}`}>{value}</p>
    </div>
  );
}

export default function AnomalyEventCard({ event, resolving, onResolve }: AnomalyEventCardProps) {
  const [confirming, setConfirming] = useState(false);
  const resolved = event.status === 'Resolved';
  const corrected = correctedValueFor(event);
  const needsConfirmation = severityLabel(event.severity) === CONFIRM_SEVERITY;

  const handleToggle = () => {
    if (resolved || resolving) return;
    if (needsConfirmation) {
      setConfirming(true);
      return;
    }
    onResolve(event);
  };

  return (
    <article
      className={`card-elevated overflow-hidden ${
        event.status === 'Active' ? 'border-l-4 border-l-danger' : 'border-l-4 border-l-positive'
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
              {event.id}
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              {anomalyTypeLabel(event.raw_type)}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_CLASS[severityLabel(event.severity)]}`}
            >
              {severityLabel(event.severity)} severity
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[event.status]}`}
            >
              {event.status}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {event.day} {event.date} · {event.time} UTC
          </p>
        </div>

        {resolved && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-positive">
            <CheckCheck size={14} />
            Resolved {formatDateTime(event.resolved_at)}
          </p>
        )}
      </header>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <MetaCell
            label="Sensor"
            value={event.sensor === 'none' ? 'None' : event.sensor}
            className="capitalize"
          />
          <MetaCell label="Reading" value={event.reading} className="font-tabular text-danger" />
          <MetaCell
            label="Anomaly score"
            value={event.anomaly_score != null ? `${Math.round(event.anomaly_score)}%` : '—'}
            className="font-tabular text-primary"
          />
          <MetaCell
            label="Corrected value"
            value={corrected ? `~${corrected.value.toFixed(1)} ${corrected.unit}` : '—'}
            className="font-tabular text-accent"
          />
          <MetaCell
            label="Stored at"
            value={formatDateTime(event.timestamp)}
            className="font-tabular"
          />
        </div>

        <ExplanationBody event={event} />

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          {confirming && !resolved ? (
            <div className="flex flex-wrap items-center gap-3">
              <AlertCircle size={16} className="shrink-0 text-warning" />
              <p className="flex-1 text-xs font-medium text-foreground">
                Mark this {CONFIRM_SEVERITY}-severity anomaly as resolved?
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  onResolve(event);
                }}
                data-cursor="Confirm"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Confirm resolution
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
            </div>
          ) : (
            <label
              className="flex cursor-pointer items-center gap-3"
              data-cursor={resolved ? 'Resolved' : 'Resolve'}
              data-cursor-tone={resolved ? 'positive' : 'danger'}
            >
              <input
                type="checkbox"
                checked={resolved}
                disabled={resolved || resolving}
                onChange={handleToggle}
                className="h-4 w-4 shrink-0 rounded border-border accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
                aria-label={
                  resolved ? `Anomaly ${event.id} is resolved` : `Resolve anomaly ${event.id}`
                }
              />
              <span className="flex-1 text-xs font-medium text-foreground">
                {resolved ? 'Resolved — this event left the active queue' : 'Resolve this anomaly'}
              </span>
              {resolving && (
                <span
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  role="status"
                >
                  <Loader2 size={13} className="animate-spin" />
                  <TextShimmer baseColor="var(--muted-foreground)" highlightColor="var(--primary)">
                    Saving…
                  </TextShimmer>
                </span>
              )}
            </label>
          )}
        </div>
      </div>
    </article>
  );
}

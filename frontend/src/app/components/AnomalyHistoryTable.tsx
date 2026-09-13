'use client';

import React, { useState } from 'react';
import { Brain, CheckCheck, ChevronDown, ChevronUp, History, Loader2, Wrench } from 'lucide-react';
import type { AnomalyEvent } from '@/types/skyguard';
import {
  SEVERITY_CLASS,
  STATUS_CLASS,
  anomalyTypeLabel,
  correctedValueFor,
  formatDateTime,
  severityLabel,
} from '@/lib/anomaly';
import { urgencyClass } from './ExplanationRecommendation';

interface AnomalyHistoryTableProps {
  events: AnomalyEvent[];
  /** Pass the resolver to allow operators to resolve an event from its detail panel. */
  onResolve?: (event: AnomalyEvent) => void;
  isResolving?: (eventId: string) => boolean;
}

function StatusBadge({ status }: { status: AnomalyEvent['status'] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[status]}`}
    >
      {status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const label = severityLabel(severity);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_CLASS[label]}`}
    >
      {label}
    </span>
  );
}

/** Detail panel shared by the desktop row and the mobile card. */
function EventDetails({
  event,
  onResolve,
  resolving,
}: {
  event: AnomalyEvent;
  onResolve?: (event: AnomalyEvent) => void;
  resolving: boolean;
}) {
  const corrected = correctedValueFor(event);

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
      {event.explanation && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-start gap-2">
            <Brain size={14} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                Detection reasoning
              </p>
              <p className="text-xs leading-relaxed text-foreground">{event.explanation}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {event.anomaly_score != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <span className="font-tabular text-xs font-bold text-primary">
              {Math.round(event.anomaly_score)}%
            </span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${event.anomaly_score}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Corrected value:</span>
          <span className="font-tabular text-xs font-bold text-accent">
            {corrected ? `~${corrected.value.toFixed(1)} ${corrected.unit}` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Stored at:</span>
          <span className="font-tabular text-xs font-semibold text-foreground">
            {formatDateTime(event.timestamp)}
          </span>
        </div>
        {event.status === 'Resolved' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Resolved at:</span>
            <span className="flex items-center gap-1 font-tabular text-xs font-semibold text-positive">
              <CheckCheck size={12} />
              {formatDateTime(event.resolved_at)}
            </span>
          </div>
        )}
      </div>

      {event.root_cause_probabilities && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Root-cause probabilities at detection time
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/80">
            {Object.entries(event.root_cause_probabilities).map(([key, value]) => (
              <span key={`${event.id}-rc-${key}`} className="font-tabular">
                <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span> {value}%
              </span>
            ))}
          </div>
        </div>
      )}

      {event.recommendations.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recommended actions
          </p>
          <div className="space-y-2">
            {event.recommendations.map((recommendation) => (
              <div
                key={`${event.id}-rec-${recommendation.priority}`}
                className="group flex items-start gap-3 rounded-lg border border-border/40 bg-muted/30 p-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {recommendation.priority}
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-foreground">{recommendation.action}</p>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${urgencyClass(recommendation.urgency)}`}
                  >
                    {recommendation.urgency}
                  </span>
                </div>
                <Wrench
                  size={12}
                  className="mt-0.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {onResolve && event.status === 'Active' && (
        <div className="flex items-center gap-3 border-t border-border/60 pt-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              disabled={resolving}
              onChange={() => onResolve(event)}
              aria-label={`Resolve anomaly ${event.id}`}
              className="h-4 w-4 rounded border-border accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-xs font-medium text-foreground">Resolve this anomaly</span>
          </label>
          {resolving && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
              <Loader2 size={12} className="animate-spin" />
              Saving…
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Presentational event log. Filtering and data fetching belong to the page. */
export default function AnomalyHistoryTable({
  events,
  onResolve,
  isResolving = () => false,
}: AnomalyHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (eventId: string) =>
    setExpandedId((current) => (current === eventId ? null : eventId));

  return (
    <div className="card-elevated p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History size={17} className="text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Event log</h2>
            <p className="text-xs text-muted-foreground">
              Normal readings, active anomalies and resolved anomalies
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-tabular">{events.length} shown</span>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto scrollbar-thin md:block">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Stored sensor event history</caption>
          <thead>
            <tr className="border-b border-border">
              {['Event', 'Date & time', 'Sensor', 'Reading', 'Type', 'Severity', 'Status', ''].map(
                (column, index) => (
                  <th
                    key={`col-${index}-${column}`}
                    scope="col"
                    className="pb-2.5 pr-4 text-left text-label-sm font-medium text-muted-foreground last:pr-0"
                  >
                    {column}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {events.map((event) => {
              const expanded = expandedId === event.id;
              return (
                <React.Fragment key={event.id}>
                  <tr
                    className={`transition-colors ${
                      event.status === 'Active'
                        ? 'bg-danger/5 hover:bg-danger/10'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {event.id}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-tabular text-xs font-semibold text-foreground">
                        {event.time}
                      </p>
                      <p className="font-tabular text-xs text-muted-foreground">
                        {event.day}, {event.date}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium capitalize text-foreground">
                      {event.sensor === 'none' ? 'None' : event.sensor}
                    </td>
                    <td
                      className={`py-3 pr-4 font-tabular text-xs font-bold ${
                        event.status === 'Active' ? 'text-danger' : 'text-foreground'
                      }`}
                    >
                      {event.reading}
                    </td>
                    <td className="py-3 pr-4 text-xs text-foreground/80">
                      {event.type === 'Normal' ? 'Normal' : anomalyTypeLabel(event.raw_type)}
                    </td>
                    <td className="py-3 pr-4">
                      <SeverityBadge severity={event.severity} />
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => toggle(event.id)}
                        aria-expanded={expanded}
                        aria-controls={`event-detail-${event.id}`}
                        aria-label={`${expanded ? 'Hide' : 'Show'} details for ${event.id}`}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr id={`event-detail-${event.id}`}>
                      <td colSpan={8} className="px-4 pb-4 pt-1">
                        <EventDetails
                          event={event}
                          onResolve={onResolve}
                          resolving={isResolving(event.id)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="space-y-3 md:hidden">
        {events.map((event) => {
          const expanded = expandedId === event.id;
          return (
            <li
              key={event.id}
              className={`rounded-xl border p-4 ${
                event.status === 'Active'
                  ? 'border-danger/40 bg-danger/5'
                  : 'border-border bg-muted/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {event.id}
                    </span>
                    <SeverityBadge severity={event.severity} />
                    <StatusBadge status={event.status} />
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">
                    {event.type === 'Normal' ? 'Normal reading' : anomalyTypeLabel(event.raw_type)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {event.day}, {event.date} · {event.time} UTC
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(event.id)}
                  aria-expanded={expanded}
                  aria-controls={`event-detail-mobile-${event.id}`}
                  aria-label={`${expanded ? 'Hide' : 'Show'} details for ${event.id}`}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Sensor</dt>
                  <dd className="font-medium capitalize text-foreground">
                    {event.sensor === 'none' ? 'None' : event.sensor}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reading</dt>
                  <dd className="font-tabular font-semibold text-foreground">{event.reading}</dd>
                </div>
              </dl>

              {expanded && (
                <div id={`event-detail-mobile-${event.id}`} className="mt-3">
                  <EventDetails
                    event={event}
                    onResolve={onResolve}
                    resolving={isResolving(event.id)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

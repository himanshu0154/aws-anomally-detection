import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Brain, CheckCircle2, Wrench } from 'lucide-react';
import type { AnomalyEvent } from '@/types/skyguard';
import {
  STATUS_CLASS,
  anomalyTypeLabel,
  correctedValueFor,
  observedRawValue,
  sensorLabel,
  severityLabel,
} from '@/lib/anomaly';

export function urgencyClass(urgency: string): string {
  const value = urgency.toLowerCase();
  if (value.includes('immediate')) return 'status-critical';
  if (value.includes('hour') || value.includes('minute')) return 'status-warning';
  return 'status-normal';
}

/**
 * Why the model flagged this event. Built only from the stored event, so an older
 * anomaly keeps the reasoning it was detected with.
 */
function buildWhyPoints(event: AnomalyEvent): string[] {
  const points: string[] = [];
  if (event.explanation) points.push(event.explanation);

  if (event.raw_type === 'temperature_spike') {
    points.push(
      'Humidity and pressure remain within normal bounds — which points to a localised sensor fault rather than a genuine weather event.'
    );
  }
  if (event.raw_type === 'communication_error') {
    points.push('At least one sensor reported no value for this reading.');
  }
  if (event.anomaly_score != null) {
    points.push(`Model confidence at detection time: ${Math.round(event.anomaly_score)}%.`);
  }
  if (event.sensor && event.sensor !== 'none') {
    points.push(`Primary affected sensor: ${sensorLabel(event.sensor)}.`);
  }
  return points;
}

/** Explanation, corrected value and recommended actions for one stored event. */
export function ExplanationBody({
  event,
  maxRecommendations,
  showCorrectedValue = true,
}: {
  event: AnomalyEvent;
  maxRecommendations?: number;
  showCorrectedValue?: boolean;
}) {
  const corrected = correctedValueFor(event);
  const observed = observedRawValue(event);
  const recommendations = maxRecommendations
    ? event.recommendations.slice(0, maxRecommendations)
    : event.recommendations;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
        <div className="flex items-start gap-2">
          <Brain size={16} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="mb-1.5 text-xs font-semibold text-primary">Why the AI flagged this</p>
            <ul className="space-y-1.5">
              {buildWhyPoints(event).map((point, index) => (
                <li
                  key={`why-${event.id}-${index}`}
                  className="flex items-start gap-1.5 text-xs text-foreground/80"
                >
                  <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-primary" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {showCorrectedValue && corrected && (
        <div className="flex items-start gap-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="text-xs font-semibold text-accent">Estimated corrected value</p>
            <p className="mt-0.5 text-xs text-foreground/70">
              Based on the rolling 24-reading pattern, the expected value for this event is
              approximately{' '}
              <span className="font-tabular font-bold text-accent">
                ~{corrected.value.toFixed(1)} {corrected.unit}
              </span>
              {observed && (
                <>
                  , while the sensor reported{' '}
                  <span className="font-tabular font-bold text-danger">
                    {observed.value.toFixed(1)} {observed.unit}
                  </span>
                  .
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div>
          <p className="text-label-sm mb-2.5 text-muted-foreground">Recommended actions</p>
          <div className="space-y-2">
            {recommendations.map((recommendation) => (
              <div
                key={`rec-${event.id}-${recommendation.priority}`}
                className="group flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {recommendation.priority}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-foreground">{recommendation.action}</p>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${urgencyClass(
                        recommendation.urgency
                      )}`}
                    >
                      {recommendation.urgency}
                    </span>
                  </div>
                </div>
                <Wrench
                  size={13}
                  className="mt-0.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard summary: the newest anomaly that no operator has resolved yet.
 * The full list lives on /explanations.
 */
export default function ExplanationRecommendation({ event }: { event: AnomalyEvent | null }) {
  return (
    <div className="card-elevated flex h-full flex-col p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Explanation &amp; Recommendations
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Latest unresolved anomaly from the session log
          </p>
        </div>
        <Link
          href="/explanations"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View all
          <ArrowRight size={12} />
        </Link>
      </div>

      {event ? (
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
              {event.id}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {anomalyTypeLabel(event.raw_type)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                STATUS_CLASS[event.status]
              }`}
            >
              {event.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {severityLabel(event.severity)} severity · {event.day} {event.date} {event.time} UTC
            </span>
          </div>
          <ExplanationBody event={event} maxRecommendations={2} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
          <CheckCircle2 size={22} className="text-positive" />
          <p className="text-sm font-semibold text-foreground">No unresolved anomalies</p>
          <p className="text-xs text-muted-foreground">
            Every detected anomaly has been reviewed and resolved by an operator.
          </p>
        </div>
      )}
    </div>
  );
}

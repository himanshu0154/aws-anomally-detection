'use client';

import React, { useState } from 'react';
import { GitMerge, Snowflake, TrendingUp, WifiOff, Zap } from 'lucide-react';
import type { RootCauseProbabilities } from '@/types/skyguard';
import { anomalyTypeLabel } from '@/lib/anomaly';

export type RootCauseKey =
  'spike' | 'frozen' | 'drift' | 'communication_error' | 'multivariate_inconsistency';

export interface RootCauseDefinition {
  key: RootCauseKey;
  label: string;
  icon: React.ElementType;
  description: string;
  /** How this hypothesis is actually signalled by api/main.py — no invented classifier. */
  signal: string;
  color: string;
  barColor: string;
  activeWrapper: string;
}

/**
 * Single catalogue of root-cause classes, shared by the dashboard card and the
 * Root-Cause Classification page.
 *
 * The `signal` text states what the backend really does: `drift` has no dedicated
 * signal and therefore never rises above its baseline share. It is listed because
 * operators need to know it is monitored-but-unsignalled, not because a drift
 * classifier exists.
 */
export const ROOT_CAUSES: RootCauseDefinition[] = [
  {
    key: 'spike',
    label: 'Sudden Spike',
    icon: Zap,
    description:
      'A single reading jumps far beyond the behaviour of the rolling 24-reading window.',
    signal:
      'Raised by the temperature step rule: |ΔT| > 8 °C sets the spike share from the size of the step.',
    color: 'text-danger',
    barColor: 'bg-danger',
    activeWrapper: 'border-danger/50 bg-danger/5',
  },
  {
    key: 'frozen',
    label: 'Frozen Sensor',
    icon: Snowflake,
    description: 'The sensor reports almost the same value for many consecutive readings.',
    signal:
      'Raised when the standard deviation of the last 6 temperatures falls below 0.05 °C, which is also the rule the detector uses to flag a frozen sensor.',
    color: 'text-primary',
    barColor: 'bg-primary',
    activeWrapper: 'border-primary/50 bg-primary/5',
  },
  {
    key: 'drift',
    label: 'Sensor Drift',
    icon: TrendingUp,
    description: 'A slow, systematic deviation from the expected baseline over time.',
    signal:
      'No dedicated signal in the current pipeline — drift keeps its low baseline share and is never boosted. Longer-horizon trend analysis is the next step for this class.',
    color: 'text-warning',
    barColor: 'bg-warning',
    activeWrapper: 'border-warning/50 bg-warning/5',
  },
  {
    key: 'communication_error',
    label: 'Communication Error',
    icon: WifiOff,
    description: 'A sensor value is missing for the reading, so the datalogger link failed.',
    signal:
      'Set to 85% whenever any of T2M, RH2M or PS is missing — the same condition the detector reports as a communication error.',
    color: 'text-muted-foreground',
    barColor: 'bg-muted-foreground',
    activeWrapper: 'border-border bg-muted/30',
  },
  {
    key: 'multivariate_inconsistency',
    label: 'Multivariate Inconsistency',
    icon: GitMerge,
    description:
      'Each sensor looks plausible on its own, but their combination breaks the learned cross-sensor relationship.',
    signal:
      'Raised for multivariate and Isolation Forest detections, which are the cases where no single-sensor rule fires.',
    color: 'text-accent',
    barColor: 'bg-accent',
    activeWrapper: 'border-accent/50 bg-accent/5',
  },
];

/** Detector type -> root-cause key. The backend applies the same mapping. */
export const TYPE_TO_CAUSE: Record<string, RootCauseKey> = {
  temperature_spike: 'spike',
  temperature_frozen: 'frozen',
  multivariate_inconsistency: 'multivariate_inconsistency',
  ml_anomaly: 'multivariate_inconsistency',
  communication_error: 'communication_error',
};

export function flaggedCauseKey(detectedType: string): RootCauseKey | null {
  if (!detectedType || detectedType === 'normal') return null;
  return TYPE_TO_CAUSE[detectedType] ?? null;
}

interface RootCauseBreakdownProps {
  probabilities: RootCauseProbabilities;
  detectedType: string;
  /** `full` adds the selected-cause detail panel; `compact` is the dashboard card body. */
  variant?: 'compact' | 'full';
  /** Timestamp/context line shown above the bars. */
  context?: string;
}

/** Probability bars with one shared owner of the "selected cause" state. */
export function RootCauseBreakdown({
  probabilities,
  detectedType,
  variant = 'compact',
  context,
}: RootCauseBreakdownProps) {
  const flaggedKey = flaggedCauseKey(detectedType);
  const [selected, setSelected] = useState<RootCauseKey>(flaggedKey ?? 'spike');
  const selectedCause = ROOT_CAUSES.find((cause) => cause.key === selected) ?? ROOT_CAUSES[0];

  return (
    <div>
      {context && <p className="mb-3 text-xs text-muted-foreground">{context}</p>}

      <div className="space-y-2.5">
        {ROOT_CAUSES.map((cause) => {
          const CauseIcon = cause.icon;
          const isSelected = selected === cause.key;
          const probability = probabilities?.[cause.key] ?? 0;
          const isFlagged = flaggedKey === cause.key;

          return (
            <button
              key={cause.key}
              type="button"
              onClick={() => setSelected(cause.key)}
              aria-pressed={isSelected}
              className={`w-full rounded-lg border p-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected ? cause.activeWrapper : 'border-border/50 bg-muted/20 hover:bg-muted/40'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <CauseIcon
                    size={14}
                    className={isSelected ? cause.color : 'text-muted-foreground'}
                  />
                  <span
                    className={`truncate text-xs font-semibold ${
                      isSelected ? cause.color : 'text-foreground/80'
                    }`}
                  >
                    {cause.label}
                  </span>
                  {isFlagged && (
                    <span className="rounded-full status-critical px-1.5 py-0.5 text-xs font-bold">
                      FLAGGED
                    </span>
                  )}
                </div>
                <span
                  className={`font-tabular text-xs font-bold ${
                    isSelected ? cause.color : 'text-muted-foreground'
                  }`}
                >
                  {probability}%
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${cause.label}: ${probability} percent`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cause.barColor}`}
                  style={{ width: `${probability}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {variant === 'full' && (
        <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-label-sm mb-1 text-muted-foreground">{selectedCause.label}</p>
          <p className="text-xs leading-relaxed text-foreground/80">{selectedCause.description}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground/70">Signal: </span>
            {selectedCause.signal}
          </p>
        </div>
      )}

      <p className="mt-3 text-xs italic text-muted-foreground/70">
        These shares are a heuristic weighting of detector signals computed per reading — not a
        second trained classifier, and not calibrated probabilities.
      </p>
    </div>
  );
}

/** Dashboard card: current root-cause shares for the latest reading. */
export default function RootCauseClassification({
  probabilities,
  detectedType,
}: {
  probabilities: RootCauseProbabilities;
  detectedType: string;
}) {
  return (
    <div className="card-elevated flex h-full flex-col p-5">
      <h2 className="mb-1 text-base font-semibold text-foreground">Root-Cause Classification</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Heuristic share per fault hypothesis for the current reading
        {detectedType && detectedType !== 'normal' && <> · {anomalyTypeLabel(detectedType)}</>}
      </p>
      <RootCauseBreakdown probabilities={probabilities} detectedType={detectedType} />
    </div>
  );
}

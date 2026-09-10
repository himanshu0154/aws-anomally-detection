'use client';
import React, { useState } from 'react';
import { Zap, Snowflake, TrendingUp, WifiOff, GitMerge } from 'lucide-react';
import type { RootCauseProbabilities } from '@/hooks/useLiveDashboardData';

interface RootCauseClassificationProps {
  probabilities: RootCauseProbabilities;
  detectedType: string;
}

const CAUSE_CONFIG = [
  {
    key: 'spike' as const,
    label: 'Sudden Spike',
    icon: Zap,
    description: 'Abrupt single-reading jump beyond learned threshold of the 24h rolling window.',
    color: 'text-danger',
    barColor: 'bg-danger',
    borderActive: 'border-danger/50 bg-danger/8',
  },
  {
    key: 'frozen' as const,
    label: 'Frozen Sensor',
    icon: Snowflake,
    description: 'Sensor output stuck at a constant value for multiple consecutive readings.',
    color: 'text-primary',
    barColor: 'bg-primary',
    borderActive: 'border-primary/50 bg-primary/8',
  },
  {
    key: 'drift' as const,
    label: 'Sensor Drift',
    icon: TrendingUp,
    description: 'Gradual systematic deviation from expected baseline over time.',
    color: 'text-warning',
    barColor: 'bg-warning',
    borderActive: 'border-warning/50 bg-warning/8',
  },
  {
    key: 'communication_error' as const,
    label: 'Communication Error',
    icon: WifiOff,
    description: 'Data corruption or packet loss during transmission from sensor node.',
    color: 'text-muted-foreground',
    barColor: 'bg-muted-foreground',
    borderActive: 'border-border bg-muted/30',
  },
  {
    key: 'multivariate_inconsistency' as const,
    label: 'Multivariate Inconsistency',
    icon: GitMerge,
    description: 'Cross-sensor correlation violated — e.g. temperature spike without matching humidity drop.',
    color: 'text-accent',
    barColor: 'bg-accent',
    borderActive: 'border-accent/50 bg-accent/8',
  },
];

// Map detector types to the cause keys
const TYPE_TO_KEY: Record<string, string> = {
  temperature_spike: 'spike',
  temperature_frozen: 'frozen',
  multivariate_inconsistency: 'multivariate_inconsistency',
  ml_anomaly: 'multivariate_inconsistency',
  communication_error: 'communication_error',
};

export default function RootCauseClassification({ probabilities, detectedType }: RootCauseClassificationProps) {
  const [selected, setSelected] = useState<string>('spike');
  const flaggedKey = TYPE_TO_KEY[detectedType] || detectedType;

  const selectedCause = CAUSE_CONFIG.find(c => c.key === selected);

  return (
    <div className="card-elevated p-5">
      <h2 className="text-base font-semibold text-foreground mb-1">Root-Cause Classification</h2>
      <p className="text-xs text-muted-foreground mb-4">AI-ranked probability for each fault hypothesis</p>
      <div className="space-y-2.5 mb-4">
        {CAUSE_CONFIG.map((cause) => {
          const CauseIcon = cause.icon;
          const isSelected = selected === cause.key;
          const prob = probabilities[cause.key] || 0;
          const isActive = flaggedKey === cause.key && detectedType !== 'normal';
          return (
            <button
              key={cause.key}
              onClick={() => setSelected(cause.key)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ${
                isSelected
                  ? cause.borderActive
                  : 'border-border/50 bg-muted/20 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <CauseIcon size={14} className={isSelected ? cause.color : 'text-muted-foreground'} />
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? cause.color : 'text-foreground/80'
                    }`}
                  >
                    {cause.label}
                  </span>
                  {isActive && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full status-critical font-bold">
                      FLAGGED
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-bold font-tabular ${
                    isSelected ? cause.color : 'text-muted-foreground'
                  }`}
                >
                  {prob}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cause.barColor}`}
                  style={{ width: `${prob}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
      {/* Heuristic note */}
      <p className="text-xs text-muted-foreground/60 mb-3 italic">
        Note: probabilities are a heuristic visualization aid derived from detector signals — not a second classifier.
      </p>
      {/* Selected cause description */}
      {selectedCause && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
          <p className="text-label-sm text-muted-foreground mb-1">{selectedCause.label}</p>
          <p className="text-xs text-foreground/80 leading-relaxed">{selectedCause.description}</p>
        </div>
      )}
    </div>
  );
}

'use client';
import React, { useState } from 'react';
import { Zap, Snowflake, TrendingUp, WifiOff, GitMerge } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const causes = [
  {
    id: 'cause-spike',
    label: 'Sudden Spike',
    icon: Zap,
    probability: 78,
    description: 'Abrupt single-reading jump beyond 3σ of the 24h rolling window.',
    active: true,
    color: 'text-danger',
    barColor: 'bg-danger',
    borderActive: 'border-danger/50 bg-danger/8',
  },
  {
    id: 'cause-frozen',
    label: 'Frozen Sensor',
    icon: Snowflake,
    probability: 6,
    description: 'Sensor output stuck at a constant value for multiple consecutive readings.',
    active: false,
    color: 'text-primary',
    barColor: 'bg-primary',
    borderActive: 'border-primary/50 bg-primary/8',
  },
  {
    id: 'cause-drift',
    label: 'Sensor Drift',
    icon: TrendingUp,
    probability: 9,
    description: 'Gradual systematic deviation from expected baseline over time.',
    active: false,
    color: 'text-warning',
    barColor: 'bg-warning',
    borderActive: 'border-warning/50 bg-warning/8',
  },
  {
    id: 'cause-comms',
    label: 'Communication Error',
    icon: WifiOff,
    probability: 4,
    description: 'Data corruption or packet loss during transmission from sensor node.',
    active: false,
    color: 'text-muted-foreground',
    barColor: 'bg-muted-foreground',
    borderActive: 'border-border bg-muted/30',
  },
  {
    id: 'cause-multivariate',
    label: 'Multivariate Inconsistency',
    icon: GitMerge,
    probability: 3,
    description: 'Cross-sensor correlation violated — e.g. temperature spike without matching humidity drop.',
    active: false,
    color: 'text-accent',
    barColor: 'bg-accent',
    borderActive: 'border-accent/50 bg-accent/8',
  },
];

export default function RootCauseClassification() {
  const [selected, setSelected] = useState<string>('cause-spike');

  const selectedCause = causes?.find((c) => c?.id === selected);

  return (
    <div className="card-elevated p-5">
      <h2 className="text-base font-semibold text-foreground mb-1">Root-Cause Classification</h2>
      <p className="text-xs text-muted-foreground mb-4">AI-ranked probability for each fault hypothesis</p>
      <div className="space-y-2.5 mb-4">
        {causes?.map((cause) => {
          const Icon = cause?.icon;
          const isSelected = selected === cause?.id;
          return (
            <button
              key={cause?.id}
              onClick={() => setSelected(cause?.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ${
                isSelected
                  ? cause?.borderActive
                  : 'border-border/50 bg-muted/20 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon size={14} className={isSelected ? cause?.color : 'text-muted-foreground'} />
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? cause?.color : 'text-foreground/80'
                    }`}
                  >
                    {cause?.label}
                  </span>
                  {cause?.active && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full status-critical font-bold">
                      FLAGGED
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-bold font-tabular ${
                    isSelected ? cause?.color : 'text-muted-foreground'
                  }`}
                >
                  {cause?.probability}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cause?.barColor}`}
                  style={{ width: `${cause?.probability}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
      {/* Selected cause description */}
      {selectedCause && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
          <p className="text-label-sm text-muted-foreground mb-1">{selectedCause?.label}</p>
          <p className="text-xs text-foreground/80 leading-relaxed">{selectedCause?.description}</p>
        </div>
      )}
    </div>
  );
}
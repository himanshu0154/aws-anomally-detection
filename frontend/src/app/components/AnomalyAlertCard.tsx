'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Brain,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function AnomalyAlertCard() {
  const [expanded, setExpanded] = useState(true);

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

              <span className="px-2 py-0.5 rounded-full bg-danger text-white text-xs font-bold uppercase tracking-wide">
                HIGH
              </span>

              <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-xs font-semibold text-muted-foreground">
                LIVE
              </span>
            </div>

            <p className="text-xs text-danger/70 mt-0.5">
              Detected at 10:16:35 UTC — AWS-MH-042
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
              <p className="text-sm font-semibold text-foreground">
                Temperature
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
                  Sudden Spike
                </p>
              </div>
            </div>

            {/* Reading */}
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground">Reading</p>
              <p className="text-sm font-bold text-danger font-tabular">
                52.4 °C
              </p>
            </div>

            {/* Severity */}
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground">Severity</p>

              <span className="inline-flex px-2 py-0.5 rounded-full status-critical text-xs font-bold uppercase">
                High
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
                  94%
                </p>
              </div>

              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: '94%' }}
                />
              </div>
            </div>

            {/* Estimated Correct */}
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground">
                Est. True Value
              </p>

              <p className="text-sm font-semibold text-accent font-tabular">
                ~33.7 °C
              </p>
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border/60">
            <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
              AI Reasoning
            </p>

            <p className="text-sm text-foreground leading-relaxed">
              Temperature changed too quickly compared with recent 24-hour
              behaviour. A rise of{' '}
              <span className="text-danger font-semibold">
                +18.7 °C in under 4 minutes
              </span>{' '}
              exceeds the 3σ threshold of the learned daily temperature
              envelope. Cross-sensor validation shows humidity and pressure
              remain within normal bounds, indicating a{' '}
              <span className="text-warning font-semibold">
                localised sensor fault
              </span>{' '}
              rather than a genuine meteorological event.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
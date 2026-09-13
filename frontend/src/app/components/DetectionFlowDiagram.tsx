import React from 'react';
import Link from 'next/link';
import { ArrowRight, BellRing, Brain, ChevronRight, Cpu, Radio, Search } from 'lucide-react';

interface DetectionFlowDiagramProps {
  isWarmingUp: boolean;
  inferenceLatency: number | null;
}

export default function DetectionFlowDiagram({
  isWarmingUp,
  inferenceLatency,
}: DetectionFlowDiagramProps) {
  const steps = [
    {
      id: 'flow-sensor',
      icon: Radio,
      label: 'Sensor Data',
      sublabel: 'T2M · RH2M · PS',
      color: 'text-accent',
      bg: 'bg-accent/10 border-accent/30',
    },
    {
      id: 'flow-processing',
      icon: Cpu,
      label: 'Feature Build',
      sublabel: 'Diffs + rolling',
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/30',
    },
    {
      id: 'flow-model',
      icon: Brain,
      label: 'AI/ML Model',
      sublabel: 'Isolation Forest',
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/30',
    },
    {
      id: 'flow-detection',
      icon: Search,
      label: 'Detection',
      sublabel: 'Rules + residuals',
      color: 'text-warning',
      bg: 'bg-warning/10 border-warning/30',
    },
    {
      id: 'flow-alert',
      icon: BellRing,
      label: 'Alert Issued',
      sublabel: isWarmingUp ? 'Warming up' : 'Monitoring',
      color: isWarmingUp ? 'text-accent' : 'text-danger',
      bg: isWarmingUp ? 'bg-accent/10 border-accent/30' : 'bg-danger/10 border-danger/40',
    },
  ];

  return (
    <div className="card-elevated flex h-full flex-col p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">AI/ML Detection Pipeline</h2>
          <p className="mt-1 text-xs text-muted-foreground">Real-time inference path</p>
        </div>
        <Link
          href="/how-model-works"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          How it works
          <ArrowRight size={12} />
        </Link>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-2">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isLast = index === steps.length - 1;
          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex min-w-[92px] flex-col items-center gap-2 ${isLast ? 'anomaly-pulse' : ''}`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border ${step.bg}`}
                >
                  <StepIcon size={20} className={step.color} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold leading-tight text-foreground">
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.sublabel}</p>
                </div>
              </div>
              {!isLast && (
                <ChevronRight size={18} className="mx-1 shrink-0 text-muted-foreground" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
        <div>
          <p className="text-label-sm text-muted-foreground">Algorithm</p>
          <p className="mt-0.5 text-xs font-semibold text-foreground">
            Isolation Forest + Per-Sensor Residual Regressors
          </p>
        </div>
        <div>
          <p className="text-label-sm text-muted-foreground">Context window</p>
          <p className="mt-0.5 text-xs font-semibold text-foreground">24 readings</p>
        </div>
        <div>
          <p className="text-label-sm text-muted-foreground">Inference latency</p>
          <p className="mt-0.5 font-tabular text-xs font-semibold text-accent">
            {inferenceLatency != null ? `${inferenceLatency} ms (session mean)` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Radio, Cpu, Brain, Search, BellRing, ChevronRight } from 'lucide-react';

interface DetectionFlowDiagramProps {
  isWarmingUp: boolean;
  inferenceLatency: number | null;
}

export default function DetectionFlowDiagram({ isWarmingUp, inferenceLatency }: DetectionFlowDiagramProps) {
  const steps = [
    {
      id: 'flow-sensor',
      icon: Radio,
      label: 'Sensor Data',
      sublabel: 'Hourly readings',
      status: isWarmingUp ? 'done' : 'done',
      color: 'text-accent',
      bg: 'bg-accent/10 border-accent/30',
    },
    {
      id: 'flow-processing',
      icon: Cpu,
      label: 'Data Processing',
      sublabel: 'Normalise + QC',
      status: 'done',
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/30',
    },
    {
      id: 'flow-model',
      icon: Brain,
      label: 'AI/ML Model',
      sublabel: 'IF + Residual',
      status: 'done',
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/30',
    },
    {
      id: 'flow-detection',
      icon: Search,
      label: 'Anomaly Detection',
      sublabel: 'Learned thresholds',
      status: 'done',
      color: 'text-warning',
      bg: 'bg-warning/10 border-warning/30',
    },
    {
      id: 'flow-alert',
      icon: BellRing,
      label: 'Alert Issued',
      sublabel: isWarmingUp ? 'Warming up' : 'Monitoring',
      status: isWarmingUp ? 'done' : 'active',
      color: isWarmingUp ? 'text-accent' : 'text-danger',
      bg: isWarmingUp ? 'bg-accent/10 border-accent/30' : 'bg-danger/10 border-danger/40',
    },
  ];

  return (
    <div className="card-elevated p-5 h-full">
      <h2 className="text-base font-semibold text-foreground mb-1">AI/ML Detection Pipeline</h2>
      <p className="text-xs text-muted-foreground mb-5">Real-time inference path</p>
      {/* Horizontal flow */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-2">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isLast = idx === steps.length - 1;
          return (
            <React.Fragment key={step.id}>
              <div className={`flex flex-col items-center gap-2 min-w-[96px] ${isLast && !isWarmingUp ? 'anomaly-pulse' : ''}`}>
                <div
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center ${step.bg}`}
                >
                  <StepIcon size={20} className={step.color} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-foreground leading-tight">{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.sublabel}</p>
                </div>
                {step.status === 'done' && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full status-healthy">✓ Done</span>
                )}
                {step.status === 'active' && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full status-critical font-bold">ACTIVE</span>
                )}
              </div>
              {!isLast && (
                <ChevronRight size={18} className="text-muted-foreground shrink-0 mx-1" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Model info footer */}
      <div className="mt-5 pt-4 border-t border-border grid grid-cols-3 gap-3">
        <div>
          <p className="text-label-sm text-muted-foreground">Algorithm</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">Isolation Forest + Per-Sensor Residual Regressors</p>
        </div>
        <div>
          <p className="text-label-sm text-muted-foreground">Training Window</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">24-hour rolling</p>
        </div>
        <div>
          <p className="text-label-sm text-muted-foreground">Inference Latency</p>
          <p className="text-xs font-semibold text-accent font-tabular mt-0.5">
            {inferenceLatency != null ? `${inferenceLatency} ms` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

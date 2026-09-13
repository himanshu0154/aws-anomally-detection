import React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { GlowEffect } from '@/components/ui/glow-effect';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';

export function LoadingBlock({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      {/*
        The first fetch is the app's longest wait — it holds the whole dashboard —
        so its label carries the rolling wave rather than the flat sweep. The
        skeletons beside it stay a plain pulse: two motions of different kinds in
        one block would read as two unrelated states.
      */}
      <p className="text-xs text-muted-foreground">
        <TextShimmerWave
          baseColor="var(--muted-foreground)"
          highlightColor="var(--primary)"
          duration={1}
          spread={0.05}
        >
          {label}
        </TextShimmerWave>
      </p>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-lg bg-muted/50" />
      ))}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-danger">
            Unable to connect to SkyGuard AI backend
          </p>
          <p className="mt-1 text-xs text-foreground/70">{message}</p>
        </div>
        {onRetry && (
          /*
            Retry is the one control on a degraded screen that resolves anything,
            so it is the app's single home for the glow: the halo marks the action
            that clears the state the banner is complaining about. It lives on this
            block, which every route renders, so it is present app-wide — and it
            disappears with the error, because a screen with nothing broken has no
            action that needs pointing at. The wrapper owns the radius (the halo
            inherits it) and the button paints after it, so the halo only ever
            reads as a bleed around the button's edges.
          */
          <div className="relative shrink-0 rounded-lg">
            <GlowEffect
              colors={['var(--danger)', 'var(--warning)', 'var(--primary)']}
              mode="colorShift"
              blur="soft"
              duration={3}
              scale={0.92}
              opacity={0.8}
            />
            <button
              type="button"
              onClick={onRetry}
              className="relative inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyBlock({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
      <Inbox size={26} className="text-muted-foreground" />
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      </div>
      {action}
    </div>
  );
}

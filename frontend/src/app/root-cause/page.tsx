'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, GitMerge, Info, Target } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  ROOT_CAUSES,
  RootCauseBreakdown,
  flaggedCauseKey,
} from '../components/RootCauseClassification';
import { EmptyBlock, LoadingBlock } from '../components/StateFeedback';
import { useLiveDashboardData } from '@/hooks/useLiveDashboardData';
import { anomalyTypeLabel, latestUnresolved } from '@/lib/anomaly';

export default function RootCausePage() {
  const { live, history, loading } = useLiveDashboardData();
  const currentKey = flaggedCauseKey(live.anomaly_type);
  const latestOpen = useMemo(() => latestUnresolved(history) ?? null, [history]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Root-Cause Classification"
        subtitle="The detector answers whether a reading is anomalous. This page answers why — ranking the fault hypotheses behind the current reading and the most recent unresolved event."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Root-Cause Classification' }]}
        actions={
          <Link
            href="/explanations"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Explanation queue
            <ArrowRight size={13} />
          </Link>
        }
      />

      {loading && !live.timestamp ? (
        <LoadingBlock label="Loading current root-cause shares…" rows={3} />
      ) : (
        <>
          {/* Current reading */}
          <section aria-labelledby="current-shares" className="card-elevated p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target size={17} className="text-primary" />
                <div>
                  <h2 id="current-shares" className="text-base font-semibold text-foreground">
                    Current reading
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Shares computed from the detector signals for the latest reading
                  </p>
                </div>
              </div>
              {live.anomaly_status === 'anomaly' ? (
                <span className="flex items-center gap-1.5 rounded-full status-critical px-2.5 py-1 text-xs font-semibold">
                  <AlertTriangle size={12} />
                  CURRENT DETECTION · {anomalyTypeLabel(live.anomaly_type)}
                </span>
              ) : (
                <span className="rounded-full status-healthy px-2.5 py-1 text-xs font-semibold">
                  No current anomaly
                </span>
              )}
            </div>

            <RootCauseBreakdown
              probabilities={live.root_cause_probabilities}
              detectedType={live.anomaly_type}
              variant="full"
              context={
                live.anomaly_status === 'anomaly'
                  ? `The detector currently reports ${anomalyTypeLabel(live.anomaly_type)} with ${
                      live.anomaly_score != null ? `${Math.round(live.anomaly_score)}%` : 'unscored'
                    } confidence.`
                  : 'The latest reading is normal, so the shares below are the baseline the heuristic produces when no signal fires. A flagged cause appears only while something is detected.'
              }
            />
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Latest unresolved event, with its stored shares */}
            <section aria-labelledby="latest-event-shares" className="card-elevated p-5">
              <h2 id="latest-event-shares" className="text-base font-semibold text-foreground">
                Latest unresolved event
              </h2>
              <p className="mb-4 mt-1 text-xs text-muted-foreground">
                Shares are frozen inside the event when it is stored, so this is what the model
                thought at detection time — not a recomputation from the current reading.
              </p>
              {latestOpen ? (
                <>
                  <RootCauseBreakdown
                    probabilities={
                      latestOpen.root_cause_probabilities ?? live.root_cause_probabilities
                    }
                    detectedType={latestOpen.raw_type}
                    variant="full"
                    context={`${latestOpen.id} · ${anomalyTypeLabel(latestOpen.raw_type)} · ${
                      latestOpen.day
                    } ${latestOpen.date} ${latestOpen.time} UTC`}
                  />
                  <Link
                    href="/explanations"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
                  >
                    Open this event in the explanation queue
                    <ArrowRight size={12} />
                  </Link>
                </>
              ) : (
                <EmptyBlock
                  title="No unresolved anomalies"
                  message="Every detected anomaly has been resolved. Historical shares stay available in Anomaly History."
                  action={
                    <Link
                      href="/history"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Open Anomaly History
                    </Link>
                  }
                />
              )}
            </section>

            {/* Methodology */}
            <section aria-labelledby="methodology" className="card-elevated p-5">
              <div className="mb-3 flex items-center gap-2">
                <GitMerge size={17} className="text-accent" />
                <h2 id="methodology" className="text-base font-semibold text-foreground">
                  How these shares are produced
                </h2>
              </div>
              <ol className="space-y-3">
                {[
                  'Every hypothesis starts from a low baseline share.',
                  'Detector signals raise specific shares: the size of a temperature step raises spike, near-zero variance over six readings raises frozen, and any missing sensor value pins communication error at 85%.',
                  'The type the detector actually reported is lifted above every other share, so this ranking can never contradict the detection itself.',
                  'Shares are normalised to add up to 100% for display.',
                ].map((line, index) => (
                  <li key={line} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="text-xs leading-relaxed text-foreground/80">{line}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-4 rounded-lg border border-warning/40 bg-warning/5 p-3">
                <div className="flex items-start gap-2">
                  <Info size={14} className="mt-0.5 shrink-0 text-warning" />
                  <p className="text-xs leading-relaxed text-foreground/80">
                    <span className="font-semibold text-warning">
                      Read this as a ranking, not a probability.
                    </span>{' '}
                    These shares are a heuristic weighting of signals the detector already produced.
                    They are not the output of a second trained or calibrated classifier.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Class reference */}
          <section aria-labelledby="class-reference">
            <div className="mb-3">
              <h2 id="class-reference" className="text-base font-semibold text-foreground">
                Root-cause classes
              </h2>
              {/*
                `text-foreground`: this section is not a card, so the caption sits
                directly on the blue sky, where only the foreground token clears AA.
              */}
              <p className="mt-1 text-xs text-foreground">
                What each hypothesis means, and which signal in the pipeline can raise it.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ROOT_CAUSES.map((cause) => {
                const Icon = cause.icon;
                const isFlagged = currentKey === cause.key;
                return (
                  <article
                    key={cause.key}
                    className={`card-elevated flex h-full flex-col p-4 ${
                      isFlagged ? 'border-danger/40' : ''
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={cause.color} />
                        <h3 className="text-sm font-semibold text-foreground">{cause.label}</h3>
                      </div>
                      {isFlagged && (
                        <span className="rounded-full status-critical px-2 py-0.5 text-xs font-bold">
                          FLAGGED
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-foreground/80">
                      {cause.description}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground/70">Signal: </span>
                      {cause.signal}
                    </p>
                    <p className="mt-auto pt-3 font-tabular text-xs font-semibold text-muted-foreground">
                      Current share: {live.root_cause_probabilities[cause.key] ?? 0}%
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import { useLiveDashboardData } from '@/hooks/useLiveDashboardData';
import { countByStatus, latestUnresolved, sortForExplanations } from '@/lib/anomaly';
import AnomalyAlertCard from './components/AnomalyAlertCard';
import DetectionFlowDiagram from './components/DetectionFlowDiagram';
import ExplanationRecommendation from './components/ExplanationRecommendation';
import QuickLinks from './components/QuickLinks';
import RootCauseClassification from './components/RootCauseClassification';
import SensorChartSection from './components/SensorChartSection';
import SensorHealthCards from './components/SensorHealthCard';
import SensorReadingsRow from './components/SensorReadingsRow';
import StationStatusBanner from './components/StationStatusBanner';
import PageHeader from './components/PageHeader';
import { LoadingBlock } from './components/StateFeedback';
import { CanvasText } from '@/components/ui/canvas-text';

export default function DashboardPage() {
  const { live, series, history, unresolvedCount, loading, error } = useLiveDashboardData();

  const isWarmingUp = Boolean(live.model_meta && !live.model_meta.fully_warmed_up);
  const warmupProgress = live.model_meta?.readings_in_buffer ?? 0;
  const counts = useMemo(() => countByStatus(history), [history]);
  const unresolvedEvents = useMemo(() => sortForExplanations(history), [history]);
  const latestOpenAnomaly = useMemo(() => latestUnresolved(history) ?? null, [history]);
  const recentAnomalies = history.filter((event) => event.status !== 'Normal').length;

  return (
    <div className="space-y-6">
      {/*
        The lede's promise — live data — carries the inline canvas text: it is the
        one phrase on this screen that is about *now*, and the drifting lines read
        as the data moving. Sized up so the wave strokes have something to cross.
      */}
      <PageHeader
        title="SkyGuard AI"
        subtitle={
          <>
            Operational command centre — what is happening{' '}
            <CanvasText text="right now" className="text-xl font-bold" />, and what needs attention.
          </>
        }
      />

      {isWarmingUp && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/50 bg-accent/5 px-5 py-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          <p className="text-sm font-medium text-accent">
            Warming up model — {warmupProgress}/24 readings collected. Anomaly detection is fully
            calibrated after {Math.max(0, 24 - warmupProgress)} more readings.
          </p>
        </div>
      )}

      {loading && !live.timestamp ? (
        <LoadingBlock label="Connecting to SkyGuard AI backend…" rows={4} />
      ) : (
        <>
          <StationStatusBanner
            overallStatus={live.overall_status}
            sensorHealth={live.sensor_health}
            unresolvedCount={unresolvedCount}
            resolvedCount={counts.Resolved}
          />

          <SensorReadingsRow
            temperature={live.temperature}
            humidity={live.humidity}
            pressure={live.pressure}
            sensorHealth={live.sensor_health}
            timestamp={live.timestamp}
            series={series}
          />

          <AnomalyAlertCard
            live={live}
            isWarmingUp={isWarmingUp}
            unresolvedCount={unresolvedCount}
            resolvedCount={counts.Resolved}
          />

          <SensorChartSection series={series} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <DetectionFlowDiagram
                isWarmingUp={isWarmingUp}
                inferenceLatency={live.model_meta?.inference_latency_ms ?? null}
              />
            </div>
            <div className="lg:col-span-2">
              <SensorHealthCards sensorHealth={live.sensor_health} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RootCauseClassification
              probabilities={live.root_cause_probabilities}
              detectedType={live.anomaly_type}
            />
            <ExplanationRecommendation event={latestOpenAnomaly} />
          </div>

          <section aria-labelledby="session-summary">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="session-summary" className="text-base font-semibold text-foreground">
                  This session
                </h2>
                {/*
                  `text-foreground`, not `text-muted-foreground`: this caption sits
                  directly on the blue sky rather than on a card, and only the
                  foreground token clears AA against the deepest blue.
                */}
                <p className="mt-1 text-xs text-foreground">
                  Latest {history.length} stored records · {counts.Active} active ·{' '}
                  {counts.Resolved} resolved · {counts.Normal} normal
                  {error && ' · showing last known data (backend unreachable)'}
                </p>
              </div>
              <p className="text-xs text-foreground">
                {recentAnomalies} anomalies in the loaded window
              </p>
            </div>
            <QuickLinks
              badges={{
                '/explanations':
                  unresolvedCount > 0
                    ? `${unresolvedCount} to resolve`
                    : `${unresolvedEvents.length} events`,
                '/history': `${history.length} records`,
              }}
            />
          </section>
        </>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { useLiveDashboardData } from '@/hooks/useLiveDashboardData';
import DashboardHeader from './components/DashboardHeader';
import SensorReadingsRow from './components/SensorReadingsRow';
import StationStatusBanner from './components/StationStatusBanner';
import AnomalyAlertCard from './components/AnomalyAlertCard';
import SensorChartSection from './components/SensorChartSection';
import DetectionFlowDiagram from './components/DetectionFlowDiagram';
import SensorHealthCards from './components/SensorHealthCard';
import RootCauseClassification from './components/RootCauseClassification';
import AnomalyHistoryTable from './components/AnomalyHistoryTable';
import ExplanationRecommendation from './components/ExplanationRecommendation';
import { Toaster } from 'sonner';

export default function AWSAnomalyDashboard() {
  const { live, series, history, loading, error } = useLiveDashboardData();

  const isWarmingUp = live.model_meta && !live.model_meta.fully_warmed_up;
  const warmupProgress = live.model_meta ? live.model_meta.readings_in_buffer : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          },
        }}
      />

      {/* Dashboard Header */}
      <DashboardHeader
        stationId={live.station_id || 'AWS-MH-042'}
        lastUpdated={live.timestamp}
        modelName={live.model_meta?.algorithm || 'Isolation Forest + residual regressors'}
      />

      {/* Warm-up banner */}
      {isWarmingUp && (
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16 pt-4">
          <div className="rounded-xl border border-accent/50 bg-accent/5 px-5 py-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <p className="text-sm text-accent font-medium">
              Warming up model — {warmupProgress}/24 readings collected. Anomaly detection will be fully calibrated after {24 - warmupProgress} more readings.
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16 py-6 space-y-6">

        {/* Row 1: Station Status Banner */}
        <StationStatusBanner
          overallStatus={live.overall_status}
          sensorHealth={live.sensor_health}
          history={history}
          anomalyStatus={live.anomaly_status}
          severity={live.severity}
        />

        {/* Row 2: Live Sensor Reading Cards */}
        <SensorReadingsRow
          temperature={live.temperature}
          humidity={live.humidity}
          pressure={live.pressure}
          sensorHealth={live.sensor_health}
          timestamp={live.timestamp}
          series={series}
        />

        {/* Row 3: AI Anomaly Alert */}
        <AnomalyAlertCard
          live={live}
          isWarmingUp={isWarmingUp}
          history={history}
        />

        {/* Row 4: Real-Time Chart */}
        <SensorChartSection series={series} />

        {/* Row 5: Detection Flow + Sensor Health */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <DetectionFlowDiagram
              isWarmingUp={isWarmingUp}
              inferenceLatency={null}
            />
          </div>
          <div className="lg:col-span-2">
            <SensorHealthCards sensorHealth={live.sensor_health} />
          </div>
        </div>

        {/* Row 6: Root Cause + Explanation + Recommendation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RootCauseClassification
            probabilities={live.root_cause_probabilities}
            detectedType={live.anomaly_type}
          />
          <ExplanationRecommendation
            explanation={live.explanation}
            recommendations={live.recommendations}
            correctedValue={live.corrected_value}
            live={live}
          />
        </div>

        {/* Row 7: Anomaly History Table */}
        <AnomalyHistoryTable history={history} />

      </main>

      <footer className="border-t border-border mt-10 py-4 px-8 text-center text-muted-foreground text-xs">
        SkyGuard AI v2.4.1 — Algorithm: Isolation Forest + Per-Sensor Residual Regressors — Station AWS-MH-042 — All times UTC
      </footer>
    </div>
  );
}

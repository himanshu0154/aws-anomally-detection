import React from 'react';
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
      <DashboardHeader />

      {/* Main content */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16 py-6 space-y-6">

        {/* Row 1: Station Status Banner */}
        <StationStatusBanner />

        {/* Row 2: Live Sensor Reading Cards */}
        <SensorReadingsRow />

        {/* Row 3: AI Anomaly Alert — most prominent section */}
        <AnomalyAlertCard />

        {/* Row 4: Real-Time Chart */}
        <SensorChartSection />

        {/* Row 5: Detection Flow + Sensor Health */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <DetectionFlowDiagram />
          </div>
          <div className="lg:col-span-2">
            <SensorHealthCards />
          </div>
        </div>

        {/* Row 6: Root Cause + Explanation + Recommendation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RootCauseClassification />
          <ExplanationRecommendation />
        </div>

        {/* Row 7: Anomaly History Table */}
        <AnomalyHistoryTable />

      </main>

      <footer className="border-t border-border mt-10 py-4 px-8 text-center text-muted-foreground text-xs">
        SkyGuard AI v2.4.1 — Model: SkyAnomalyNet-v3 — Station AWS-MH-042 — All times UTC
      </footer>
    </div>
  );
}
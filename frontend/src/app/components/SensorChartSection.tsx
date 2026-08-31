'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Backend integration point: replace mock data with WebSocket or REST polling
const SensorChartClient = dynamic(
  () => import('./SensorChartClient'),
  { ssr: false }
);

export default function SensorChartSection() {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Real-Time Sensor Readings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Last 2 hours — 5-minute intervals — AWS-MH-042</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-danger inline-block rounded"></span>
            <span className="text-muted-foreground">Temperature (°C)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-primary inline-block rounded"></span>
            <span className="text-muted-foreground">Humidity (%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-accent inline-block rounded"></span>
            <span className="text-muted-foreground">Pressure (÷10 hPa)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger border-2 border-white inline-block"></span>
            <span className="text-danger font-medium">Anomaly</span>
          </span>
        </div>
      </div>
      <SensorChartClient />
    </div>
  );
}
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { SeriesPoint } from '@/types/skyguard';

const SensorChartClient = dynamic(() => import('./SensorChartClient'), { ssr: false });

interface SensorChartSectionProps {
  series: SeriesPoint[];
}

export default function SensorChartSection({ series }: SensorChartSectionProps) {
  const pressureSpan = (() => {
    const values = series
      .map((point) => point.pressure)
      .filter((value): value is number => value != null);
    if (values.length < 2) return null;
    return Math.max(...values) - Math.min(...values);
  })();

  return (
    <div className="card-elevated p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Real-Time Sensor Readings</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Last {series.length} readings
            {pressureSpan != null && (
              <> · pressure varies {pressureSpan.toFixed(1)} hPa across this window</>
            )}
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 rounded bg-danger" />
            <span className="text-muted-foreground">Temperature (°C, left)</span>
          </li>
          <li className="flex items-center gap-1.5">
           <span className="inline-block h-0.5 w-3 rounded bg-primary" />
            <span className="text-muted-foreground">Humidity (%, left)</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 rounded bg-accent" />
            <span className="text-muted-foreground">Pressure (hPa, right)</span>
          </li>
        </ul>
      </div>
      <SensorChartClient data={series} />
    </div>
  );
}

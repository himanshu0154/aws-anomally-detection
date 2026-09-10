'use client';
import React from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { SeriesPoint } from '@/hooks/useLiveDashboardData';

interface SensorChartClientProps {
  data: SeriesPoint[];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const hasAnomaly = payload.some(
      (p) => p.name === 'temp' && p.value !== null
    );
    // Find if this point has anomaly flag from the data
    return (
      <div
        className="rounded-xl border p-3 text-xs shadow-2xl"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          minWidth: '160px',
        }}
      >
        <p className="font-semibold text-foreground mb-2 font-tabular">{label} UTC</p>
        {payload.map((entry) => (
          <div
            key={`tooltip-${entry.name}`}
            className="flex items-center justify-between gap-4 mb-1"
          >
            <span style={{ color: entry.color }} className="font-medium capitalize">
              {entry.name === 'temp' ? 'Temp'
                : entry.name === 'humidity' ? 'Humidity' : 'Pressure×10'}
            </span>
            <span className="font-tabular font-semibold" style={{ color: entry.color }}>
              {entry.value != null ? (
                entry.name === 'temp'
                  ? `${entry.value.toFixed(1)} °C`
                  : entry.name === 'humidity'
                  ? `${entry.value.toFixed(1)} %`
                  : `${(entry.value * 10).toFixed(1)} hPa`
              ) : 'N/A'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SensorChartClient({ data }: SensorChartClientProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[340px] text-muted-foreground text-sm">
        Waiting for data...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.6}
          vertical={false}
        />

        <XAxis
          dataKey="time"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontFamily: 'var(--font-sans)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          interval={Math.max(0, Math.floor(data.length / 8))}
        />

        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontFamily: 'var(--font-sans)' }}
          tickLine={false}
          axisLine={false}
          width={40}
        />

        {/* Illustrative reference line — not a model threshold */}
        <ReferenceLine
          y={38}
          stroke="var(--warning)"
          strokeDasharray="4 4"
          strokeOpacity={0.4}
          label={{
            value: 'Illustrative ~38°C guide',
            position: 'insideTopRight',
            fill: 'var(--warning)',
            fontSize: 10,
            fontFamily: 'var(--font-sans)',
            opacity: 0.7,
          }}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Pressure (scaled ÷10 for display) */}
        <Line
          type="monotone"
          dataKey="pressureScaled"
          stroke="var(--accent)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--accent)' }}
          name="pressureScaled"
          strokeOpacity={0.8}
          connectNulls
        />

        {/* Humidity */}
        <Line
          type="monotone"
          dataKey="humidity"
          stroke="var(--primary)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--primary)' }}
          name="humidity"
          strokeOpacity={0.9}
          connectNulls
        />

        {/* Temperature */}
        <Line
          type="monotone"
          dataKey="temp"
          stroke="var(--danger)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: 'var(--danger)' }}
          name="temp"
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

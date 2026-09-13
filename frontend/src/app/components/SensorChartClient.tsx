'use client';

import React, { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SeriesPoint } from '@/types/skyguard';

interface SensorChartClientProps {
  data: SeriesPoint[];
}

/**
 * Pressure is plotted in real hPa on its own axis.
 *
 * The old view divided pressure by 10 and shared the temperature/humidity axis: the
 * real 3–27 hPa swings inside one window collapsed to well under 1% of the axis and
 * read as a frozen line. A dedicated domain keeps every fluctuation visible without
 * transforming the value, and the tooltip reports the hPa the sensor actually sent.
 */
const AXIS_DOMAIN_PADDING = 1.5;

function pressureDomain(pressures: number[]): [number, number] {
  if (pressures.length === 0) return [950, 1050];
  const min = Math.min(...pressures);
  const max = Math.max(...pressures);
  if (max - min < AXIS_DOMAIN_PADDING) {
    const centre = (min + max) / 2;
    return [Math.floor(centre - 5), Math.ceil(centre + 5)];
  }
  return [Math.floor(min - AXIS_DOMAIN_PADDING), Math.ceil(max + AXIS_DOMAIN_PADDING)];
}

const SERIES_LABELS: Record<string, string> = {
  temp: 'Temperature',
  humidity: 'Humidity',
  pressure: 'Pressure',
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | null; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-xl border p-3 text-xs shadow-2xl"
      style={{ background: 'var(--card)', borderColor: 'var(--border)', minWidth: '180px' }}
    >
      <p className="mb-2 font-tabular font-semibold text-foreground">{label} UTC</p>
      {payload.map((entry) => {
        const key = entry.name ?? '';
        const unit = key === 'temp' ? '°C' : key === 'humidity' ? '%' : 'hPa';
        return (
          <div key={`tooltip-${key}`} className="mb-1 flex items-center justify-between gap-4">
            <span style={{ color: entry.color }} className="font-medium">
              {SERIES_LABELS[key] ?? key}
            </span>
            <span className="font-tabular font-semibold" style={{ color: entry.color }}>
              {entry.value == null || Number.isNaN(entry.value)
                ? 'N/A'
                : `${entry.value.toFixed(1)} ${unit}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function SensorChartClient({ data }: SensorChartClientProps) {
  const domain = useMemo(
    () =>
      pressureDomain(
        data.map((point) => point.pressure).filter((value): value is number => value != null)
      ),
    [data]
  );

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">
        Waiting for data…
      </div>
    );
  }

  const tickStyle = {
    fill: 'var(--muted-foreground)',
    fontSize: 11,
    fontFamily: 'var(--font-sans)',
  };

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.6}
          vertical={false}
        />

        <XAxis
          dataKey="time"
          tick={tickStyle}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          interval={Math.max(0, Math.floor(data.length / 8))}
        />

        {/* Temperature + humidity share the left axis (both are °C / %) */}
        <YAxis yAxisId="left" tick={tickStyle} tickLine={false} axisLine={false} width={40} />

        {/* Pressure gets its own hPa axis so real fluctuations stay visible */}
        <YAxis
          yAxisId="pressure"
          orientation="right"
          domain={domain}
          tick={tickStyle}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(value: number) => `${value}`}
        />

        {/* Illustrative reference line — not a model threshold */}
        <ReferenceLine
          yAxisId="left"
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

        <Line
          yAxisId="pressure"
          type="monotone"
          dataKey="pressure"
          stroke="var(--accent)"
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--accent)' }}
          name="pressure"
          strokeOpacity={0.95}
          connectNulls
        />

        <Line
          yAxisId="left"
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

        <Line
          yAxisId="left"
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

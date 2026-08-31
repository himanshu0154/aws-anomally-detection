'use client';
import React from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot,  } from 'recharts';

// Backend integration point: replace with live WebSocket feed or polling API
const chartData = [
  { time: '08:00', temp: 27.2, humidity: 71.0, pressureScaled: 101.28 },
  { time: '08:05', temp: 27.5, humidity: 70.8, pressureScaled: 101.29 },
  { time: '08:10', temp: 27.1, humidity: 71.2, pressureScaled: 101.30 },
  { time: '08:15', temp: 27.8, humidity: 70.5, pressureScaled: 101.31 },
  { time: '08:20', temp: 28.0, humidity: 70.2, pressureScaled: 101.31 },
  { time: '08:25', temp: 28.3, humidity: 69.9, pressureScaled: 101.32 },
  { time: '08:30', temp: 28.1, humidity: 70.1, pressureScaled: 101.32 },
  { time: '08:35', temp: 28.6, humidity: 69.7, pressureScaled: 101.33 },
  { time: '08:40', temp: 28.9, humidity: 69.4, pressureScaled: 101.33 },
  { time: '08:45', temp: 29.2, humidity: 69.1, pressureScaled: 101.34 },
  { time: '08:50', temp: 29.0, humidity: 69.3, pressureScaled: 101.34 },
  { time: '08:55', temp: 29.4, humidity: 68.9, pressureScaled: 101.35 },
  { time: '09:00', temp: 30.1, humidity: 68.6, pressureScaled: 101.35 },
  { time: '09:05', temp: 30.5, humidity: 68.3, pressureScaled: 101.36 },
  { time: '09:10', temp: 30.8, humidity: 68.1, pressureScaled: 101.36 },
  { time: '09:15', temp: 31.2, humidity: 67.8, pressureScaled: 101.35 },
  { time: '09:20', temp: 31.5, humidity: 67.6, pressureScaled: 101.35 },
  { time: '09:25', temp: 31.9, humidity: 67.4, pressureScaled: 101.34 },
  { time: '09:30', temp: 32.1, humidity: 67.5, pressureScaled: 101.34 },
  { time: '09:35', temp: 32.4, humidity: 67.3, pressureScaled: 101.33 },
  { time: '09:40', temp: 32.2, humidity: 67.6, pressureScaled: 101.33 },
  { time: '09:45', temp: 32.7, humidity: 67.2, pressureScaled: 101.32 },
  { time: '09:50', temp: 33.0, humidity: 67.1, pressureScaled: 101.32 },
  { time: '09:55', temp: 33.1, humidity: 67.4, pressureScaled: 101.31 },
  { time: '10:00', temp: 33.4, humidity: 67.5, pressureScaled: 101.31 },
  { time: '10:05', temp: 33.6, humidity: 67.4, pressureScaled: 101.31 },
  { time: '10:10', temp: 33.7, humidity: 67.3, pressureScaled: 101.32 },
  { time: '10:12', temp: 38.1, humidity: 67.2, pressureScaled: 101.32, anomaly: true },
  { time: '10:14', temp: 44.8, humidity: 67.2, pressureScaled: 101.31, anomaly: true },
  { time: '10:16', temp: 52.4, humidity: 67.3, pressureScaled: 101.32, anomaly: true },
];

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const isAnomaly = payload.some(
      (p) => p.name === 'temp' && p.value > 38
    );
    return (
      <div
        className="rounded-xl border p-3 text-xs shadow-2xl"
        style={{
          background: 'var(--card)',
          borderColor: isAnomaly ? 'var(--danger)' : 'var(--border)',
          minWidth: '160px',
        }}
      >
        <p className="font-semibold text-foreground mb-2 font-tabular">{label} UTC</p>
        {isAnomaly && (
          <p className="text-danger font-bold mb-1.5 flex items-center gap-1">
            ⚠ Anomaly Flagged
          </p>
        )}
        {payload.map((entry) => (
          <div
            key={`tooltip-${entry.name}`}
            className="flex items-center justify-between gap-4 mb-1"
          >
            <span style={{ color: entry.color }} className="font-medium capitalize">
              {entry.name === 'temp' ?'Temp'
                : entry.name === 'humidity' ?'Humidity' :'Pressure×10'}
            </span>
            <span className="font-tabular font-semibold" style={{ color: entry.color }}>
              {entry.name === 'temp'
                ? `${entry.value} °C`
                : entry.name === 'humidity'
                ? `${entry.value} %`
                : `${(entry.value * 10).toFixed(1)} hPa`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SensorChartClient() {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
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
          interval={3}
        />

        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontFamily: 'var(--font-sans)' }}
          tickLine={false}
          axisLine={false}
          width={40}
        />

        {/* Normal range reference zone */}
        <ReferenceLine
          y={38}
          stroke="var(--warning)"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
          label={{
            value: 'Threshold 38°C',
            position: 'insideTopRight',
            fill: 'var(--warning)',
            fontSize: 10,
            fontFamily: 'var(--font-sans)',
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
        />

        {/* Anomaly highlight dots */}
        <ReferenceDot
          x="10:12"
          y={38.1}
          r={6}
          fill="var(--warning)"
          stroke="var(--card)"
          strokeWidth={2}
          label={{
            value: '38.1°C',
            position: 'top',
            fill: 'var(--warning)',
            fontSize: 10,
            fontFamily: 'var(--font-sans)',
          }}
        />
        <ReferenceDot
          x="10:14"
          y={44.8}
          r={7}
          fill="var(--danger)"
          stroke="var(--card)"
          strokeWidth={2}
          label={{
            value: '44.8°C',
            position: 'top',
            fill: 'var(--danger)',
            fontSize: 10,
            fontFamily: 'var(--font-sans)',
          }}
        />
        <ReferenceDot
          x="10:16"
          y={52.4}
          r={9}
          fill="var(--danger)"
          stroke="white"
          strokeWidth={2}
          label={{
            value: '⚠ 52.4°C',
            position: 'top',
            fill: 'var(--danger)',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
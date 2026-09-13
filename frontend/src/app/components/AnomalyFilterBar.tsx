'use client';

import React from 'react';
import { ListFilter, Search, X } from 'lucide-react';
import { BorderTrail } from '@/components/ui/border-trail';
import {
  ANOMALY_TYPE_OPTIONS,
  DAY_OPTIONS,
  EMPTY_FILTERS,
  SEVERITY_OPTIONS,
  SENSOR_OPTIONS,
  STATUS_OPTIONS,
  TIME_BUCKET_OPTIONS,
  countActiveFilters,
  type HistoryFilters,
} from '@/lib/anomaly';

interface AnomalyFilterBarProps {
  filters: HistoryFilters;
  onChange: (filters: HistoryFilters) => void;
  resultCount: number;
  totalCount: number;
}

const fieldClass =
  'w-full rounded-lg border border-border bg-card px-2.5 py-2 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-label-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export default function AnomalyFilterBar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: AnomalyFilterBarProps) {
  const set = (patch: Partial<HistoryFilters>) => onChange({ ...filters, ...patch });
  const activeCount = countActiveFilters(filters);
  const [searchFocused, setSearchFocused] = React.useState(false);

  return (
    <section aria-label="History filters" className="card-elevated p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListFilter size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground font-tabular" aria-live="polite">
            {resultCount} of {totalCount} records
          </p>
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
            disabled={activeCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={12} />
            Clear filters
          </button>
        </div>
      </div>

      <div className="relative mb-4 rounded-lg">
        {/*
          The trail marks the log as *actively* searched: it appears while the
          field has focus, so a filtered log looks different from an idle one.
        */}
        <BorderTrail
          active={searchFocused}
          className="bg-gradient-to-l from-primary/0 via-primary to-primary/0"
          // Shorter than the field is tall, so a lap never clips the comet.
          size={40}
          duration={5}
        />
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => set({ search: event.target.value })}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search by ID, sensor, anomaly type, reading, explanation, date or severity…"
          aria-label="Search anomaly records"
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <Field label="Date">
          <input
            type="date"
            value={filters.date}
            onChange={(event) => set({ date: event.target.value })}
            className={fieldClass}
          />
        </Field>

        <Field label="Day">
          <select
            value={filters.day}
            onChange={(event) => set({ day: event.target.value })}
            className={fieldClass}
          >
            <option value="">All days</option>
            {DAY_OPTIONS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Time">
          <select
            value={filters.timeBucket}
            onChange={(event) => set({ timeBucket: event.target.value })}
            className={fieldClass}
          >
            <option value="">Any time</option>
            {TIME_BUCKET_OPTIONS.map((bucket) => (
              <option key={bucket} value={bucket}>
                {bucket}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sensor">
          <select
            value={filters.sensor}
            onChange={(event) => set({ sensor: event.target.value })}
            className={fieldClass}
          >
            <option value="">All sensors</option>
            {SENSOR_OPTIONS.map((sensor) => (
              <option key={sensor.value} value={sensor.value}>
                {sensor.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Anomaly type">
          <select
            value={filters.anomalyType}
            onChange={(event) => set({ anomalyType: event.target.value })}
            className={fieldClass}
          >
            <option value="">All types</option>
            {ANOMALY_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Severity">
          <select
            value={filters.severity}
            onChange={(event) => set({ severity: event.target.value })}
            className={fieldClass}
          >
            <option value="">All severities</option>
            {SEVERITY_OPTIONS.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            value={filters.status}
            onChange={(event) => set({ status: event.target.value })}
            className={fieldClass}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </section>
  );
}

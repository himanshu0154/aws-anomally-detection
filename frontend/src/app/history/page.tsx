'use client';

import React, { useMemo, useState } from 'react';
import AnomalyFilterBar from '../components/AnomalyFilterBar';
import AnomalyHistoryTable from '../components/AnomalyHistoryTable';
import PageHeader from '../components/PageHeader';
import { EmptyBlock, LoadingBlock } from '../components/StateFeedback';
import { HISTORY_LIMIT, useLiveDashboardData } from '@/hooks/useLiveDashboardData';
import { useResolveAnomaly } from '@/hooks/useResolveAnomaly';
import {
  EMPTY_FILTERS,
  countActiveFilters,
  countByStatus,
  filterHistory,
  type HistoryFilters,
} from '@/lib/anomaly';

export default function HistoryPage() {
  const { history, loading, error } = useLiveDashboardData();
  const { resolve, isResolving } = useResolveAnomaly();
  const [filters, setFilters] = useState<HistoryFilters>({ ...EMPTY_FILTERS });

  const counts = useMemo(() => countByStatus(history), [history]);
  const filtered = useMemo(() => filterHistory(history, filters), [history, filters]);
  const filtersActive = countActiveFilters(filters) > 0;

  const summary = [
    {
      key: 'Active',
      label: 'Active',
      value: counts.Active,
      className: 'status-critical',
      hint: 'Unresolved anomalies',
    },
    {
      key: 'Resolved',
      label: 'Resolved',
      value: counts.Resolved,
      className: 'status-healthy',
      hint: 'Closed by an operator',
    },
    {
      key: 'Normal',
      label: 'Normal',
      value: counts.Normal,
      className: 'status-normal',
      hint: 'Readings within range',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anomaly History"
        subtitle={`The latest ${HISTORY_LIMIT} records the backend has processed — normal readings, unresolved anomalies and anomalies an operator has resolved.`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Anomaly History' }]}
      />
      <section aria-label="Session summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {summary.map((item) => (
          <div key={item.key} className={`rounded-xl px-5 py-4 ${item.className}`}>
            <p className="text-label-sm opacity-80">{item.label}</p>
            <p className="text-2xl font-bold tracking-tight font-tabular">{item.value}</p>
            <p className="mt-0.5 text-xs opacity-80">{item.hint}</p>
          </div>
        ))}
      </section>
      <AnomalyFilterBar
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
        totalCount={history.length}
      />
      {loading && history.length === 0 ? (
        <LoadingBlock label="Loading stored readings…" rows={5} />
      ) : filtered.length === 0 ? (
        history.length === 0 ? (
          <EmptyBlock
            title="No records stored yet"
            message={
              error
                ? 'The backend has not answered yet, so no readings are available. Retry once the API is reachable.'
                : 'The simulator has not produced a reading yet. Records appear here as soon as the pipeline processes one.'
            }
          />
        ) : (
          <EmptyBlock
            title="No records match your current filters."
            message="Adjust or clear the filters to see more of the session log."
            action={
              <button
                type="button"
                onClick={() => setFilters({ ...EMPTY_FILTERS })}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear filters
              </button>
            }
          />
        )
      ) : (
        <AnomalyHistoryTable events={filtered} onResolve={resolve} isResolving={isResolving} />
      )}{' '}
      {/* Sits on the sky, not on a card — only `--foreground` clears AA there. */}
      {filtersActive && filtered.length > 0 && (
        <p className="text-xs text-foreground">
          Showing {filtered.length} of the latest {history.length} loaded records. Clear the filters
          to see the full window.
        </p>
      )}
    </div>
  );
}

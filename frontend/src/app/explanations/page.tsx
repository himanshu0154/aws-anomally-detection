'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCheck, ListChecks } from 'lucide-react';
import AnomalyEventCard from '../components/AnomalyEventCard';
import PageHeader from '../components/PageHeader';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { BorderTrail } from '@/components/ui/border-trail';
import { CanvasText } from '@/components/ui/canvas-text';
import { InView } from '@/components/ui/in-view';
import { TransitionPanel } from '@/components/ui/transition-panel';
import { EmptyBlock, LoadingBlock } from '../components/StateFeedback';
import { HISTORY_LIMIT, useLiveDashboardData } from '@/hooks/useLiveDashboardData';
import { useResolveAnomaly } from '@/hooks/useResolveAnomaly';
import { sortForExplanations } from '@/lib/anomaly';
import type { AnomalyEvent } from '@/types/skyguard';

type StatusView = 'All' | 'Active' | 'Resolved';

const VIEWS: StatusView[] = ['All', 'Active', 'Resolved'];

export default function ExplanationsPage() {
  const { history, loading } = useLiveDashboardData();
  const { resolve, resolveAll, isResolving } = useResolveAnomaly();
  const [view, setView] = useState<StatusView>('All');
  const [confirmingAll, setConfirmingAll] = useState(false);

  // One list per status filter; a view's panel never re-derives event contents.
  const anomalyEvents = useMemo(() => sortForExplanations(history), [history]);
  const activeEvents = useMemo(
    () => anomalyEvents.filter((event) => event.status === 'Active'),
    [anomalyEvents]
  );
  const resolvedEvents = useMemo(
    () => anomalyEvents.filter((event) => event.status === 'Resolved'),
    [anomalyEvents]
  );
  const resolvedCount = anomalyEvents.length - activeEvents.length;
  const eventsByView: Record<StatusView, AnomalyEvent[]> = {
    All: anomalyEvents,
    Active: activeEvents,
    Resolved: resolvedEvents,
  };

  const handleResolveAll = async () => {
    setConfirmingAll(false);
    await resolveAll(activeEvents);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explanation & Recommendations"
        subtitle={
          <>
            Every anomaly detected within the latest {HISTORY_LIMIT} stored records. Each entry
            keeps the reasoning, the corrected value and the recommended actions it was raised with,
            and <CanvasText text="stays here" className="text-xl font-bold" /> until an operator
            resolves it.
          </>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Explanation & Recommendations' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter events by status"
            className="flex rounded-lg border border-border bg-card p-1"
          >
            {/*
              The selected view is the highlight's resting place; hovering a
              segment sends it there instead of each button painting its own
              background. Segments are `relative` so they paint above it.
            */}
            <AnimatedBackground
              containerClassName="flex"
              className="rounded-md bg-primary/10"
              value={view}
              enableHover
              transition={{ duration: 0.3 }}
            >
              {VIEWS.map((option) => (
                <button
                  key={option}
                  type="button"
                  data-id={option}
                  onClick={() => setView(option)}
                  aria-pressed={view === option}
                  className={`relative rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    view === option ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option}
                  <span className="ml-1.5 font-tabular text-muted-foreground/80">
                    {option === 'All'
                      ? anomalyEvents.length
                      : option === 'Active'
                        ? activeEvents.length
                        : resolvedCount}
                  </span>
                </button>
              ))}
            </AnimatedBackground>
          </div>
        </div>

        {activeEvents.length > 0 && (
          <div className="flex items-center gap-2">
            {confirmingAll ? (
              <>
                <p className="text-xs font-medium text-foreground">
                  Mark all {activeEvents.length} active anomalies as Resolved?
                </p>
                <button
                  type="button"
                  onClick={handleResolveAll}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingAll(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingAll(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ListChecks size={13} />
                Resolve all {activeEvents.length} active
              </button>
            )}
          </div>
        )}
      </div>

      {activeEvents.length > 0 && (
        <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-danger/40 bg-danger/5 px-5 py-3">
          {/*
            The queue page's counterpart of the dashboard's alert trail: the queue
            stays live until every event is resolved, so the border keeps a comet
            travelling while anything is unresolved.
          */}
          <BorderTrail
            className="bg-gradient-to-l from-danger/0 via-danger to-danger/0"
            // The banner is a wide, short strip: keep the comet inside its height.
            size={60}
            duration={7}
            radius="calc(var(--radius) + 0.25rem)"
          />
          <AlertTriangle size={18} className="shrink-0 text-danger" />
          <p className="text-xs font-medium text-foreground">
            {activeEvents.length} unresolved{' '}
            {activeEvents.length === 1 ? 'anomaly is' : 'anomalies are'} still in the operator
            queue. A later normal reading does not close them — only a resolution does.
          </p>
        </div>
      )}

      {/*
        The status views are panels: `TransitionPanel` keeps the outgoing list
        mounted for the length of the exchange, so switching All / Active /
        Resolved slides one list out and the next in instead of blinking.
      */}
      <TransitionPanel activeIndex={VIEWS.indexOf(view)} transition={{ duration: 0.22 }}>
        {VIEWS.map((option) => {
          const events = eventsByView[option];

          if (loading && history.length === 0) {
            return <LoadingBlock key={option} label="Loading stored anomaly events…" rows={4} />;
          }

          if (events.length === 0) {
            return anomalyEvents.length === 0 ? (
              <EmptyBlock
                key={option}
                title="No anomalies detected yet"
                message="The model is monitoring. As soon as a reading is flagged it will appear here as a persistent event, and it will stay here after the live reading returns to normal."
                action={
                  <Link
                    href="/history"
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    View all stored readings
                  </Link>
                }
              />
            ) : (
              <EmptyBlock
                key={option}
                title={`No ${option.toLowerCase()} anomalies`}
                message={
                  option === 'Active'
                    ? 'Nothing is waiting for an operator right now.'
                    : 'No resolved anomalies in this session yet.'
                }
                action={
                  <button
                    type="button"
                    onClick={() => setView('All')}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Show all events
                  </button>
                }
              />
            );
          }

          return (
            <ul key={option} className="space-y-4">
              {events.map((event: AnomalyEvent) => (
                <li key={event.id}>
                  {/*
                    Each card is its own reveal group, so a long queue animates in
                    as it is scrolled rather than all at once off the top.
                  */}
                  <InView>
                    <AnomalyEventCard
                      event={event}
                      resolving={isResolving(event.id)}
                      onResolve={resolve}
                    />
                  </InView>
                </li>
              ))}
            </ul>
          );
        })}
      </TransitionPanel>

      {/* Sits on the sky, not on a card — only `--foreground` clears AA there. */}
      {anomalyEvents.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-foreground">
          <CheckCheck size={13} className="text-positive" /> {resolvedCount} of{' '}
          {anomalyEvents.length} anomalies in the loaded window are resolved — resolved events stay
          visible here and in Anomaly History.
        </p>
      )}
    </div>
  );
}

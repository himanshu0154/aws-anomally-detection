'use client';

import React, { useCallback, useState } from 'react';
import { Toaster } from 'sonner';
import AppFooter from './AppFooter';
import AppNavigation from './AppNavigation';
import CloudBackdrop from './CloudBackdrop';
import SplashScreen from './SplashScreen';
import { ErrorBlock } from './StateFeedback';
import { Cursor } from '@/components/ui/cursor';
import { ScrollProgress } from '@/components/ui/scroll-progress';
import { DashboardDataProvider, useLiveDashboardData } from '@/hooks/useLiveDashboardData';

/**
 * Global chrome: data provider, cloud backdrop, labelled cursor, one-time splash,
 * header/navigation, connection banner, main content region and footer.
 *
 * The splash lives here rather than in a route so it plays exactly once per page
 * load — client-side navigation between pages never replays it.
 */
function ShellChrome({
  children,
  showSplash,
  onSplashDone,
}: {
  children: React.ReactNode;
  showSplash: boolean;
  onSplashDone: () => void;
}) {
  const { live, error, loading, unresolvedCount, refresh } = useLiveDashboardData();
  const connected = !loading && !error && Boolean(live.timestamp);

  return (
    // No background on this element on purpose: an in-flow ancestor background
    // would paint over the `-z-10` cloud backdrop.
    <div className="flex min-h-screen flex-col text-foreground">
      <CloudBackdrop />

      {/*
        One labelled pointer for the whole app, mounted here so it exists on
        every route. Surfaces opt in with a `data-cursor` label; everything else
        keeps the native pointer.
      */}
      <Cursor />

      {/*
        How far through the page the reader is. It measures the document, so one
        instance covers every route, and it hides itself on a page that does not
        scroll rather than sitting there as a dead hairline. `z-[55]` is above the
        sticky header (50) and below the drawer's scrim (60), so it rides the top
        edge of the header without ever floating over an open dialog.
      */}
      <ScrollProgress className="fixed left-0 top-0 z-[55] h-0.5 w-full bg-[linear-gradient(to_right,transparent,var(--primary)_60%,var(--primary)_100%)]" />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-lg focus:border focus:border-border focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      {showSplash && <SplashScreen connected={connected} onDone={onSplashDone} />}

      <AppNavigation
        lastUpdated={live.timestamp}
        online={!error}
        unresolvedCount={unresolvedCount}
        algorithm={live.model_meta?.algorithm || 'Isolation Forest + residual regressors'}
      />

      {error && (
        <div className="mx-auto w-full max-w-screen-2xl px-4 pt-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16">
          <ErrorBlock message={error} onRetry={refresh} />
        </div>
      )}

      <main
        id="main-content"
        className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-16"
      >
        {children}
      </main>

      <AppFooter />

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
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  return (
    <DashboardDataProvider>
      <ShellChrome showSplash={showSplash} onSplashDone={handleSplashDone}>
        {children}
      </ShellChrome>
    </DashboardDataProvider>
  );
}

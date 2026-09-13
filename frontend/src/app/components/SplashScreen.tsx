'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import { TextHoverEffect } from '@/components/ui/text-hover-effect';

/** Total time the splash stays on screen before handing over to the dashboard. */
const SPLASH_DURATION_MS = 1900;
const REDUCED_MOTION_DURATION_MS = 600;
const FADE_OUT_MS = 350;

interface SplashScreenProps {
  /** True once the backend has actually answered — the splash never waits for it. */
  connected: boolean;
  onDone: () => void;
}

export default function SplashScreen({ connected, onDone }: SplashScreenProps) {
  const [progress, setProgress] = useState(4);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    window.setTimeout(onDone, FADE_OUT_MS);
  }, [onDone]);

  // Drive the progress bar from real elapsed time, then hand over exactly once.
  useEffect(() => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const total = reduced ? REDUCED_MOTION_DURATION_MS : SPLASH_DURATION_MS;
    const startedAt = performance.now();

    const tick = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      setProgress(Math.min(100, Math.round((elapsed / total) * 100)));
      if (elapsed >= total) {
        window.clearInterval(tick);
        finish();
      }
    }, 50);

    return () => window.clearInterval(tick);
  }, [finish]);

  // Keep the page behind the overlay from scrolling while it is visible.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="SkyGuard AI is starting"
      onClick={finish}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background transition-opacity duration-300 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/*
        The clouds behind this overlay are the app's single `CloudBackdrop`, which
        keeps rendering after the splash leaves — so startup and the dashboard are
        the same sky, with no seam and no second WebGL context. This only adds the
        extra wash that focuses the eye on the mark.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-background/45" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, var(--accent) 0%, transparent 42%), radial-gradient(circle at 50% 90%, var(--primary) 0%, transparent 45%)',
            opacity: 0.12,
          }}
        />
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="pulse-ring mb-6 rounded-2xl border border-border bg-card p-4">
          <AppLogo size={64} />
        </div>

        {/*
          The app name is the wordmark here too, so startup, the header brand and
          the explainer hero all use one mark. Its outline traces itself over the
          splash, which is the same animation the dashboard's brand runs — the
          splash just gives it room to be seen.
        */}
        <h1 className="w-72 max-w-full">
          <TextHoverEffect
            text="SKYGUARD AI"
            duration={1.8}
            idleOpacity={0.9}
            className="h-11 w-full"
          />
        </h1>
        {/*
          This text sits on the sky, not on a card: over the splash's own wash
          plus the backdrop's, `--secondary-foreground` measures ~4.4:1 on the
          deepest cloud shadow — under AA. `--foreground/90` clears 5.7:1 there
          while staying off pure black against the blue.
        */}
        <p className="mt-2 max-w-md text-sm text-foreground/90">
          Intelligent Automatic Weather Station Anomaly Detection
        </p>

        <div className="mt-8 h-1 w-64 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-xs font-medium text-foreground/90 font-tabular">
          {connected
            ? 'Backend connected — opening dashboard'
            : 'Connecting to the SkyGuard AI backend…'}
        </p>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            finish();
          }}
          className="mt-6 rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Skip intro
        </button>
      </div>
    </div>
  );
}

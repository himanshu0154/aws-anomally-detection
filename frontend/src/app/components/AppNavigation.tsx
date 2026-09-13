'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Menu, Wifi, X } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { TextHoverEffect } from '@/components/ui/text-hover-effect';
import { NAV_ITEMS, isActivePath } from '@/lib/navigation';
import { formatClock } from '@/lib/anomaly';

interface AppNavigationProps {
  lastUpdated: string;
  online: boolean;
  unresolvedCount: number;
  algorithm: string;
}

export default function AppNavigation({
  lastUpdated,
  online,
  unresolvedCount,
  algorithm,
}: AppNavigationProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '/';
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Internal navigation closes the drawer.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes; Tab is trapped inside the open panel.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Move focus into the panel on open and back to the trigger on close.
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
    } else if (wasOpen.current) {
      toggleRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16">
          {/* Brand */}
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <AppLogo size={36} />
            <span className="flex min-w-0 flex-col">
              {/* The brand is the wordmark, so the mark's reveal is available from
                  every page — and its `useId` ids are what let a second, large
                  instance live on /how-model-works without the two sharing a mask. */}
              <TextHoverEffect
                text="SKYGUARD AI"
                duration={1.6}
                idleOpacity={0.8}
                className="h-5 w-28 sm:w-32"
              />
              <span className="hidden text-xs leading-tight text-muted-foreground md:block">
                Intelligent AWS Anomaly Detection
              </span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Primary" className="hidden items-center gap-1 xl:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 md:flex">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    online ? 'online-dot bg-positive' : 'bg-warning'
                  }`}
                />
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    online ? 'bg-positive' : 'bg-warning'
                  }`}
                />
              </span>
              <span className={`text-xs font-medium ${online ? 'text-positive' : 'text-warning'}`}>
                {online ? 'Station Online' : 'Reconnecting'}
              </span>
            </div>

            <Wifi size={16} className="hidden text-primary lg:block" />

            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
              <Clock size={13} />
              <span className="font-tabular">Updated {formatClock(lastUpdated)}</span>
            </div>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              aria-expanded={open}
              aria-controls="main-navigation"
              aria-haspopup="dialog"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] bg-foreground/30 backdrop-blur-sm"
        />
      )}

      <div
        ref={panelRef}
        id="main-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-[70] flex h-full w-[88vw] max-w-sm transform flex-col border-l border-border bg-card shadow-2xl transition-transform duration-200 ${
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <AppLogo size={28} />
            <span className="text-sm font-semibold text-foreground">Navigation</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto scrollbar-thin p-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-transparent hover:bg-muted'
                    }`}
                  >
                    <Icon
                      size={18}
                      className={active ? 'mt-0.5 text-primary' : 'mt-0.5 text-muted-foreground'}
                    />
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-semibold ${
                          active ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border px-5 py-4">
          <p className="text-label-sm text-muted-foreground">Session</p>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center justify-between gap-3">
              <span>Status</span>
              <span className={online ? 'text-positive' : 'text-warning'}>
                {online ? 'Online' : 'Reconnecting'}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span>Unresolved anomalies</span>
              <span className={unresolvedCount > 0 ? 'text-danger' : 'text-positive'}>
                {unresolvedCount}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span>Algorithm</span>
              <span className="truncate text-right text-foreground/70">{algorithm}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

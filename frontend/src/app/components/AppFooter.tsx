import React from 'react';
import Link from 'next/link';
import { NAV_ITEMS, APP_VERSION } from '@/lib/navigation';

const ALGORITHM = 'Isolation Forest + Per-Sensor Residual Regressors';

export default function AppFooter() {
  return (
    <footer className="mt-10 border-t border-border bg-card/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 xl:px-10 2xl:px-16">
        <div>
          <p className="text-xs font-semibold text-foreground">SkyGuard AI {APP_VERSION}</p>
          <p className="mt-1 text-xs text-muted-foreground">{ALGORITHM} — All times UTC</p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

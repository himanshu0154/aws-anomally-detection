'use client';

import React from 'react';
import { APP_VERSION, NAV_ITEMS } from '@/lib/navigation';
import { Dock, DockItem } from '@/components/ui/dock';

const ALGORITHM = 'Isolation Forest + Per-Sensor Residual Regressors';

export default function AppFooter() {
  return (
    <footer className="mt-10 border-t border-border bg-card/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 xl:px-10 2xl:px-16">
        <div>
          <p className="text-xs font-semibold text-foreground">SkyGuard AI {APP_VERSION}</p>
          <p className="mt-1 text-xs text-muted-foreground">{ALGORITHM} — All times UTC</p>
        </div>

        {/*
          The footer's route list is the one navigation surface where the icon dock
          belongs: the five destinations already carry icons in `NAV_ITEMS`, and
          this is a secondary rail, so growing the nearest item never competes with
          the header or the drawer — those remain the primary navigation. Each item
          is a real link with an accessible name; the label rides along as a
          tooltip on a pointer device and moves into the item itself on touch, where
          there is no hover to reveal it.
        */}
        <nav aria-label="Footer">
          <Dock className="flex-wrap gap-2">
            {NAV_ITEMS.map((item) => {
              const ItemIcon = item.icon;
              return (
                <DockItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  className="h-10 w-10 rounded-full"
                >
                  <ItemIcon size={16} />
                </DockItem>
              );
            })}
          </Dock>
        </nav>
      </div>
    </footer>
  );
}

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/navigation';

interface QuickLinksProps {
  /** Badge per destination href — e.g. unresolved anomalies for /explanations. */
  badges?: Record<string, string>;
}

/** Dashboard entry points into the deeper analysis pages, driven by the shared nav model. */
export default function QuickLinks({ badges = {} }: QuickLinksProps) {
  return (
    <nav
      aria-label="Deeper analysis"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {NAV_ITEMS.filter((item) => item.href !== '/').map((item) => {
        const Icon = item.icon;
        const badge = badges[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            className="card-elevated group flex flex-col justify-between p-4 transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                <Icon size={18} className="text-primary" />
              </div>
              {badge && (
                <span className="rounded-full status-warning px-2 py-0.5 text-xs font-semibold">
                  {badge}
                </span>
              )}
            </div>
            <div className="mt-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                {item.label}
                <ArrowRight
                  size={13}
                  className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

import React from 'react';
import Link from 'next/link';

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  /** React nodes so a page can drop an inline `CanvasText` phrase into its lede. */
  subtitle?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          {/*
            `--foreground`, not `--muted-` or `--secondary-foreground`: this text
            sits directly on the blue sky rather than on a card, and only the
            foreground token clears AA against the deepest blue. See
            `CloudBackdrop` — the muted token cannot reach 4.5:1 on any
            background at all.
          */}
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-foreground">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-foreground/80">
                    {crumb.label}
                  </span>
                )}
                {index < breadcrumbs.length - 1 && <span aria-hidden="true">/</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import PipelineExplainer from '../components/PipelineExplainer';
import { TextHoverEffect } from '@/components/ui/text-hover-effect';

export const metadata: Metadata = {
  title: 'How our Model works — SkyGuard AI',
  description:
    'The SkyGuard AI detection pipeline: ingestion, cleaning, rolling context, feature engineering, Isolation Forest detection, residual sensor analysis, root-cause shares, severity, corrected values and the operator workflow.',
};

export default function HowModelWorksPage() {
  return (
    <div>
      <PageHeader
        title="How our Model works"
        subtitle="The complete detection pipeline — from a raw sensor reading to the action an operator takes. Each step explains the idea first, with the implementation details one click away."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'How our Model works' }]}
        actions={
          <Link
            href="/root-cause"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Root-cause analysis
            <ArrowRight size={13} />
          </Link>
        }
      />

      {/*
        Title card for the walkthrough. The wordmark is the page's own name, so it
        carries an accessible label rather than duplicating the header text, and
        the light only brightens what is already legible.
      */}
      <section
        aria-labelledby="pipeline-wordmark"
        className="mb-8 overflow-hidden rounded-2xl border border-border bg-card px-4 py-8 sm:px-8"
      >
        <h2 id="pipeline-wordmark" className="sr-only">
          How the SkyGuard AI detection pipeline works
        </h2>
        <TextHoverEffect text="SKYGUARD AI" className="mx-auto w-full max-w-3xl" duration={3} />
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          One reading at a time: ingested, cleaned, scored against a rolling 24-reading window,
          traced to a likely root cause, and handed to an operator as an explanation and a
          corrective action.
        </p>
      </section>

      <PipelineExplainer />
    </div>
  );
}

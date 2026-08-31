import React from 'react';
import AppLogo from '@/components/ui/AppLogo';
import { Wifi, Clock, Cpu } from 'lucide-react';

export default function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16 h-16 flex items-center justify-between gap-4">

        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <AppLogo size={36} />
            <div className="hidden sm:block">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold text-foreground tracking-tight">
                  SkyGuard AI
                </span>
                <span className="text-xs text-muted-foreground font-medium hidden md:block">
                  Intelligent AWS Anomaly Detection
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Station ID */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border">
          <Cpu size={14} className="text-primary shrink-0" />
          <span className="text-xs font-mono font-semibold text-foreground tracking-wider">
            AWS-MH-042
          </span>
        </div>

        {/* Right: Status + Time */}
        <div className="flex items-center gap-4">
          {/* Online indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="online-dot absolute inline-flex h-full w-full rounded-full bg-positive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-positive"></span>
            </span>
            <span className="text-xs font-medium text-positive hidden sm:block">Station Online</span>
          </div>

          {/* Wifi icon */}
          <Wifi size={16} className="text-primary" />

          {/* Last updated */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={13} />
            <span className="font-tabular hidden md:block">Updated 10:16:38 UTC</span>
          </div>

          {/* Model tag */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-muted border border-border">
            <span className="text-xs text-muted-foreground font-medium">Model</span>
            <span className="text-xs font-semibold text-accent">SkyAnomalyNet-v3</span>
          </div>
        </div>
      </div>
    </header>
  );
}
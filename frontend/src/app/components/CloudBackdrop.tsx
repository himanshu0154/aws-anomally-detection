'use client';

import React from 'react';
import { CloudShader } from '@/components/ui/cloud-shader';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * The app's ambient layer: one cloud shader behind every route, mounted once in
 * `AppShell` so it survives navigation — and survives the splash, which is why
 * the splash renders only its own scrim and branding on top instead of a second
 * canvas. Two WebGL contexts during startup was the most expensive thing the app
 * did, and it made the splash's clouds and the dashboard's clouds two different
 * skies meeting at a seam.
 *
 * A daylight sky: blue deepening toward the top (`#4a86c8`) and lightening toward
 * the horizon (`#b8d8f0`) with pure white clouds, read straight off the shader's
 * own buffer at a 35% scrim — sky top ~(166,202,238), horizon ~(209,230,242),
 * white clouds (250,249,244) against the deepest shadowed blue ~(143,181,219),
 * a wider spread than any tint-of-the-background variant managed.
 *
 * The trap this layer fell into twice: a sky whose colours are a *tint of*
 * `--background` (`#f4f2e8`) is invisible however well it renders, because the
 * scrim over it lands back on the page colour. An earlier `#dfe4d2 → #f4f2e8`
 * spanned ~2% contrast — mounted on every route, perfectly animated, flat. The
 * sky must differ from the page background, and the scrim must be loose enough
 * to let that difference through; those are the two dials, and they move
 * together.
 *
 * Text contrast is what sets the scrim, not taste. Over the deepest blue the
 * foreground token `#3a3a1f` measures ~5.4:1 (AA for body text) and clears 9:1
 * over the horizon, which is why every string that sits bare on the sky — page
 * ledes, breadcrumbs, section captions — uses `--foreground`. `--secondary-` and
 * `--muted-foreground` are for text on a card surface; `--muted-foreground`
 * `#7a7a5a` can only ever reach 4.46:1 against pure white, so it cannot pass AA
 * on any background at all.
 *
 * `-z-10` is deliberate: a negative stack level paints above the canvas
 * background but behind every in-flow descendant, so nothing in the app has to
 * remember to add a z-index, and it is hidden entirely if `AppShell` ever paints
 * a background of its own.
 */
export default function CloudBackdrop() {
  // Fewer noise layers per pixel on small screens; the cloud count is a WebGL
  // uniform, so it cannot come from CSS.
  const roomy = useMediaQuery('(min-width: 768px)');

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <CloudShader
        className="h-full w-full"
        speed={roomy ? 0.4 : 0.28}
        count={roomy ? 6 : 3}
        cloudColor="#ffffff"
        skyTopColor="#4a86c8"
        skyBottomColor="#b8d8f0"
        // Soft cloud forms gain almost nothing from retina resolution, and this
        // layer covers the whole viewport on every route.
        maxDpr={1.5}
      />
      {/*
        Light enough that a real blue survives it, dense enough to keep the page
        from being a saturated slab. The two are traded off directly: deepening
        the sky without loosening this would leave the clouds invisible again,
        which is how the layer got here in the first place. At this value the
        white clouds read against the deepest blue, but it is no longer dense
        enough for the muted/secondary tokens over bare background — text that
        sits directly on the sky uses `--foreground` for that reason.
      */}
      <div className="absolute inset-0 bg-background/35" />
    </div>
  );
}

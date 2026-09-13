'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useVisibleAnimationFrame } from '@/hooks/useVisibleAnimationFrame';

/**
 * Inline text whose glyphs are painted on a canvas and crossed by drifting wave
 * lines.
 *
 * Adapted for this project from the supplied component:
 *  - the animation runs through `useVisibleAnimationFrame`, the same policy the
 *    ambient cloud backdrop uses: one synchronous first paint (a canvas that
 *    waits for an animation frame renders blank in any document that is not being
 *    composited), the loop stops while the tab is hidden, and reduced motion
 *    draws a single static frame instead of redrawing an identical one 60×/s;
 *  - the default colours are the app's own (glyph fill `bg-primary`, wave lines a
 *    fading `var(--accent)` ladder) rather than the demo's blue-on-blue, so it
 *    suits both themes and needs no surface behind it to line up with;
 *  - the palette is read through CSS variables at draw time, so a theme change
 *    repaints instead of leaving stale colours behind;
 *  - the visible text stays in the DOM inside an `aria-hidden` span, with the
 *    canvas exposed as a `role="img"` carrying the same label — the effect is
 *    decoration, the words are still text.
 *
 * It is meant for *emphasis at display size*: the wave lines need strokes thick
 * enough to read, so use it on a phrase, not body copy.
 */

interface CanvasTextProps {
  text: string;
  className?: string;
  /** Glyph fill — a themed class such as `bg-primary`. */
  backgroundClassName?: string;
  /** Wave line colours. Defaults to a fading ladder of `var(--accent)`. */
  colors?: string[];
  animationDuration?: number;
  lineWidth?: number;
  lineGap?: number;
  curveIntensity?: number;
  overlay?: boolean;
}

const LADDER_STEPS = 10;

function resolveColor(color: string): string {
  if (!color.startsWith('var(')) return color;
  const name = color.slice(4, -1).trim();
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return resolved || color;
}

/** Hex to rgba at a given alpha; anything already `rgb()`-shaped is returned as is. */
function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return color;
  const hex =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((char) => char + char)
          .join('')
      : match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

function defaultColors(): string[] {
  const base = resolveColor('var(--accent)');
  return Array.from({ length: LADDER_STEPS }, (_, index) =>
    withAlpha(base, 1 - (index * 0.9) / (LADDER_STEPS - 1))
  );
}

export function CanvasText({
  text,
  className,
  backgroundClassName = 'bg-primary',
  colors,
  animationDuration = 20,
  lineWidth = 1.5,
  lineGap = 4,
  curveIntensity = 12,
  overlay = false,
}: CanvasTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const bgRef = useRef<HTMLSpanElement>(null);
  const dirtyRef = useRef(true);
  const startedAtRef = useRef(0);

  const reducedMotion = useReducedMotion();
  const [bgColor, setBgColor] = useState('#6b7c32');
  const [resolvedColors, setResolvedColors] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [font, setFont] = useState('');

  // The glyph fill and the line palette both come from CSS, so a theme change has
  // to be observed rather than computed once.
  const updateColors = useCallback(() => {
    if (bgRef.current) setBgColor(window.getComputedStyle(bgRef.current).backgroundColor);
    setResolvedColors(colors ? colors.map(resolveColor) : defaultColors());
    dirtyRef.current = true;
  }, [colors]);

  useEffect(() => {
    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [updateColors]);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      const computed = window.getComputedStyle(element);
      setDimensions({
        width: Math.ceil(rect.width) || 0,
        height: Math.ceil(rect.height) || 0,
      });
      setFont(`${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`);
      dirtyRef.current = true;
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, className]);

  const paint = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas || dimensions.width === 0 || dimensions.height === 0 || !font) return;
      if (!resolvedColors.length) return;
      // Reduced motion, or nothing changed since the last frame: leave the last
      // frame alone rather than repainting an identical canvas.
      if (reducedMotion && !dirtyRef.current) return;

      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;

      const { width, height } = dimensions;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      if (startedAtRef.current === 0) startedAtRef.current = now;
      const elapsed = reducedMotion ? 0 : (now - startedAtRef.current) / 1000;
      const phase = (elapsed / animationDuration) * Math.PI * 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Glyph mask, filled with the surface colour, then crossed by the waves.
      ctx.font = font;
      const metrics = ctx.measureText(text);
      const baseline =
        (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;

      ctx.globalCompositeOperation = 'source-over';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#000';
      ctx.fillText(text, 0, baseline);

      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'source-atop';
      const lines = Math.floor(height / lineGap) + 10;
      for (let i = 0; i < lines; i++) {
        const y = i * lineGap;
        const first = Math.sin(phase) * curveIntensity;
        const second = Math.sin(phase + 0.5) * curveIntensity * 0.6;

        ctx.strokeStyle = resolvedColors[i % resolvedColors.length];
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(width * 0.33, y + first, width * 0.66, y + second, width, y);
        ctx.stroke();
      }

      dirtyRef.current = false;
    },
    [
      animationDuration,
      bgColor,
      curveIntensity,
      dimensions,
      font,
      lineGap,
      lineWidth,
      reducedMotion,
      resolvedColors,
      text,
    ]
  );

  useVisibleAnimationFrame(paint);

  // The shared loop paints once synchronously on mount, but the glyph box is only
  // known after a measurement commits, so that first paint bails on a zero-sized
  // box. Repaint the moment an input it gates on changes, so a document that
  // never fires an animation frame (background tab, prerender, a non-composited
  // webview) still shows its final frame instead of a blank canvas.
  useEffect(() => {
    paint(performance.now());
  }, [paint]);

  return (
    <span
      className={cn(
        'relative inline-block align-baseline',
        overlay && 'absolute inset-0',
        className
      )}
    >
      <span
        ref={bgRef}
        className={cn('pointer-events-none absolute h-0 w-0 opacity-0', backgroundClassName)}
        aria-hidden="true"
      />
      <span ref={textRef} className="invisible inline-block" aria-hidden="true">
        {text}
      </span>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute left-0 top-0"
        style={{
          width: dimensions.width || 'auto',
          height: dimensions.height || 'auto',
        }}
        role="img"
        aria-label={text}
      />
    </span>
  );
}

export default CanvasText;

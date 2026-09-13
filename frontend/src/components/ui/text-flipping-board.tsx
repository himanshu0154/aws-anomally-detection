'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Split-flap ("Solari") display board.
 *
 * Adapted for this project from the supplied component:
 *  - `motion/react` is not a dependency here, so every flip is driven by CSS
 *    keyframes (declared in `src/styles/tailwind.css`) plus the `key={flipId}`
 *    remount trick. Zero new packages.
 *  - Tailwind v4-only utilities (`perspective-dramatic`, `transform-3d`,
 *    `backface-hidden`, `mask-t-from-50%`, `aspect-3/6`) do not exist on
 *    Tailwind 3.4.6, so those are inline styles / v3-safe arbitrary values.
 *  - The scramble palette uses this app's status tokens instead of a rainbow,
 *    and the scramble step count is trimmed: a full board update runs one timer
 *    chain per cell, so fewer steps keeps a 132-cell board cheap.
 *
 * Only characters that actually change are animated — `FlapCell` returns early
 * when its target is unchanged, so re-rendering the board with the same text
 * costs nothing.
 */

const FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$()-+&=;:\'"%,./?°';

export const BOARD_ROWS = 6;
export const BOARD_COLS = 22;

const BASE_COL_DELAY = 30;
const BASE_ROW_DELAY = 20;
const BASE_STEP_MS = 55;
const BASE_FLIP_S = 0.35;
const BASE_TOTAL_S =
  ((BOARD_COLS - 1) * BASE_COL_DELAY + (BOARD_ROWS - 1) * BASE_ROW_DELAY + 8 * BASE_STEP_MS) / 1000;

type AccentColor = {
  top: string;
  bottom: string;
  text: string;
};

/** Semantic palette: the board only flashes colours this app already uses. */
const ACCENT_COLORS: AccentColor[] = [
  { top: 'bg-danger', bottom: 'bg-danger', text: 'text-white' },
  { top: 'bg-warning', bottom: 'bg-warning', text: 'text-white' },
  { top: 'bg-positive', bottom: 'bg-positive', text: 'text-white' },
  { top: 'bg-primary', bottom: 'bg-primary', text: 'text-primary-foreground' },
  { top: 'bg-accent', bottom: 'bg-accent', text: 'text-accent-foreground' },
  { top: 'bg-muted', bottom: 'bg-muted', text: 'text-foreground' },
];

/**
 * Glyph size is a function of cell width, not viewport width, so one board can
 * be a compact status strip in the chrome and a large panel on the dashboard.
 * `cqw` resolves against the board's own `container-type: inline-size` wrapper;
 * where container queries are unsupported the declaration is dropped and
 * `.flap-cell-text` in `styles/tailwind.css` supplies a viewport-relative
 * fallback.
 */
const GLYPH_RATIO = 0.62;

function glyphSize(cols: number): string {
  return `calc(100cqw / ${cols} * ${GLYPH_RATIO})`;
}

function cellTextStyle(fontSize: string): React.CSSProperties {
  return { fontSize, lineHeight: 1 };
}

const FLAP_3D: React.CSSProperties = {
  transformStyle: 'preserve-3d',
  backfaceVisibility: 'hidden',
};

function animation(
  name: string,
  duration: number,
  delaySeconds = 0,
  easing = 'linear'
): React.CSSProperties {
  return {
    animationName: name,
    animationDuration: `${duration}s`,
    animationDelay: `${delaySeconds}s`,
    animationTimingFunction: easing,
    animationFillMode: 'both',
  };
}

// ── Individual Split-Flap Character ───────────────────────────────────

const FlapCell = React.memo(
  function FlapCell({
    target,
    delay,
    stepMs,
    flipDuration,
    fontSize,
    aspect,
    instant,
  }: {
    target: string;
    delay: number;
    stepMs: number;
    flipDuration: number;
    fontSize: string;
    aspect: string;
    /** Reduced motion: land on the character with no scramble and no flaps. */
    instant: boolean;
  }) {
    const [current, setCurrent] = useState(' ');
    const [prev, setPrev] = useState(' ');
    const [flipId, setFlipId] = useState(0);
    const [accent, setAccent] = useState<AccentColor | null>(null);
    const [prevAccent, setPrevAccent] = useState<AccentColor | null>(null);
    const curRef = useRef(' ');
    const tgtRef = useRef<string | null>(null);
    const accentRef = useRef<AccentColor | null>(null);
    const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (startTimer.current) clearTimeout(startTimer.current);
      if (stepTimer.current) clearTimeout(stepTimer.current);
      startTimer.current = null;
      stepTimer.current = null;

      const normalized = FLAP_CHARS.includes(target.toUpperCase()) ? target.toUpperCase() : ' ';
      if (normalized === tgtRef.current) return;
      tgtRef.current = normalized;

      if (normalized === ' ' && curRef.current === ' ') return;

      // Nothing to animate for this cell: show it and leave flipId at 0, which
      // also means no flap elements are rendered at all.
      if (instant) {
        curRef.current = normalized;
        setCurrent(normalized);
        return;
      }

      // Trimmed from the original 25-40 / 8-15: a whole board flips at once.
      const scrambleCount =
        normalized === ' ' ? 6 + Math.floor(Math.random() * 5) : 18 + Math.floor(Math.random() * 8);

      const runStep = (i: number) => {
        const isLast = i === scrambleCount;
        const ch = isLast
          ? normalized
          : FLAP_CHARS[1 + Math.floor(Math.random() * (FLAP_CHARS.length - 1))];

        const newAccent =
          isLast || Math.random() >= 0.2
            ? null
            : ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];

        setPrev(curRef.current);
        setPrevAccent(accentRef.current);
        curRef.current = ch;
        accentRef.current = newAccent;
        setCurrent(ch);
        setAccent(newAccent);
        setFlipId((n) => n + 1);

        if (!isLast) stepTimer.current = setTimeout(() => runStep(i + 1), stepMs);
      };

      startTimer.current = setTimeout(() => runStep(1), delay);

      return () => {
        if (startTimer.current) clearTimeout(startTimer.current);
        if (stepTimer.current) clearTimeout(stepTimer.current);
        startTimer.current = null;
        stepTimer.current = null;
        tgtRef.current = null;
      };
    }, [target, delay, stepMs, instant]);

    const show = current === ' ' ? '\u00A0' : current;
    const showPrev = prev === ' ' ? '\u00A0' : prev;

    const textCx =
      'absolute inset-x-0 flex select-none items-center justify-center font-mono font-bold tracking-wide flap-cell-text';
    const topBg = accent?.top ?? 'bg-muted';
    const bottomBg = accent?.bottom ?? 'bg-muted';
    const textColor = accent?.text ?? 'text-foreground';

    const flapTopBg = prevAccent?.top ?? 'bg-card';
    const flapTextColor = prevAccent?.text ?? 'text-foreground';

    const bottomDelay = flipDuration * 0.5;

    return (
      <div
        className="flex flex-col overflow-hidden rounded-[2px] border border-border md:rounded-[3px] md:border-2"
        style={{ aspectRatio: aspect }}
      >
        <div className="relative flex-1" style={{ perspective: '1200px' }}>
          {/* Hinge: the split line and its two corner pins */}
          <div className="absolute inset-0 z-40 hidden flex-row items-center justify-center md:flex">
            <div className="h-1/2 w-px rounded-br-sm rounded-tr-sm bg-border" />
            <div className="h-px flex-1 bg-border" />
            <div className="h-1/2 w-px rounded-bl-sm rounded-tl-sm bg-border" />
          </div>

          {/* Static top half — new character */}
          <div
            className={cn(
              'absolute inset-x-0 top-0 h-[calc(50%-0.5px)] overflow-hidden rounded-t-[3px]',
              topBg
            )}
          >
            <div
              className={cn(textCx, textColor, 'top-0 h-[200%]')}
              style={cellTextStyle(fontSize)}
            >
              {show}
            </div>
          </div>

          {/* Static bottom half — new character */}
          <div
            className={cn(
              'absolute inset-x-0 bottom-0 h-[calc(50%-0.5px)] overflow-hidden rounded-b-[3px]',
              bottomBg
            )}
          >
            <div
              className={cn(textCx, textColor, 'bottom-0 h-[200%]')}
              style={cellTextStyle(fontSize)}
            >
              {show}
            </div>
            {flipId > 0 && (
              <div
                key={`s${flipId}`}
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.8),transparent_60%)]"
                style={animation('flapShadeOut', flipDuration * 1.3, 0, 'ease-out')}
              />
            )}
          </div>

          {/* Folding top flap — old character, folds down */}
          {flipId > 0 && (
            <div
              key={flipId}
              className={cn(
                'absolute inset-x-0 top-0 z-10 h-[calc(50%-0.5px)] origin-bottom overflow-hidden rounded-t-[3px]',
                flapTopBg
              )}
              style={{
                ...FLAP_3D,
                ...animation(
                  'flapFoldTop',
                  flipDuration,
                  0,
                  'cubic-bezier(0.55, 0.055, 0.675, 0.19)'
                ),
              }}
            >
              <div
                className={cn(textCx, flapTextColor, 'top-0 h-[200%]')}
                style={cellTextStyle(fontSize)}
              >
                {showPrev}
              </div>
              <div
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,1))]"
                style={animation('flapShadeIn', flipDuration, 0, 'linear')}
              />
            </div>
          )}

          {/* Rising bottom flap — new character, rises into place */}
          {flipId > 0 && (
            <div
              key={`b${flipId}`}
              className={cn(
                'absolute inset-x-0 bottom-0 z-10 h-[calc(50%-0.5px)] origin-top overflow-hidden rounded-b-[3px]',
                bottomBg
              )}
              style={{
                ...FLAP_3D,
                ...animation(
                  'flapRiseBottom',
                  flipDuration * 0.85,
                  bottomDelay,
                  'cubic-bezier(0.33, 1.55, 0.64, 1)'
                ),
              }}
            >
              <div
                className={cn(textCx, textColor, 'bottom-0 h-[200%]')}
                style={cellTextStyle(fontSize)}
              >
                {show}
              </div>
              <div
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(255,255,255,0),rgba(255,255,255,0.6))]"
                style={animation('flapShadeSoft', flipDuration * 0.85, bottomDelay, 'linear')}
              />
            </div>
          )}

          {/* Resting split line */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-px -translate-y-[0.5px] bg-border" />
        </div>

        {/* Decorative vent stripes */}
        <div
          className="h-1 w-full bg-[repeating-linear-gradient(to_bottom,currentColor_0,currentColor_1px,transparent_1px,transparent_0.15rem)] text-muted-foreground opacity-5 md:h-3 md:bg-[repeating-linear-gradient(to_bottom,currentColor_0,currentColor_1px,transparent_1px,transparent_0.2rem)]"
          style={{ maskImage: 'linear-gradient(to bottom, transparent 50%, black 50%)' }}
        />
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.target === nextProps.target &&
    prevProps.delay === nextProps.delay &&
    prevProps.stepMs === nextProps.stepMs &&
    prevProps.flipDuration === nextProps.flipDuration &&
    prevProps.fontSize === nextProps.fontSize &&
    prevProps.aspect === nextProps.aspect &&
    prevProps.instant === nextProps.instant
);

// ── Colour Tile ───────────────────────────────────────────────────────

/** Tiles can be painted with this app's status colours instead of a rainbow. */
export const COLOR_MAP: Record<string, string> = {
  '{D}': 'var(--danger)',
  '{W}': 'var(--warning)',
  '{P}': 'var(--positive)',
  '{A}': 'var(--accent)',
  '{R}': 'var(--primary)',
  '{N}': 'var(--muted)',
};

const ColorCell = React.memo(function ColorCell({
  color,
  aspect,
}: {
  color: string;
  aspect: string;
}) {
  return (
    <div
      className="rounded-[3px] border-2 border-border"
      style={{ backgroundColor: color, aspectRatio: aspect }}
    />
  );
});

// ── Row parsing and wrapping ──────────────────────────────────────────

type ParsedCell = { type: 'char'; value: string } | { type: 'color'; hex: string };

function parseRow(row: string): ParsedCell[] {
  const cells: ParsedCell[] = [];
  let i = 0;
  while (i < row.length) {
    if (row[i] === '{' && i + 2 < row.length && row[i + 2] === '}') {
      const code = row.substring(i, i + 3);
      if (COLOR_MAP[code]) {
        cells.push({ type: 'color', hex: COLOR_MAP[code] });
        i += 3;
        continue;
      }
    }
    cells.push({ type: 'char', value: row[i] });
    i++;
  }
  return cells;
}

function wrapParagraph(paragraph: string, maxCols: number): string[] {
  const lines: string[] = [];
  const words = paragraph.split(/[ \t]+/).filter(Boolean);
  let currentLine = '';

  for (const word of words) {
    if (word.length > maxCols) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      lines.push(word.slice(0, maxCols));
      continue;
    }

    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxCols) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function wrapText(input: string, maxCols: number): string[] {
  return input
    .split('\n')
    .flatMap((paragraph) => (paragraph.trim() === '' ? [''] : wrapParagraph(paragraph, maxCols)));
}

// ── Board ─────────────────────────────────────────────────────────────

export interface TextFlippingBoardProps {
  /** Fixed rows, left-aligned from the first column (each row ≤ `cols`). */
  rows?: string[];
  /** Free text, word-wrapped and centred. `rows` takes precedence when both are given. */
  text?: string;
  className?: string;
  /** Rows on the board. Defaults to 6. */
  rowCount?: number;
  /** Characters per row. Defaults to 22. */
  cols?: number;
  /** Cell width:height ratio. Defaults to `1 / 2`; a strip of chrome wants squarer flaps. */
  cellAspect?: string;
  /** Total animation duration in seconds. Defaults to ~1.2s. */
  duration?: number;
}

export function TextFlippingBoard({
  rows: rowsProp,
  text,
  className,
  rowCount = BOARD_ROWS,
  cols = BOARD_COLS,
  cellAspect = '1 / 2',
  duration = BASE_TOTAL_S,
}: TextFlippingBoardProps) {
  const reducedMotion = useReducedMotion();
  const scale = duration / BASE_TOTAL_S;
  const colDelay = BASE_COL_DELAY * scale;
  const rowDelay = BASE_ROW_DELAY * scale;
  const stepMs = BASE_STEP_MS * scale;
  const flipDur = Math.min(0.6, Math.max(0.15, BASE_FLIP_S * scale));

  const board = useMemo(() => {
    const grid: ParsedCell[][] = Array.from({ length: rowCount }, () =>
      Array.from({ length: cols }, () => ({ type: 'char' as const, value: ' ' }))
    );

    if (rowsProp) {
      rowsProp.slice(0, rowCount).forEach((row, r) => {
        parseRow(row.toUpperCase())
          .slice(0, cols)
          .forEach((cell, c) => {
            grid[r][c] = cell;
          });
      });
      return grid;
    }

    if (text) {
      const lines = wrapText(text, cols).slice(0, rowCount);
      const startRow = Math.max(0, Math.floor((rowCount - lines.length) / 2));
      lines.forEach((line, i) => {
        const row = startRow + i;
        if (row >= rowCount) return;
        const parsed = parseRow(line.toUpperCase());
        const startCol = Math.max(0, Math.floor((cols - parsed.length) / 2));
        parsed.forEach((cell, c) => {
          if (startCol + c < cols) grid[row][startCol + c] = cell;
        });
      });
    }

    return grid;
  }, [rowsProp, text, rowCount, cols]);

  return (
    // Surface styling (radius, padding, shadow, borders) is left to the caller:
    // this repo has no `tailwind-merge`, so a `p-2` baked in here would silently
    // beat a caller's `p-1.5` — stylesheet order decides, not class order.
    <div className={cn('relative mx-auto w-full max-w-3xl bg-card', className)}>
      {/* `container-type` is what lets each cell size its glyph from the board's own
          width rather than the viewport. */}
      <div
        className="grid gap-px md:gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, containerType: 'inline-size' }}
      >
        {board.map((row, r) =>
          row.map((cell, c) =>
            cell.type === 'color' ? (
              <ColorCell key={`${r}-${c}`} color={cell.hex} aspect={cellAspect} />
            ) : (
              <FlapCell
                key={`${r}-${c}`}
                target={cell.value}
                delay={c * colDelay + r * rowDelay}
                stepMs={stepMs}
                flipDuration={flipDur}
                fontSize={glyphSize(cols)}
                aspect={cellAspect}
                instant={reducedMotion}
              />
            )
          )
        )}
      </div>
    </div>
  );
}

export default TextFlippingBoard;

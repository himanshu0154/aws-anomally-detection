import React from 'react';
import { cn } from '@/lib/utils';

/**
 * A blurred, slowly moving halo that paints around and behind whatever it is
 * placed with.
 *
 * Adapted for this project from the supplied component:
 *  - **no `motion/react`** (not a dependency here): the demo animated a set of
 *    gradient stops with framer-motion; here the halo is a CSS gradient over the
 *    demo's two modes — `colorShift` slides the gradient along itself, `pulse`
 *    breathes its opacity — so the effect costs no React work at all;
 *  - `blur` is a named scale (`soft` / `medium` / `strong`) rather than the
 *    demo's raw px string, so call sites cannot drift apart, and the colour list
 *    is a plain array of any CSS colour, which is how the app feeds it its
 *    `--primary` / `--accent` / `--danger` tokens;
 *  - `scale` pulls the layer in behind its host (the demo's default `0.9`), so
 *    only the blurred bleed shows beyond the host's edges — the host itself is
 *    what reads as a button, the halo is what reads as "act here";
 *  - the halo is `aria-hidden`, `pointer-events-none`, and carries no text, so a
 *    screen reader never learns about it;
 *  - the gradient's first colour is repeated at the end, which is what makes the
 *    `colorShift` slide loop without a visible seam;
 *  - reduced motion freezes the halo rather than removing it: it is the mark of
 *    the one action that resolves a broken state, so the state stays visible even
 *    when the movement does not.
 *
 * **Placement.** Render it as the first child of a `relative` host that carries
 * the radius you want (`relative rounded-lg`), then give the host's own content
 * `relative` so it paints above the halo. This is deliberately *not* an ambient
 * decoration: put it behind at most one action per screen — the single control
 * that resolves the state the screen is complaining about. A glow on two things
 * is a glow on nothing.
 */
export interface GlowEffectProps {
  /**
   * Colours the halo cycles through. Any CSS colour. At least two, and the slide
   * loops seamlessly because the first is repeated at the end.
   */
  colors: string[];
  /**
   * How the halo moves.
   * - `colorShift` slides the colour stops along the gradient.
   * - `pulse` breathes the halo's opacity.
   * @default 'colorShift'
   */
  mode?: 'colorShift' | 'pulse';
  /**
   * Radius of the blur. `soft` is a tight halo just past the host's edge,
   * `strong` a wide wash far past it.
   * @default 'soft'
   */
  blur?: 'soft' | 'medium' | 'strong';
  /**
   * Seconds for one full cycle.
   * @default 3
   */
  duration?: number;
  /**
   * Scale of the halo relative to its host. Below 1 keeps it behind the host's
   * edges; above 1 pushes it out past them.
   * @default 0.95
   */
  scale?: number;
  /**
   * Opacity of the halo at its dimmest. The `pulse` mode breathes up from here.
   * @default 0.7
   */
  opacity?: number;
  className?: string;
}

const BLUR_PX: Record<NonNullable<GlowEffectProps['blur']>, number> = {
  soft: 18,
  medium: 32,
  strong: 52,
};

export function GlowEffect({
  colors,
  mode = 'colorShift',
  blur = 'soft',
  duration = 3,
  scale = 0.95,
  opacity = 0.7,
  className,
}: GlowEffectProps) {
  const stops = colors.length > 0 ? colors : ['var(--primary)', 'var(--accent)'];
  // First colour repeated at the end so a 200%-wide tile loops without a seam.
  const gradient = `linear-gradient(90deg, ${[...stops, stops[0]].join(', ')})`;

  return (
    <div
      aria-hidden="true"
      className={cn(
        // No negative z-index: `-10` would drop the halo behind the page's own
        // backgrounds (the app paints its cloud backdrop at `-z-10`), so the halo
        // relies on document order instead — first child, with the host's content
        // made `relative` so it paints after.
        'glow-effect pointer-events-none absolute inset-0 rounded-[inherit]',
        mode === 'pulse' ? 'glow-effect-pulse' : 'glow-effect-shift',
        className
      )}
      style={
        {
          '--glow-duration': `${duration}s`,
          '--glow-scale': scale,
          '--glow-rest': opacity,
          '--glow-peak': Math.min(1, opacity + 0.25),
          '--glow-blur': `${BLUR_PX[blur]}px`,
          backgroundImage: gradient,
        } as React.CSSProperties
      }
    />
  );
}

export default GlowEffect;

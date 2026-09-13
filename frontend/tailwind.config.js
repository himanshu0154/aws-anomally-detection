/**
 * Theme colours are declared as `rgb(var(--x-rgb) / <alpha-value>)` rather than
 * `var(--x)`. With a plain `var()` value Tailwind cannot inject an alpha channel,
 * so it silently emits *no rule at all* for classes like `bg-card/60` or
 * `border-primary/40` — which is how the app's translucent surfaces (the sticky
 * header, scrims, status tints) ended up fully transparent. The hex values stay
 * in `styles/tailwind.css` for the places that use `var(--x)` directly, such as
 * inline styles and SVG attributes.
 */
const rgb = (name) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        background: rgb('background'),
        foreground: rgb('foreground'),
        primary: {
          DEFAULT: rgb('primary'),
          foreground: rgb('primary-foreground'),
        },
        secondary: {
          DEFAULT: rgb('secondary'),
          foreground: rgb('secondary-foreground'),
        },
        accent: {
          DEFAULT: rgb('accent'),
          foreground: rgb('accent-foreground'),
        },
        muted: {
          DEFAULT: rgb('muted'),
          foreground: rgb('muted-foreground'),
        },
        card: {
          DEFAULT: rgb('card'),
          foreground: rgb('card-foreground'),
        },
        border: rgb('border'),
        input: rgb('input'),
        ring: rgb('ring'),
        positive: rgb('positive'),
        warning: rgb('warning'),
        danger: rgb('danger'),
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 0.25rem)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 0.25rem)',
        '2xl': 'calc(var(--radius) + 0.5rem)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

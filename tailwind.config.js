/**
 * Tailwind mapped onto the design tokens (DESIGN_SPEC.md §8). Every colour is a CSS variable from
 * src/styles/tokens.css, so there is one source of truth and no hex values in components.
 *
 * Preflight is off: the host portal's base.css already does the reset, and Tailwind's would restyle the host.
 * The few resets this UI needs are scoped to `.bf` in src/styles/bf.css.
 */
const scale = (prefix, steps) => Object.fromEntries(steps.map((s) => [s, `var(--${prefix}-${s})`]));
const status = (name) => ({
  DEFAULT: `var(--${name}-strong)`,
  mid: `var(--${name}-mid)`,
  subtle: `var(--${name}-subtle)`,
});

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/agents/agent2/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    // Spec §4: 4px inputs/buttons/tags, 8px cards, 12px modals. Round only for indicator dots and the spinner.
    borderRadius: {
      none: '0',
      DEFAULT: 'var(--radius-sm)',
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      full: '9999px',
    },
    // Spec §4: borders over shadows. A soft shadow only for popovers, menus and modals.
    boxShadow: {
      none: 'none',
      DEFAULT: 'none',
      pop: '0 2px 8px rgba(14, 30, 58, 0.12)',
    },
    extend: {
      colors: {
        heading: 'var(--color-text-heading)',
        body: 'var(--color-text-body)',
        link: { DEFAULT: 'var(--color-text-link)', hover: 'var(--tea-700)' }, // always underlined
        page: 'var(--color-bg-page)',
        surface: 'var(--color-bg-surface)',
        primary: {
          DEFAULT: 'var(--color-btn-primary-bg)',
          hover: 'var(--color-btn-primary-bg-hover)',
        },
        'secondary-hover': 'var(--color-btn-secondary-bg-hover)',
        highlight: {
          DEFAULT: 'var(--color-highlight-bg)',
          border: 'var(--color-highlight-border)',
        },
        accent: 'var(--color-border-accent)', // border/graphic emphasis only; 3.5:1 on white, not for text
        line: 'var(--color-border-default)',
        success: status('success'),
        error: { ...status('error'), faint: 'var(--error-faint)' },
        warning: status('warning'),
        info: status('info'),
        neutral: status('neutral'),
        neu: scale(
          'neu',
          [
            50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,
            950, 1000,
          ],
        ),
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
    },
  },
  plugins: [],
};

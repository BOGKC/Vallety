/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // hover: utilities apply only on devices that actually support hover, so
  // they never get "stuck" on touch tablets after a tap.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        /* Backgrounds */
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-card': 'var(--bg-card)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-input': 'var(--bg-input)',

        /* Brand / accent (mode-aware) */
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          muted: 'var(--color-accent-muted)',
        },

        /* Semantic */
        success: {
          DEFAULT: 'var(--color-success)',
          muted: 'var(--color-success-muted)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          muted: 'var(--color-warning-muted)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          muted: 'var(--color-danger-muted)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          muted: 'var(--color-info-muted)',
        },

        /* Text */
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-inverse': 'var(--text-inverse)',

        /* Borders (also usable as colors) */
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
        'border-accent': 'var(--border-accent)',

        /* Legacy aliases — keep existing components rendering */
        brand: 'var(--color-brand)',
        business: 'var(--color-business)',
        investment: 'var(--color-investment)',
        border: 'var(--color-border)',
      },
      borderColor: {
        subtle: 'var(--border-subtle)',
        DEFAULT: 'var(--border-default)',
        hover: 'var(--border-hover)',
        strong: 'var(--border-strong)',
        accent: 'var(--border-accent)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      transitionDuration: {
        instant: '100ms',
        fast: '180ms',
        base: '280ms',
        slow: '450ms',
        deliberate: '650ms',
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
        back: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
        smooth: 'cubic-bezier(0.65, 0, 0.35, 1)',
        spring: 'cubic-bezier(0.22, 1.2, 0.36, 1)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        inter: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surface colors — CSS-variable driven for dark/light themes
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          card: 'rgb(var(--surface-card) / <alpha-value>)',
          border: 'rgb(var(--surface-border) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted) / <alpha-value>)',
        },
        // Override the slate scale so all text-slate-* classes are theme-aware.
        // Values are R G B triples (space-separated) so opacity modifiers work.
        slate: {
          50:  'rgb(var(--sl-50)  / <alpha-value>)',
          100: 'rgb(var(--sl-100) / <alpha-value>)',
          200: 'rgb(var(--sl-200) / <alpha-value>)',
          300: 'rgb(var(--sl-300) / <alpha-value>)',
          400: 'rgb(var(--sl-400) / <alpha-value>)',
          500: 'rgb(var(--sl-500) / <alpha-value>)',
          600: 'rgb(var(--sl-600) / <alpha-value>)',
          700: 'rgb(var(--sl-700) / <alpha-value>)',
          800: 'rgb(var(--sl-800) / <alpha-value>)',
          900: 'rgb(var(--sl-900) / <alpha-value>)',
          950: 'rgb(var(--sl-950) / <alpha-value>)',
        },
        // Accent color — driven by a CSS variable so the color picker works
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dim:     'rgb(var(--accent-dim) / <alpha-value>)',
          subtle:  'rgb(var(--accent) / 0.15)',
        },
      },
    },
  },
  plugins: [],
}

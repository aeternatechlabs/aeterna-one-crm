/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          50: 'var(--color-maroon-50)',
          100: 'var(--color-maroon-100)',
          500: 'var(--color-maroon-500)',
          600: 'var(--color-maroon-600)',
          700: 'var(--color-maroon-700)',
          800: 'var(--color-maroon-800)',
          900: 'var(--color-maroon-900)',
          950: 'var(--color-maroon-950)',
        },
        gold: {
          50: 'var(--color-gold-50)',
          100: 'var(--color-gold-100)',
          200: 'var(--color-gold-200)',
          300: 'var(--color-gold-300)',
          400: 'var(--color-gold-400)',
          500: 'var(--color-gold-500)',
          600: 'var(--color-gold-600)',
          700: 'var(--color-gold-700)',
          800: 'var(--color-gold-800)',
          900: 'var(--color-gold-900)',
        },
        canvas: {
          DEFAULT: 'var(--color-bg-canvas)',
          subtle: 'var(--color-bg-canvas-subtle)',
          muted: 'var(--color-bg-muted)',
        },
        surface: {
          DEFAULT: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-surface-elevated)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          DEFAULT: 'var(--color-border-default)',
          gold: 'var(--color-border-gold)',
          maroon: 'var(--color-border-maroon)',
        },
        txt: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          gold: 'var(--color-text-gold)',
          maroon: 'var(--color-text-maroon)',
        },
      },
      boxShadow: {
        'warm-xs': 'var(--shadow-warm-xs)',
        'warm-sm': 'var(--shadow-warm-sm)',
        'warm-md': 'var(--shadow-warm-md)',
        'warm-lg': 'var(--shadow-warm-lg)',
        'warm-glow': 'var(--shadow-warm-glow)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

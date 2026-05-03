/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-text-primary)',
        panel: 'var(--color-bg)',
        sand: 'var(--color-surface-secondary)',
        brand: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        flame: 'var(--color-flame)',
        charcoal: 'var(--color-charcoal)',
        surface: 'var(--color-surface)',
        elevated: 'var(--color-surface-elevated)',
        muted: 'var(--color-text-muted)'
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        card: 'var(--shadow-card)'
      }
    }
  },
  plugins: []
};

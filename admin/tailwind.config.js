/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#18181b',
        panel: '#fff9f2',
        sand: '#f5efe4',
        brand: '#d9481c',
        accent: '#0f766e'
      },
      boxShadow: {
        soft: '0 20px 45px rgba(24, 24, 27, 0.08)'
      }
    }
  },
  plugins: []
};

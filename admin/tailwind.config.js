/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#110b07',
        panel: '#fff7df',
        sand: '#ffe6b5',
        brand: '#ff3218',
        accent: '#ffd733'
      },
      boxShadow: {
        soft: '0 18px 46px rgba(83, 33, 8, 0.12)'
      }
    }
  },
  plugins: []
};

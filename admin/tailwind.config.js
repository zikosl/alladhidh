/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#100b08',
        panel: '#fffaf0',
        sand: '#f7e4be',
        brand: '#e93218',
        accent: '#f7c928'
      },
      boxShadow: {
        soft: '0 18px 42px rgba(52, 27, 13, 0.1)'
      }
    }
  },
  plugins: []
};

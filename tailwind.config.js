/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cacao: {
          50: '#f9f5f1',
          100: '#efe4d8',
          200: '#e4d2bf',
          600: '#7a4b2a',
          700: '#5f371d',
          900: '#2f1a0e',
        },
        mint: {
          100: '#e4f6ee',
          500: '#2e9f73',
          700: '#1e7050',
        },
      },
      boxShadow: {
        card: '0 12px 28px -16px rgba(59, 34, 21, 0.45)',
      },
    },
  },
  plugins: [],
}


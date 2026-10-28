// Tailwind config for SolarSight only (src/solarsight). The ArcGIS app keeps tailwind.config.cjs (TailAdmin
// theme); src/solarsight/styles.css selects this file with @config, so neither app changes the other's styles.
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./solarsight/index.html', './src/solarsight/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
        display: ['Fraunces', 'Georgia', ...defaultTheme.fontFamily.serif],
      },
      colors: {
        ink: { DEFAULT: '#0b1220', 800: '#111a2e', 700: '#1a2540' },
        paper: { DEFAULT: '#f6f3ec', 200: '#ece6da', 300: '#ddd5c5' },
        sun: { 50: '#fff8e6', 100: '#ffefc2', 300: '#ffd166', 400: '#ffc233', 500: '#f5a400', 600: '#d48a00' },
      },
      boxShadow: {
        float: '0 10px 30px -12px rgba(11, 18, 32, 0.35)',
      },
    },
  },
  plugins: [],
};

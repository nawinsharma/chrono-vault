/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        vault: {
          black: '#0A0A0F',
          dark: '#12121A',
          card: '#1A1A2E',
          border: '#2A2A3E',
          purple: '#8B5CF6',
          blue: '#3B82F6',
          cyan: '#06B6D4',
          pink: '#EC4899',
          muted: '#6B7280',
          text: '#E5E7EB',
          white: '#F9FAFB',
        },
      },
      fontFamily: {
        sans: ['Inter'],
        mono: ['SpaceMono'],
      },
    },
  },
  plugins: [],
};

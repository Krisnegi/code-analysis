import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0d14',
          card: '#121824',
          border: '#1f293d',
          accent: '#3b82f6'
        }
      }
    }
  },
  plugins: []
} satisfies Config

import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edf7ff',
          100: '#d7ecff',
          200: '#b6deff',
          300: '#83c9ff',
          400: '#48abff',
          500: '#1f88ff',
          600: '#0b6de6',
          700: '#0f57b4',
          800: '#134a8f',
          900: '#173f76'
        }
      },
      boxShadow: {
        panel: '0 10px 25px -15px rgba(17, 24, 39, 0.45)'
      }
    }
  },
  plugins: []
} satisfies Config

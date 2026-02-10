/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark neutral theme
        background: {
          DEFAULT: '#0b0f14',
          secondary: '#12171d',
          tertiary: '#1a2028',
        },
        surface: {
          DEFAULT: '#1a2028',
          hover: '#232b35',
          active: '#2c3642',
        },
        border: {
          DEFAULT: '#2c3642',
          light: '#3a4654',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          muted: '#1e3a5f',
        },
        success: {
          DEFAULT: '#22c55e',
          muted: '#14532d',
        },
        warning: {
          DEFAULT: '#f59e0b',
          muted: '#78350f',
        },
        error: {
          DEFAULT: '#ef4444',
          muted: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

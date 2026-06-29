/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VEGGI CHIKN — dark + neon theme
        background: {
          DEFAULT: '#06080a',
          secondary: '#0b0f12',
          tertiary: '#11161b',
        },
        surface: {
          DEFAULT: '#11161b',
          hover: '#181f26',
          active: '#222b34',
        },
        border: {
          DEFAULT: '#1e262e',
          light: '#2c3742',
        },
        text: {
          primary: '#f2f5f3',
          secondary: '#9aa4a0',
          muted: '#5f6a64',
        },
        // neon green brand accent. `fg` is the readable text color to use ON accent.
        accent: {
          DEFAULT: '#39ff14',
          hover: '#2fe00d',
          muted: '#10330a',
          fg: '#05140a',
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
          DEFAULT: '#ff3b3b',
          muted: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 30px rgba(57,255,20,0.35)',
        'glow-sm': '0 0 16px rgba(57,255,20,0.30)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(57,255,20,0.6)' },
          '70%': { boxShadow: '0 0 0 16px rgba(57,255,20,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(57,255,20,0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s infinite',
      },
    },
  },
  plugins: [],
}

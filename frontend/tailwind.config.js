/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0e17',
          secondary: '#111827',
          card: '#1a1f2e',
          hover: '#242937',
        },
        accent: {
          green: '#00d68f',
          red: '#ff3d71',
          blue: '#3366ff',
          yellow: '#ffaa00',
          cyan: '#00cfff',
        },
        text: {
          primary: '#e4e6eb',
          secondary: '#8b95a5',
          muted: '#5a6478',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'flash-green': 'flashGreen 0.5s ease-out',
        'flash-red': 'flashRed 0.5s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        flashGreen: {
          '0%': { backgroundColor: 'rgba(0, 214, 143, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashRed: {
          '0%': { backgroundColor: 'rgba(255, 61, 113, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        pulseDot: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.3 },
        },
      },
    },
  },
  plugins: [],
};

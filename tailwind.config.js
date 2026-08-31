/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'deep': {
          900: '#0a0e1a',
          800: '#111827',
          700: '#1e293b',
          600: '#334155',
        },
        'cyan-glow': '#00d4ff',
        'purple-accent': '#a855f7',
        'real-axis': '#ef4444',
        'imag-axis': '#22c55e',
      },
      fontFamily: {
        'mono': ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        'display': ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 212, 255, 0.35)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.4)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.4)' },
          '50%': { boxShadow: '0 0 18px rgba(0, 212, 255, 0.8)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

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
        /* 颜色走 CSS 变量（rgb 分量），以支持黑夜/白天主题切换 */
        'deep': {
          900: 'rgb(var(--c-deep-900) / <alpha-value>)',
          800: 'rgb(var(--c-deep-800) / <alpha-value>)',
          700: 'rgb(var(--c-deep-700) / <alpha-value>)',
          600: 'rgb(var(--c-deep-600) / <alpha-value>)',
        },
        'slate': {
          50:  'rgb(var(--c-slate-50) / <alpha-value>)',
          100: 'rgb(var(--c-slate-100) / <alpha-value>)',
          200: 'rgb(var(--c-slate-200) / <alpha-value>)',
          300: 'rgb(var(--c-slate-300) / <alpha-value>)',
          400: 'rgb(var(--c-slate-400) / <alpha-value>)',
          500: 'rgb(var(--c-slate-500) / <alpha-value>)',
          600: 'rgb(var(--c-slate-600) / <alpha-value>)',
          700: 'rgb(var(--c-slate-700) / <alpha-value>)',
          800: 'rgb(var(--c-slate-800) / <alpha-value>)',
          900: 'rgb(var(--c-slate-900) / <alpha-value>)',
        },
        'cyan-glow': 'rgb(var(--c-cyan-glow) / <alpha-value>)',
        'purple-accent': 'rgb(var(--c-purple-accent) / <alpha-value>)',
        'real-axis': 'rgb(var(--c-real-axis) / <alpha-value>)',
        'imag-axis': 'rgb(var(--c-imag-axis) / <alpha-value>)',
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

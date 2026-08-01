/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#4f46e5',
          fg: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)' } },
        flip: { '0%': { transform: 'rotateX(0)' }, '100%': { transform: 'rotateX(-90deg)' } },
        appear: { '0%': { opacity: '0', transform: 'scale(.8)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-6px)' }, '40%,80%': { transform: 'translateX(6px)' } },
        drop: { 'from': { transform: 'translateY(-12px)', opacity: '0' }, 'to': { transform: 'translateY(0)', opacity: '1' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        damage: { '0%': { transform: 'scale(.6)', opacity: '0' }, '30%': { transform: 'scale(1.1)', opacity: '1' }, '100%': { transform: 'scale(1) translateY(-10px)', opacity: '0' } },
      },
      animation: {
        pop: 'pop .18s ease-in-out',
        appear: 'appear .15s ease-out',
        shake: 'shake .4s ease-in-out',
        drop: 'drop .25s ease-out',
        float: 'float 2s ease-in-out infinite',
        damage: 'damage .7s ease-out forwards',
      },
    },
  },
  plugins: [],
}

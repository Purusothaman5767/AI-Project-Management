/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{tsx,ts,jsx,js}',
    './index.html',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#8B5CF6', foreground: '#F5F5F5' },
        secondary: { DEFAULT: 'hsl(150,70%,44%)', foreground: 'hsl(0,0%,100%)' },
        background: 'hsl(0,0%,100%)',
        foreground: 'hsl(222,22%,20%)',
        muted: { DEFAULT: 'hsl(210,16%,93%)', foreground: 'hsl(215,9%,45%)' },
        accent: { DEFAULT: 'hsl(240,4%,95%)', foreground: 'hsl(222,22%,20%)' },
        destructive: { DEFAULT: 'hsl(0,78%,58%)', foreground: 'hsl(0,0%,100%)' },
        border: 'hsl(210,16%,90%)',
        input: 'hsl(210,16%,96%)',
        ring: 'hsl(220,90%,56%)',
      },
      borderRadius: { lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
      fontFamily: { sans: ['Inter var', 'system-ui', 'sans-serif'] },
      spacing: {
        0: '0px', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem',
        5: '1.25rem', 6: '1.5rem', 7: '1.75rem', 8: '2rem', 9: '2.25rem', 10: '2.5rem',
      },
      keyframes: { spin: { to: { transform: 'rotate(360deg)' } } },
      animation: { spin: 'spin 1s linear infinite' },
    },
  },
  plugins: [],
};

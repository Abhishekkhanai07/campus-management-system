/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#16263F', 700: '#1E3352', 600: '#2A4468', 300: '#8FA3BE' },
        canvas: '#F4F6F9',
        line: '#E1E7EF',
        teal: { DEFAULT: '#0E7C6B', dark: '#0A6155', light: '#E6F3F0' },
        amber: { DEFAULT: '#B45309', light: '#FDF3E3' },
        rose: { DEFAULT: '#B42318', light: '#FDECEA' },
        grass: { DEFAULT: '#15803D', light: '#EAF6EE' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        rail: '1px 0 0 rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};

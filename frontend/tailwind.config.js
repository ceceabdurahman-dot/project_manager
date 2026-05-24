/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2E6DA4', light: '#D6E4F0', dark: '#1E3A5F' },
        accent:  { DEFAULT: '#e07b39' },
        success: { DEFAULT: '#2E7D57' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};

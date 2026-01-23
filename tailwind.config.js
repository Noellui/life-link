/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#D92626', // A custom blood red color
          dark: '#0F172A',
        }
      }
    },
  },
  plugins: [],
}
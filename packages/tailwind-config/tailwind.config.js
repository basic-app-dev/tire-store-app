const { automotiveTokens } = require('./tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [],
  theme: {
    extend: {
      colors: {
        ...automotiveTokens.colors,
        brand: {
          DEFAULT: automotiveTokens.colors.raceRed[600],
          dark: automotiveTokens.colors.raceRed[700],
          light: automotiveTokens.colors.raceRed[500],
        },
        surface: {
          dark: automotiveTokens.colors.asphalt[900],
          darker: automotiveTokens.colors.asphalt[950],
          card: automotiveTokens.colors.asphalt[800],
        },
      },
      fontFamily: automotiveTokens.fontFamily,
      boxShadow: automotiveTokens.boxShadow,
      borderRadius: automotiveTokens.borderRadius,
    },
  },
  plugins: [],
};

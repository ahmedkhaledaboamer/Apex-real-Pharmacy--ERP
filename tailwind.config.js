/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        brand: {
          // Apex Aora Pharmacy — primary CTA gradient: purple → blue (matches the infinity logo)
          gold: '#7A1FB8',       // logo purple
          goldLight: '#0672DF',  // logo blue

          // soft lavender tints (card backgrounds, soft pink role)
          pink: '#F1E7FA',
          pinkDark: '#D7BDF0',

          // soft blue tints (card backgrounds, peach/sky role)
          peach: '#E2EEFC',
          peachDark: '#A6C8F3',

          // alternate cool tints (purple role)
          purple: '#ECE4FA',
          purpleDark: '#C2CFF2',

          // very pale neutrals
          cream: '#F8F5FD',
          beige: '#F1F5FC',

          // deep navy from the APEXAORA wordmark (footer, headings)
          dark: '#0B1F5C',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      }
    },
  },
  plugins: [],
}

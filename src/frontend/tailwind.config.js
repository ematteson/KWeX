/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pearson brand colors
        pearson: {
          blue: '#007fa3',
          'blue-dark': '#005a70',
          'blue-light': '#4da8c7',
          green: '#00857c',
          orange: '#f5a623',
          red: '#d32f2f',
          gray: {
            50: '#f8f9fa',
            100: '#f1f3f5',
            200: '#e9ecef',
            300: '#dee2e6',
            400: '#ced4da',
            500: '#adb5bd',
            600: '#868e96',
            700: '#495057',
            800: '#343a40',
            900: '#212529',
          }
        },
        // Metric status colors
        metric: {
          excellent: '#22c55e',  // green-500
          good: '#84cc16',       // lime-500
          warning: '#f59e0b',    // amber-500
          poor: '#ef4444',       // red-500
        }
      },
      fontFamily: {
        sans: ['Open Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

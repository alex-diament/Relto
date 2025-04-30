/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
      extend: {
        animation: {
          'fade-in': 'fadeIn 0.8s ease-out both',
          'expand-in': 'expandIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both'
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' }
          },
          expandIn: {
            '0%': {
              transform: 'scale(0.2) translate(-10px, -10px)',
              opacity: '0'
            },
            '100%': {
              transform: 'scale(1) translate(0, 0)',
              opacity: '1'
            }
          }
        }
      }
    },
    plugins: []
  }
  
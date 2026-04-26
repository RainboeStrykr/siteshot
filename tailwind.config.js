const colors = require("tailwindcss/colors");

module.exports = {
  content: [
    "./ui/src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: colors.zinc,
        // SiteShot color palette
        based: {
          // soften dark palette
          dark: '#0f1215',
          darkgray: '#161a21',
          gray: '#20252e',
          lightgray: '#2a303b',
          purple: {
            DEFAULT: '#9D00FF', // kept for compatibility
            dark: '#7A00C7',
            light: '#BE55FF',
            lighter: '#D599FF'
          },
          accent: '#FFFFFF'
        },
        // Modern gradient accent (violet to pink)
        accent: {
          start: '#0b2a6f',
          end: '#0b2a6f'
        },
        brand: {
          accent: '#1DB954',
          bg: '#FFFFFF',
          text: '#000000',
          secondaryText: '#555555',
          border: '#E5E7EB',
          inputBg: '#F9FAFB',
        }
      },
      fontFamily: {
        sans: [
          'Manrope',
          '-apple-system',
          'BlinkMacSystemFont',
          'San Francisco',
          'SF Pro Display',
          'SF Pro Text',
          'Helvetica Neue',
          'Helvetica',
          'sans-serif',
        ],
        heading: [
          '"Plus Jakarta Sans"',
          'sans-serif'
        ],
        mono: [
          'SF Mono',
          'SFMono-Regular',
          'ui-monospace',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'soft-xl': '0 30px 80px rgba(0,0,0,0.45)',
        'soft-md': '0 12px 30px rgba(0,0,0,0.35)'
      },
      borderRadius: {
        '2.5xl': '1.25rem'
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};


/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '320px',
      'sm': '375px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Chinese mobile market specific breakpoints
      'mobile-s': '320px',
      'mobile-m': '375px',
      'mobile-l': '425px',
      'tablet': '768px',
      // Touch-optimized breakpoints
      'touch': {'raw': '(hover: none) and (pointer: coarse)'},
      'mouse': {'raw': '(hover: hover) and (pointer: fine)'},
    },
    extend: {
      colors: {
        // Primary ACG-inspired palette
        'mint': {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6e0',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Primary mint - matches mascot
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        'sakura': {
          50: '#fef7f7',
          100: '#feecec',
          200: '#fdd8d8',
          300: '#fcb5b5',
          400: '#f98080',
          500: '#f56565', // Sakura pink
          600: '#e53e3e',
          700: '#c53030',
          800: '#9b2c2c',
          900: '#742a2a',
        },
        'cosmic': {
          50: '#f0f4ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // Cosmic purple
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        'neon': {
          50: '#f0fff4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Neon green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        'sunset': {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Sunset orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Neutral palette for backgrounds and text
        'pearl': {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        'obsidian': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        'display': ['Inter', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(20, 184, 166, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(20, 184, 166, 0.8)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'acg-gradient': 'linear-gradient(135deg, #14b8a6 0%, #6366f1 50%, #f56565 100%)',
        // WeChat-style gradients
        'wechat-green': 'linear-gradient(135deg, #1aad19 0%, #00d100 100%)',
        'alipay-blue': 'linear-gradient(135deg, #1677ff 0%, #40a9ff 100%)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        // Touch-friendly spacing
        'touch-sm': '2.75rem', // 44px minimum
        'touch-md': '3rem',     // 48px
        'touch-lg': '3.5rem',   // 56px
        'touch-xl': '4rem',     // 64px
        // Safe area spacing
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch': '2.75rem', // 44px minimum touch target
        'screen-mobile': '100vh',
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
      maxWidth: {
        'mobile': '425px',
        'mobile-content': '100vw',
      },
      fontSize: {
        // Chinese mobile optimized font sizes
        'mobile-xs': ['0.75rem', { lineHeight: '1rem' }],
        'mobile-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'mobile-base': ['1rem', { lineHeight: '1.5rem' }],
        'mobile-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'mobile-xl': ['1.25rem', { lineHeight: '1.75rem' }],
        'mobile-2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      // Touch interaction utilities
      cursor: {
        'touch': 'pointer',
      },
      // Mobile performance optimizations
      transitionDuration: {
        '50': '50ms',
        '100': '100ms',
      },
      // Chinese mobile shadows
      boxShadow: {
        'mobile': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'mobile-lg': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'wechat': '0 2px 12px rgba(26, 173, 25, 0.15)',
        'alipay': '0 2px 12px rgba(22, 119, 255, 0.15)',
      },
    },
  },
  plugins: [
    // Add touch-friendly utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.touch-pan-x': {
          'touch-action': 'pan-x',
        },
        '.touch-pan-y': {
          'touch-action': 'pan-y',
        },
        '.touch-none': {
          'touch-action': 'none',
        },
        '.tap-highlight-none': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.scroll-smooth': {
          'scroll-behavior': 'smooth',
        },
        '.overscroll-none': {
          'overscroll-behavior': 'none',
        },
        // iOS safe area utilities
        '.pt-safe': {
          'padding-top': 'env(safe-area-inset-top)',
        },
        '.pb-safe': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        '.pl-safe': {
          'padding-left': 'env(safe-area-inset-left)',
        },
        '.pr-safe': {
          'padding-right': 'env(safe-area-inset-right)',
        },
        '.p-safe': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-right': 'env(safe-area-inset-right)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
          'padding-left': 'env(safe-area-inset-left)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
};

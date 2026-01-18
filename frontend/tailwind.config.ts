import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: {
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          500: '#ef4444',
          600: '#dc2626',
        },
        // Warm Sunset Palette
        sunset: {
          gold: '#FFB347',
          coral: '#FF6B6B',
          peach: '#FFCBA4',
          tangerine: '#FF8C42',
          amber: '#F9C74F',
          cream: '#FFF8E7',
          twilight: '#2D3047',
        },
      },
      fontFamily: {
        display: ['Baloo 2', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
      animation: {
        'bounce-once': 'bounce 0.5s ease-in-out 1',
        'shake': 'shake 0.5s ease-in-out 1',
        'coin-fly': 'coinFly 1s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'treasure-reveal': 'treasureReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'magic-shimmer': 'magicShimmer 2s linear infinite',
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'typewriter': 'typewriter 2s steps(40) forwards',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        coinFly: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-100px) scale(0.5)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(255, 179, 71, 0.4), 0 0 40px rgba(255, 179, 71, 0.2)'
          },
          '50%': {
            boxShadow: '0 0 30px rgba(255, 179, 71, 0.6), 0 0 60px rgba(255, 179, 71, 0.4)'
          },
        },
        treasureReveal: {
          '0%': {
            transform: 'rotateY(180deg) scale(0.5)',
            opacity: '0'
          },
          '100%': {
            transform: 'rotateY(0deg) scale(1)',
            opacity: '1'
          },
        },
        magicShimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0', transform: 'scale(0)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        typewriter: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
      },
      boxShadow: {
        'sunset-soft': '0 4px 20px rgba(255, 179, 71, 0.15)',
        'sunset-glow': '0 0 30px rgba(255, 179, 71, 0.4)',
        'card-warm': '0 4px 12px rgba(45, 48, 71, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;

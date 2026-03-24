import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // Classic theme
        classic: {
          bg: '#f5f0e8',
          shell: '#e8d5a3',
          screen: '#9bbc0f',
          screenDark: '#0f380f',
          text: '#0f380f',
          accent: '#ff6b9d',
          button: '#c8b560',
        },
        // Midnight theme
        midnight: {
          bg: '#0d0d1a',
          shell: '#1a1a2e',
          screen: '#16213e',
          screenDark: '#0f0f23',
          text: '#e0e0ff',
          accent: '#7c3aed',
          button: '#4c1d95',
        },
        // Clean theme
        clean: {
          bg: '#fafafa',
          shell: '#f0f0f0',
          screen: '#ffffff',
          screenDark: '#f5f5f5',
          text: '#1a1a1a',
          accent: '#6366f1',
          button: '#e0e7ff',
        },
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pixel-blink': 'pixelBlink 1s step-end infinite',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        pixelBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

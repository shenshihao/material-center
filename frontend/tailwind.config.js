/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Core surfaces - deep charcoal with subtle warmth
        surface: {
          DEFAULT: '#0a0a0c',
          card:    '#111115',
          elevated: '#18181d',
          hover:   '#1e1e25',
          border:  '#2a2a35',
          muted:   '#3a3a48',
        },
        // Amber/Gold accent - distinctive and warm
        accent: {
          DEFAULT: '#f59e0b',
          hover:   '#d97706',
          light:   '#fbbf24',
          muted:   '#92400e',
        },
        // Text hierarchy
        text: {
          primary:   '#fafafa',
          secondary: '#a1a1aa',
          muted:     '#71717a',
        },
        // Semantic colors
        success: '#22c55e',
        warning: '#f59e0b',
        error:   '#ef4444',
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        body: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-sm': '0 0 12px -2px rgba(245, 158, 11, 0.15)',
        'glow': '0 0 24px -4px rgba(245, 158, 11, 0.2)',
        'glow-lg': '0 0 48px -8px rgba(245, 158, 11, 0.25)',
      },
    },
  },
  plugins: [],
};

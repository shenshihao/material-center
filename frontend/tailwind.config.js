/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 星河主题 - 深空黑紫配合星云色彩
        cosmic: {
          void: '#030012',       // 宇宙虚空 - 最深的背景
          deep: '#0a0618',      // 深空紫
          nebula: '#12101f',    // 星云紫
          dust: '#1a1530',      // 星际尘埃
          border: '#2d2645',    // 星边界
          muted: '#4a4163',     // 暗淡星光
        },
        // 主色调 - 星光蓝绿
        star: {
          DEFAULT: '#00f5d4',   // 主星光色
          dim: '#00c4aa',       // 暗淡
          bright: '#5dffeb',   // 明亮
          glow: 'rgba(0, 245, 212, 0.3)',
        },
        // 强调色 - 星云粉
        nebula: {
          DEFAULT: '#f72585',  // 星云粉
          dim: '#b5179e',
          bright: '#ff5ca8',
          glow: 'rgba(247, 37, 133, 0.3)',
        },
        // 次强调 - 银河金
        galaxy: {
          DEFAULT: '#ffd60a',   // 银河金
          dim: '#ffc300',
          bright: '#ffea00',
          glow: 'rgba(255, 214, 10, 0.3)',
        },
        // 文字层次
        stardust: {
          primary: '#f8f4ff',   // 星尘白
          secondary: '#c4b8db', // 暗淡紫白
          muted: '#7a6f8a',    // 星际灰
        },
        // 语义色
        success: '#00f5d4',
        warning: '#ffd60a',
        error: '#f72585',
      },
      fontFamily: {
        display: ['Clash Display', 'Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'twinkle': 'twinkle 4s ease-in-out infinite',
        'float': 'float 8s ease-in-out infinite',
        'drift': 'drift 20s linear infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: 0.4, transform: 'scale(0.98)' },
          '50%': { opacity: 1, transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-8px) rotate(1deg)' },
          '66%': { transform: 'translateY(-4px) rotate(-1deg)' },
        },
        drift: {
          '0%': { transform: 'translateX(0) translateY(0)' },
          '100%': { transform: 'translateX(-50px) translateY(-50px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 245, 212, 0.2), 0 0 40px rgba(0, 245, 212, 0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 245, 212, 0.4), 0 0 60px rgba(0, 245, 212, 0.2)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.92)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E\")",
        'stars': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='1' fill='white' opacity='0.5'/%3E%3Ccircle cx='50' cy='30' r='0.5' fill='white' opacity='0.3'/%3E%3Ccircle cx='90' cy='70' r='1' fill='white' opacity='0.6'/%3E%3Ccircle cx='130' cy='20' r='0.5' fill='white' opacity='0.4'/%3E%3Ccircle cx='170' cy='90' r='1' fill='white' opacity='0.5'/%3E%3Ccircle cx='30' cy='120' r='0.5' fill='white' opacity='0.3'/%3E%3Ccircle cx='70' cy='160' r='1' fill='white' opacity='0.4'/%3E%3Ccircle cx='110' cy='130' r='0.5' fill='white' opacity='0.5'/%3E%3Ccircle cx='150' cy='170' r='1' fill='white' opacity='0.3'/%3E%3Ccircle cx='190' cy='140' r='0.5' fill='white' opacity='0.4'/%3E%3C/svg%3E\")",
        'gradient-cosmic': 'linear-gradient(135deg, #030012 0%, #0a0618 50%, #12101f 100%)',
        'gradient-nebula': 'linear-gradient(135deg, rgba(247,37,133,0.1) 0%, rgba(0,245,212,0.1) 50%, rgba(255,214,10,0.05) 100%)',
        'gradient-glow': 'radial-gradient(ellipse at center, rgba(0,245,212,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'star-sm': '0 0 15px -3px rgba(0, 245, 212, 0.2), 0 0 30px -5px rgba(0, 245, 212, 0.1)',
        'star': '0 0 25px -5px rgba(0, 245, 212, 0.3), 0 0 50px -10px rgba(0, 245, 212, 0.15)',
        'star-lg': '0 0 40px -8px rgba(0, 245, 212, 0.35), 0 0 80px -15px rgba(0, 245, 212, 0.2)',
        'nebula': '0 0 25px -5px rgba(247, 37, 133, 0.25), 0 0 50px -10px rgba(247, 37, 133, 0.15)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

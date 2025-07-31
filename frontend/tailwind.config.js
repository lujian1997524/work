/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // iOS 18 色彩系统
        'ios18-blue': '#0A84FF',
        'ios18-indigo': '#5E5CE6',
        'ios18-purple': '#AF52DE',
        'ios18-teal': '#30D158',
        'ios18-mint': '#00C7BE',
        'ios18-brown': '#AC8E68',
        
        // macOS 15 系统色
        'macos15-accent': '#007AFF',
        'macos15-control': '#F2F2F7',
        'macos15-separator': '#C6C6C8',
        
        // 高级背景色系统
        'bg-primary': 'rgba(255, 255, 255, 0.85)',
        'bg-secondary': 'rgba(248, 250, 252, 0.80)',
        'bg-glass': 'rgba(255, 255, 255, 0.12)',
        'bg-card': 'rgba(255, 255, 255, 0.75)',
        'bg-overlay': 'rgba(0, 0, 0, 0.02)',
        
        // 精细化文字颜色系统
        'text-primary': '#1f2937',
        'text-secondary': '#6b7280',
        'text-tertiary': '#9ca3af',
        'text-quaternary': '#d1d5db',
        'text-link': '#0A84FF',
        'text-link-hover': '#0070f3',
        
        // 状态颜色增强
        'status-success': '#10b981',
        'status-success-light': '#d1fae5',
        'status-warning': '#f59e0b',
        'status-warning-light': '#fef3c7',
        'status-error': '#ef4444',
        'status-error-light': '#fee2e2',
        'status-info': '#3b82f6',
        'status-info-light': '#dbeafe',
      },
      fontFamily: {
        'system': ['-apple-system', '"SF Pro Display"', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'largeTitle': ['24px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'title1': ['20px', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        'title2': ['18px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'title3': ['16px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'headline': ['15px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'body': ['14px', { lineHeight: '1.4', letterSpacing: '0' }],
        'callout': ['13px', { lineHeight: '1.4', letterSpacing: '0' }],
        'subhead': ['12px', { lineHeight: '1.3', letterSpacing: '0' }],
        'footnote': ['11px', { lineHeight: '1.3', letterSpacing: '0' }],
        'caption1': ['10px', { lineHeight: '1.2', letterSpacing: '0' }],
        'caption2': ['9px', { lineHeight: '1.2', letterSpacing: '0' }],
      },
      borderRadius: {
        'ios-xs': '4px',
        'ios-sm': '6px',
        'ios-md': '8px',
        'ios-lg': '12px',
        'ios-xl': '16px',
        'ios-2xl': '20px',
        'ios-3xl': '24px',
      },
      boxShadow: {
        'ios-xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'ios-sm': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'ios-md': '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'ios-lg': '0 10px 15px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.04)',
        'ios-xl': '0 20px 25px rgba(0, 0, 0, 0.08), 0 10px 10px rgba(0, 0, 0, 0.04)',
        'ios-2xl': '0 25px 50px rgba(0, 0, 0, 0.12)',
      },
      backdropBlur: {
        'glass': '24px',
        'glass-strong': '32px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'stripes': 'stripes 1s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        stripes: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 0' },
        },
      },
    },
  },
  plugins: [],
}
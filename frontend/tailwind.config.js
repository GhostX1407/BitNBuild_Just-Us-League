/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: '#F8FAFC',
        console: {
          DEFAULT: '#FFFFFF',
          raised: '#F1F5F9',
          border: '#E2E8F0',
        },
        hairline: '#E2E8F0',
        paper: {
          DEFAULT: '#0F172A',
          dim: '#64748B',
          muted: '#94A3B8',
        },
        signal: {
          amber: '#F59E0B',
        },
        alert: {
          red: '#EF4444',
        },
        response: {
          teal: '#10B981',
        },
        caution: {
          gold: '#D97706',
        },
        recon: {
          blue: '#2563EB',
        },
        priority: {
          p1: '#EF4444',
          p2: '#F97316',
          p3: '#EAB308',
          p4: '#0EA5E9',
        }
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03), inset 0 1px 0 0 rgba(255, 255, 255, 1)',
        'card-hover': '0 12px 28px -4px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 1)',
        'soft': '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
        'tile': '0 10px 30px -4px rgba(15, 23, 42, 0.06), 0 2px 8px -1px rgba(15, 23, 42, 0.03), inset 0 1px 0 0 rgba(255, 255, 255, 1)',
        'tile-hover': '0 20px 42px -6px rgba(15, 23, 42, 0.11), 0 6px 14px -2px rgba(15, 23, 42, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 1)',
        'tactile': '0 2px 6px -1px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
        'pill': '0 2px 8px -1px rgba(15, 23, 42, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)',
      },
    },
  },
  plugins: [],
}

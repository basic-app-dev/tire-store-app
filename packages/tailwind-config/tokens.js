/** @type {const} */
const automotiveTokens = {
  colors: {
    // Asphalt & Vulcanized Rubber (Primary Dark Scales)
    asphalt: {
      50: '#f6f7f9',
      100: '#eceff2',
      200: '#d5dae2',
      300: '#b1bccb',
      400: '#8496ad',
      500: '#627692',
      600: '#4c5d77',
      700: '#3d4b60',
      800: '#242a35',
      900: '#14171d',
      950: '#0a0c0f', // deep vulcanized black
    },
    // Steel & Aluminum Alloy
    alloy: {
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
    },
    // Race Red (Performance / Warnings / Critical / Caliper Red)
    raceRed: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    // Pit-Stop Amber (Maintenance, Bay Occupied, Alert)
    pitAmber: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    // Nitro Blue (Electric Vehicle, Premium All-Weather, Nitrogen Fill)
    nitroBlue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    // Certified Green (Tread Pass, Eco-Efficiency, Inspection Passed)
    certifiedGreen: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
  },
  fontFamily: {
    display: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  },
  boxShadow: {
    tire: '0 4px 20px -2px rgba(10, 12, 15, 0.25)',
    bay: '0 8px 30px rgba(0, 0, 0, 0.12)',
  },
  borderRadius: {
    tire: '1.25rem',
  },
};

module.exports = { automotiveTokens };

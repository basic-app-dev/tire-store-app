import type { Config } from 'tailwindcss';
import sharedPreset from '@tire-store/tailwind-config/tailwind.config.js';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}'],
  // Normalize the shared preset's older Tailwind darkMode type at the web boundary.
  // Keep its tokens while declaring the strategy using this app's Tailwind types.
  presets: [{ theme: sharedPreset.theme, darkMode: 'class' }],
};

export default config;

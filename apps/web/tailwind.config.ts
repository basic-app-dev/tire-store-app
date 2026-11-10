import type { Config } from 'tailwindcss';
import sharedPreset from '@tire-store/tailwind-config/tailwind.config.js';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  presets: [sharedPreset],
};

export default config;


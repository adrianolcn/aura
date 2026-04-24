import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-manrope)'],
        serif: ['var(--font-cormorant)'],
      },
    },
  },
  plugins: [],
};

export default config;

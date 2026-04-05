import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          obsidiana: '#1C1C2E',
          gold: '#C9A84C',
          'gold-light': '#E8C97A',
          surface: '#2A2A3E',
          muted: '#3A3A50',
        },
      },
      fontFamily: {
        heading: ['var(--font-cormorant)', 'serif'],
        body: ['var(--font-source-serif)', 'serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config

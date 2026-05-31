import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // FlowTrade Brand Colours — v3.2 green system (LOCKED).
        // Key names retained for compatibility; values are the green gradient + neutrals.
        flowtrade: {
          // Division green gradient (deep / mid / bright)
          cyan: '#00955A',          // mid (primary brand green)
          'cyan-dark': '#0A5C3A',   // deep
          'cyan-light': '#1FC56F',  // bright
          // Dark neutrals (Obsidian/Ink)
          dark: '#0B1114',          // Obsidian - main background
          navy: '#1A2230',          // Ink
          'navy-dark': '#0B1114',   // Obsidian
          'navy-light': '#1A2230',  // Ink - card backgrounds
          'navy-lighter': '#2A3340',// borders, dividers
          'navy-border': '#34404F', // high-contrast borders
          'navy-hover': '#222C39',  // hover states
          // Neutral tones
          slate: '#5B6675',         // Slate
          light: '#E7ECF2',         // Mist
          // Accent (remapped off orange -> green)
          orange: '#1FC56F',
          'orange-dark': '#00955A',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-michroma)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Custom shadows for card depth
        'card': '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(52, 64, 79, 0.5)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(31, 197, 111, 0.3)',
        'section': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'glow-cyan': '0 0 20px rgba(31, 197, 111, 0.25)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config

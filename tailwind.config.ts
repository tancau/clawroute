import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui base
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Brand colors
        brand: {
          primary: "hsl(var(--brand-primary))",
          secondary: "hsl(var(--brand-secondary))",
          accent: "hsl(var(--brand-accent))",
        },

        // Semantic colors
        semantic: {
          success: "hsl(var(--color-success))",
          warning: "hsl(var(--color-warning))",
          error: "hsl(var(--color-error))",
          info: "hsl(var(--color-info))",
        },

        // Neutral scale
        neutral: {
          1: "hsl(var(--neutral-1))",
          2: "hsl(var(--neutral-2))",
          3: "hsl(var(--neutral-3))",
          4: "hsl(var(--neutral-4))",
          5: "hsl(var(--neutral-5))",
          6: "hsl(var(--neutral-6))",
          7: "hsl(var(--neutral-7))",
          8: "hsl(var(--neutral-8))",
          9: "hsl(var(--neutral-9))",
          10: "hsl(var(--neutral-10))",
        },

        // Surface
        surface: {
          base: "hsl(var(--surface-base))",
          raised: "hsl(var(--surface-raised))",
          overlay: "hsl(var(--surface-overlay))",
        },

        // Window controls (legacy compat)
        "window-red": "#ff5f56",
        "window-yellow": "#ffbd2e",
        "window-green": "#27ca40",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-accent)) 100%)",
        "gradient-secondary": "linear-gradient(135deg, hsl(var(--brand-secondary)) 0%, hsl(var(--brand-secondary)) 100%)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        spring: "var(--ease-spring)",
        bounce: "var(--ease-bounce)",
      },
      boxShadow: {
        "glow-primary": "var(--shadow-glow-primary)",
        "glow-accent": "var(--shadow-glow-accent)",
      },
    },
  },
  plugins: [],
};
export default config;

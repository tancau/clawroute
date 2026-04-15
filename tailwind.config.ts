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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#00c9ff",
          foreground: "#0f172a",
        },
        secondary: {
          DEFAULT: "#6366f1",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#92fe9d",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "#2a2d3a",
          foreground: "#94a3b8",
        },
        popover: {
          DEFAULT: "#1a1d29",
          foreground: "#f8fafc",
        },
        card: {
          DEFAULT: "#1a1d29",
          foreground: "#f8fafc",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%)",
        "gradient-secondary": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      },
    },
  },
  plugins: [],
};
export default config;

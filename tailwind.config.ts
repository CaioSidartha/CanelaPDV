import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#2A2118",
        foreground: "#FAF6F1",
        surface: {
          DEFAULT: "#332A20",
          2: "#3D3226",
          muted: "#3A3028",
          card: "#332A20",
        },
        card: {
          DEFAULT: "#332A20",
          foreground: "#FAF6F1",
        },
        primary: {
          DEFAULT: "#D97706",
          foreground: "#FFFBF5",
        },
        secondary: {
          DEFAULT: "#3D3226",
          foreground: "#E8DFD4",
        },
        muted: {
          DEFAULT: "#3A3028",
          foreground: "#C4B5A0",
        },
        accent: {
          DEFAULT: "#F59E0B",
          foreground: "#2A2118",
        },
        destructive: {
          DEFAULT: "#C45C4A",
          foreground: "#FAF6F1",
        },
        success: {
          DEFAULT: "#6B9B6E",
          foreground: "#1A241C",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#2A2118",
        },
        info: "#A68B6A",
        border: "#4A3F32",
        input: "#241E17",
        ring: "#D97706",
        sidebar: {
          DEFAULT: "#241E17",
          foreground: "#FAF6F1",
          primary: "#D97706",
          accent: "#332A20",
          border: "#4A3F32",
        },
        brand: {
          DEFAULT: "#D97706",
          light: "#E8A04A",
          muted: "#3D3226",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(0, 0, 0, 0.12)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;

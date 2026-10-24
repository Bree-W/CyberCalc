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
        cyber: {
          950: "#05070a",
          900: "#090d16",
          850: "#0d131f",
          800: "#131b2e",
          700: "#1b2640",
          600: "#243354",
          border: "#1f2d48",
          muted: "#627799",
          neon: {
            cyan: "#00f0ff",
            teal: "#00e5a3",
            emerald: "#10b981",
            green: "#39ff14",
            amber: "#ffb800",
            rose: "#ff3366",
            purple: "#a855f7",
          },
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        "neon-cyan": "0 0 15px rgba(0, 240, 255, 0.25)",
        "neon-teal": "0 0 15px rgba(0, 229, 163, 0.25)",
        "neon-rose": "0 0 15px rgba(255, 51, 102, 0.35)",
        "neon-amber": "0 0 15px rgba(255, 184, 0, 0.25)",
        "inner-glow": "inset 0 0 12px rgba(0, 240, 255, 0.1)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glitch": "glitch 0.2s ease-in-out infinite alternate",
        "scanline": "scanline 8s linear infinite",
      },
      keyframes: {
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-1px, -2px)" },
          "60%": { transform: "translate(2px, 1px)" },
          "80%": { transform: "translate(1px, -1px)" },
          "100%": { transform: "translate(0)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

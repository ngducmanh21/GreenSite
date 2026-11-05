import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#123C2C",
        lime: "#B8E65C",
        ivory: "#F5F7F2",
        amber: "#F2B544",
        brand: {
          50: "#F5F7F2",
          100: "#edf5df",
          200: "#d7edb0",
          300: "#B8E65C",
          400: "#7bc94b",
          500: "#2F9E44",
          600: "#28863b",
          700: "#216b34",
          800: "#194e2f",
          900: "#123C2C",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
      },
      animation: {
        "blob-1": "blob1 18s ease-in-out infinite",
        "blob-2": "blob2 22s ease-in-out infinite",
        "fade-up": "fadeUp 0.6s ease-out both",
      },
      keyframes: {
        blob1: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(40px,-30px) scale(1.1)" },
          "66%": { transform: "translate(-30px,30px) scale(0.95)" },
        },
        blob2: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(-40px,40px) scale(1.05)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

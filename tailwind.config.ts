import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#030712",
          900: "#07111f",
          850: "#0b1424",
          800: "#101b2d",
          700: "#17263d"
        },
        neptune: {
          cyan: "#28d9ff",
          blue: "#367cff",
          violet: "#9b6cff",
          magenta: "#ed6cff",
          mint: "#4cf2c2"
        }
      },
      boxShadow: {
        "soft-glow": "0 24px 80px rgba(40, 217, 255, 0.12)",
        "card": "0 18px 48px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;

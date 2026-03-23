import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0a1628",
          800: "#111d33",
          700: "#1a2942",
          600: "#243656",
        },
        cream: "#f5f1eb",
        gold: "#c9a84c",
        "red-accent": "#b91c1c",
        "glass-bg": "rgba(255, 255, 255, 0.08)",
        "glass-border": "rgba(255, 255, 255, 0.15)",
      },
      fontFamily: {
        brand: ["Cormorant Unicase", "serif"],
        splash: ["Splash", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;

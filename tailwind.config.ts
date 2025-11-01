import type { Config } from "tailwindcss"
import forms from "@tailwindcss/forms"

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          background: "#0b1220",
          primary: "#3b82f6",
          accent: "#60a5fa",
          text: "#f1f5f9",
          muted: "#d1d5db",
        },
      },
      boxShadow: {
        "brand-glow": "0 32px 90px -48px rgba(96, 165, 250, 0.45), 0 0 0 1px rgba(96, 165, 250, 0.08)",
        "brand-soft": "0 12px 35px -20px rgba(96, 165, 250, 0.28)",
      },
    },
  },
  plugins: [forms],
}

export default config

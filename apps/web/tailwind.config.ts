import type { Config } from "tailwindcss";

// Light "paper and ink" palette from the design mockups (shared.css):
// warm paper ground, white cards, ink text, rust accent, navy panels.
// Accent is darkened slightly from the mockup's #C1672B so white button
// text and small accent links clear WCAG AA (4.5:1).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F6F2E9",
        dim: "#EEE8D9",
        card: "#FFFFFF",
        ink: "#181B20",
        muted: "#5B6169",
        faint: "#6B7078",
        accent: "#A8531F",
        "accent-hover": "#8A4318",
        "accent-soft": "#F7E4D2",
        line: "#DED6C1",
        navy: "#141C33",
        good: "#2C6E58",
        warn: "#9C6A16",
        bad: "#B42318",
      },
      maxWidth: {
        page: "1120px",
        site: "1200px",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Archivo", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

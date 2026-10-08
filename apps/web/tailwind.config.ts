import type { Config } from "tailwindcss";

// Dark industrial palette, exactly per spec: background #121212, cards
// #1C1C1E, text #F5F5F5, muted #A1A1AA, accent #F97316.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#121212",
        card: "#1C1C1E",
        ink: "#F5F5F5",
        muted: "#A1A1AA",
        accent: "#F97316",
        "accent-hover": "#EA6A0C",
        line: "#2A2A2D",
        good: "#22C55E",
        warn: "#F59E0B",
        bad: "#EF4444",
      },
      maxWidth: {
        page: "1120px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

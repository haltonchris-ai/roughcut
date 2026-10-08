// Mirrors apps/web/tailwind.config.ts exactly — same dark industrial palette
// on both platforms: background #121212, cards #1C1C1E, text #F5F5F5, muted
// #A1A1AA, accent #F97316.
export const colors = {
  bg: "#121212",
  card: "#1C1C1E",
  ink: "#F5F5F5",
  muted: "#A1A1AA",
  accent: "#F97316",
  accentPressed: "#EA6A0C",
  line: "#2A2A2D",
  good: "#22C55E",
  warn: "#F59E0B",
  bad: "#EF4444",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: "700" as const, color: colors.ink },
  subtitle: { fontSize: 16, fontWeight: "600" as const, color: colors.ink },
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.ink },
  muted: { fontSize: 13, fontWeight: "400" as const, color: colors.muted },
  label: { fontSize: 12, fontWeight: "600" as const, color: colors.muted, textTransform: "uppercase" as const, letterSpacing: 0.5 },
};

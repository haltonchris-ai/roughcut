import { Pressable, Text, View, StyleSheet, ActivityIndicator, type ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "./theme";

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryButton,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && { backgroundColor: colors.accentPressed },
      ]}
    >
      {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.primaryButtonText}>{title}</Text>}
    </Pressable>
  );
}

export function OutlineButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.outlineButton}>
      <Text style={styles.outlineButtonText}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenTitle({ children }: { children: React.ReactNode }) {
  return <Text style={typography.title}>{children}</Text>;
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={[typography.label, { marginBottom: spacing.xs }]}>{children}</Text>;
}

export function Badge({ label, tone = "muted" }: { label: string; tone?: "good" | "warn" | "muted" }) {
  const toneColor = tone === "good" ? colors.good : tone === "warn" ? colors.warn : colors.muted;
  return (
    <View style={[styles.badge, { borderColor: toneColor }]}>
      <Text style={[styles.badgeText, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: colors.bg, fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.5 },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: { color: colors.ink, fontWeight: "600", fontSize: 15 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
});

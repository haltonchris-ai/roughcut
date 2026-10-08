import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { getBoxByPublicCode } from "@/lib/data/boxes";
import { colors, spacing, typography } from "@/lib/theme";

// Universal-link target for a tap on a sticker ({WEB_ORIGIN}/b/{code}) when
// the app is installed (iOS associated domains / Android app links claim
// this path — see apps/mobile/app.config.ts). Never shows a spec to a
// logged-out user, matching the web fallback's same rule; RLS would block
// the read anyway, but the login wall here avoids a confusing blank screen.
export default function DeepLinkBoxScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "not-found">("loading");

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    getBoxByPublicCode(code).then((box) => {
      if (!box) {
        setStatus("not-found");
        return;
      }
      router.replace(`/(app)/jobs/${box.job_id}/box/${box.id}`);
    });
  }, [loading, session, code]);

  if (status === "not-found") {
    return (
      <View style={styles.container}>
        <Text style={typography.body}>
          No spec found for this sticker, or you don't have access to it from this account.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.lg },
});

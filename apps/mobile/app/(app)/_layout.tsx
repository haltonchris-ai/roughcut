import { Stack, Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function AppGroupLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.ink,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="jobs/index" options={{ title: "Jobs" }} />
      <Stack.Screen name="jobs/[id]/index" options={{ title: "Job" }} />
      <Stack.Screen name="jobs/[id]/scan" options={{ title: "Scan sticker", presentation: "modal" }} />
      <Stack.Screen name="jobs/[id]/box/[boxId]" options={{ title: "Box" }} />
      <Stack.Screen name="sync" options={{ title: "Sync status" }} />
    </Stack>
  );
}

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { AuthProvider } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { initOfflineSync } from "@/lib/offline/queue";

export default function RootLayout() {
  useEffect(() => {
    initOfflineSync();
  }, []);

  return (
    <AuthProvider>
      {/* Mobile status bar light, per spec. */}
      <StatusBar style="light" backgroundColor={colors.bg} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.ink,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="b/[code]" options={{ title: "Box spec" }} />
        </Stack>
      </View>
    </AuthProvider>
  );
}

import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { listJobs } from "@/lib/data/jobs";
import { useAuth } from "@/lib/auth";
import { colors, spacing, typography } from "@/lib/theme";
import { Badge } from "@/lib/ui";
import type { Job } from "@roughcut/shared";

export default function JobsScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setJobs(await listJobs());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.muted}>{profile?.full_name}</Text>
        <Pressable onPress={() => router.push("/(app)/sync")}>
          <Text style={{ color: colors.accent, fontWeight: "600" }}>Sync status</Text>
        </Pressable>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          !loading ? <Text style={[typography.muted, { padding: spacing.lg }]}>No jobs yet.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/(app)/jobs/${item.id}`)}>
            <Text style={typography.subtitle}>{item.name}</Text>
            <Text style={[typography.muted, { marginTop: 2 }]}>{item.address}</Text>
            <View style={{ marginTop: spacing.sm }}>
              <Badge label={item.status} tone={item.status === "open" ? "good" : "muted"} />
            </View>
          </Pressable>
        )}
      />

      <Pressable onPress={signOut} style={{ padding: spacing.md, alignItems: "center" }}>
        <Text style={{ color: colors.muted }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
});

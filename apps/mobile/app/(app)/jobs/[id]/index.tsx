import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { listBoxesForJob } from "@/lib/data/boxes";
import { getJob } from "@/lib/data/jobs";
import { colors, spacing, typography } from "@/lib/theme";
import { Badge, PrimaryButton } from "@/lib/ui";
import { BOX_TYPE_LABELS, type Box, type Job } from "@roughcut/shared";

const STATUS_TONE: Record<Box["status"], "good" | "warn" | "muted"> = {
  open: "muted",
  specified: "warn",
  installed: "good",
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [j, b] = await Promise.all([getJob(id), listBoxesForJob(id)]);
    setJob(j);
    setBoxes(b);
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const installed = boxes.filter((b) => b.status === "installed").length;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={typography.subtitle}>{job?.address}</Text>
        <Text style={typography.muted}>
          {installed} of {boxes.length} boxes installed
        </Text>
      </View>

      <FlatList
        data={boxes}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />
        }
        ListEmptyComponent={<Text style={[typography.muted, { padding: spacing.lg }]}>No boxes yet — scan a sticker to add one.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/(app)/jobs/${id}/box/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>{item.box_type ? BOX_TYPE_LABELS[item.box_type] : "Not specified yet"}</Text>
              <Text style={[typography.muted, { marginTop: 2 }]}>{item.short_code}</Text>
            </View>
            <Badge label={item.status} tone={STATUS_TONE[item.status]} />
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        <PrimaryButton title="Scan sticker" onPress={() => router.push(`/(app)/jobs/${id}/scan`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  summary: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});

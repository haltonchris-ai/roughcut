import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { colors, spacing, typography } from "@/lib/theme";
import { Badge } from "@/lib/ui";
import { getQueueSnapshot, subscribeToQueue, type QueuedWrite } from "@/lib/offline/queue";

// Full offline queue lives in lib/offline/queue.ts (task: offline sqlite
// queue + sync). This screen just renders whatever that module reports.
export default function SyncStatusScreen() {
  const [queue, setQueue] = useState<QueuedWrite[]>(getQueueSnapshot());

  useEffect(() => subscribeToQueue(setQueue), []);

  const pending = queue.filter((q) => q.status === "pending" || q.status === "retrying");

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        {pending.length === 0 ? (
          <>
            <Badge label="Up to date" tone="good" />
            <Text style={[typography.muted, { marginTop: spacing.sm }]}>
              Everything you've saved on this phone has synced.
            </Text>
          </>
        ) : (
          <>
            <Badge label={`${pending.length} waiting`} tone="warn" />
            <Text style={[typography.muted, { marginTop: spacing.sm }]}>
              Saved on phone. Waiting for signal — these will sync automatically.
            </Text>
          </>
        )}
      </View>

      <FlatList
        data={queue}
        keyExtractor={(q) => q.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={typography.body}>{item.description}</Text>
            <Badge
              label={item.status}
              tone={item.status === "synced" ? "good" : item.status === "failed" ? "warn" : "muted"}
            />
          </View>
        )}
        ListEmptyComponent={<Text style={[typography.muted, { padding: spacing.lg }]}>Nothing queued.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  summary: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
  },
});

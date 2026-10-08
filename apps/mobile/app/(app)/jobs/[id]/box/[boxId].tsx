import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getBox, specifyBox, createAdHocBoxAndSpec, markBoxInstalled } from "@/lib/data/boxes";
import { uploadBoxPhoto } from "@/lib/photo";
import { useAuth } from "@/lib/auth";
import { colors, spacing, typography } from "@/lib/theme";
import { Badge, PrimaryButton } from "@/lib/ui";
import { SpecForm } from "@/components/SpecForm";
import { BOX_TYPE_LABELS, type Box, type BoxSpecInput } from "@roughcut/shared";

export default function BoxScreen() {
  const { id: jobId, boxId, code } = useLocalSearchParams<{ id: string; boxId: string; code?: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [box, setBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(boxId !== "new");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (boxId === "new") return;
    getBox(boxId)
      .then(setBox)
      .finally(() => setLoading(false));
  }, [boxId]);

  async function handleSave(spec: BoxSpecInput, localPhotoUri: string | null) {
    if (!profile?.company_id) return;
    setSaving(true);
    try {
      if (boxId === "new") {
        // Ad hoc creation needs a connection (see DECISIONS.md) — the photo
        // can go straight up since we have a real box id the moment this
        // resolves.
        const saved = await createAdHocBoxAndSpec(jobId, profile.company_id, { ...spec, job_id: jobId });
        if (localPhotoUri) await uploadBoxPhoto(profile.company_id, saved.id, localPhotoUri);
      } else {
        // Offline-capable: queues the write (and the photo, once the write
        // syncs) if there's no connection right now.
        await specifyBox(boxId, { ...spec, job_id: jobId }, localPhotoUri);
        const net = await NetInfo.fetch();
        if (!net.isConnected) {
          Alert.alert("Saved on phone", "Waiting for signal. This will sync automatically.");
        }
      }

      router.replace(`/(app)/jobs/${jobId}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkInstalled() {
    if (!box) return;
    setSaving(true);
    try {
      // Queues the write (optimistic cache update happens inside); reflect
      // that locally right away rather than waiting on a round trip.
      await markBoxInstalled(box.id);
      setBox({ ...box, status: "installed" });
    } finally {
      setSaving(false);
    }
  }

  if (boxId === "new") {
    return (
      <View style={styles.container}>
        <View style={styles.banner}>
          <Text style={[typography.body, { color: colors.good }]}>Sticker scanned</Text>
          <Text style={typography.muted}>Fill in the spec below. Code: {code}</Text>
        </View>
        <SpecForm onSave={handleSave} saving={saving} />
      </View>
    );
  }

  if (loading) return <View style={styles.container} />;
  if (!box) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={typography.body}>Box not found.</Text>
      </View>
    );
  }

  // No spec yet (a sticker-order-minted box nobody has walked yet). Only a
  // foreman/admin gets the form; an installer sees a plain "not ready" state
  // since they never get the spec form, per spec.
  if (box.status === "open") {
    if (profile?.role === "installer") {
      return (
        <View style={[styles.container, styles.centered]}>
          <Text style={[typography.body, { textAlign: "center" }]}>
            This box hasn't been specified yet. Ask your foreman to fill it in first.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <SpecForm onSave={handleSave} saving={saving} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View style={styles.header}>
        <Text style={typography.label}>STICKER {box.short_code}</Text>
        <Text style={typography.title}>{box.box_type ? BOX_TYPE_LABELS[box.box_type] : "—"}</Text>
      </View>

      <View style={styles.card}>
        <SpecRow label="Size" value={box.size ?? "—"} />
        <SpecRow label="Height AFF" value={box.height_aff ?? "—"} />
        <SpecRow label="Circuit" value={box.circuit ?? "—"} />
        <SpecRow label="Notes" value={box.notes ?? "—"} />
      </View>

      <Badge label={box.status} tone={box.status === "installed" ? "good" : "warn"} />

      {box.status === "specified" && profile?.role === "installer" && (
        <PrimaryButton title="Mark as installed" onPress={handleMarkInstalled} loading={saving} />
      )}
      {box.status === "installed" && <Text style={typography.muted}>Installed. This can't be undone from here.</Text>}
    </ScrollView>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specRow}>
      <Text style={typography.muted}>{label}</Text>
      <Text style={[typography.body, { fontWeight: "600" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: "center", justifyContent: "center", padding: spacing.lg },
  header: { padding: spacing.md },
  banner: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.good,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});

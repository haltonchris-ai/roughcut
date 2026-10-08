import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getBoxByPublicCode } from "@/lib/data/boxes";
import { useAuth } from "@/lib/auth";
import { colors, spacing, typography } from "@/lib/theme";
import { PrimaryButton } from "@/lib/ui";

// Extracts public_code from a scanned {WEB_ORIGIN}/b/{public_code} URL. Also
// accepts a bare code, in case a sticker is ever scanned by a generic QR
// app that hands back raw text instead of following the link.
function extractPublicCode(scanned: string): string | null {
  try {
    const url = new URL(scanned);
    const match = url.pathname.match(/\/b\/([^/]+)/);
    if (match) return match[1];
  } catch {
    // not a URL
  }
  if (/^[a-z0-9]{12}$/i.test(scanned.trim())) return scanned.trim();
  return null;
}

export default function ScanScreen() {
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);

  async function onScanned(data: string) {
    if (busy) return;
    setBusy(true);
    const code = extractPublicCode(data);
    if (!code) {
      setBusy(false);
      Alert.alert("Not a RoughCUT sticker", "That code didn't look like a RoughCUT sticker link.");
      return;
    }

    try {
      const box = await getBoxByPublicCode(code);

      if (box) {
        // Spec card for any existing box; the box/[boxId] screen itself
        // decides whether that's an editable spec form (status 'open', no
        // spec yet — see DECISIONS.md) or the read-only/installer card.
        router.replace(`/(app)/jobs/${jobId}/box/${box.id}`);
        return;
      }

      // Unknown code: per spec, only a foreman gets a blank form that
      // creates the box on save. Installer never gets the form.
      if (profile?.role === "foreman" || profile?.role === "company_admin") {
        router.replace(`/(app)/jobs/${jobId}/box/new?code=${encodeURIComponent(code)}`);
      } else {
        setBusy(false);
        Alert.alert("Sticker not recognized", "Ask your foreman to lay out this box first.");
      }
    } catch (err) {
      setBusy(false);
      Alert.alert("Couldn't look up that sticker", "Check your connection and try again.");
    }
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={[typography.body, { textAlign: "center", marginBottom: spacing.md }]}>
          RoughCUT needs camera access to scan stickers.
        </Text>
        <PrimaryButton title="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => onScanned(data)}
      />
      <View style={styles.frame} />
      <Text style={styles.hint}>Point the camera at the box's RoughCUT sticker.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: "center", justifyContent: "center", padding: spacing.lg },
  frame: {
    position: "absolute",
    top: "30%",
    left: "15%",
    width: "70%",
    height: "40%",
    borderWidth: 3,
    borderColor: colors.accent,
    borderRadius: 16,
  },
  hint: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

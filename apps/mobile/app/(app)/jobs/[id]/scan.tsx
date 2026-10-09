import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Alert, Vibration, Animated } from "react-native";
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
  // searching = nothing seen, seen = QR in view (yellow), locked = captured (green), bad = not ours (red)
  const [phase, setPhase] = useState<"searching" | "seen" | "locked" | "bad">("searching");
  const [lockedCode, setLockedCode] = useState<string | null>(null);
  const firstSeen = useRef<{ data: string; at: number } | null>(null);
  const lastSeenAt = useRef(0);
  const lockedRef = useRef(false);

  // Border animation: gentle pulse while yellow, quick "pop" when captured.
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    scale.stopAnimation();
    if (phase === "seen") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.03, duration: 350, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    if (phase === "locked") {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(1);
    }
  }, [phase, scale]);

  // The camera only fires while a QR is visible. If nothing fires for a moment,
  // fall back to the searching state.
  useEffect(() => {
    const t = setInterval(() => {
      if (lockedRef.current) return;
      if (Date.now() - lastSeenAt.current > 700) {
        firstSeen.current = null;
        setPhase((p) => (p === "searching" ? p : "searching"));
      }
    }, 250);
    return () => clearInterval(t);
  }, []);

  function onBarcode(data: string) {
    if (lockedRef.current || busy) return;
    const now = Date.now();
    lastSeenAt.current = now;
    const code = extractPublicCode(data);
    if (!code) {
      firstSeen.current = null;
      setPhase("bad");
      return;
    }
    if (!firstSeen.current || firstSeen.current.data !== data) {
      firstSeen.current = { data, at: now };
      setPhase("seen"); // yellow: found it, hold steady
      return;
    }
    // Same code held steady for ~0.4s: capture.
    if (now - firstSeen.current.at >= 400) {
      lockedRef.current = true;
      setPhase("locked"); // green
      setLockedCode(code);
      Vibration.vibrate(60);
      setTimeout(() => void lookUp(code), 700);
    }
  }

  function reset() {
    lockedRef.current = false;
    firstSeen.current = null;
    setLockedCode(null);
    setPhase("searching");
    setBusy(false);
  }

  async function lookUp(code: string) {
    setBusy(true);
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
        reset();
        Alert.alert("Sticker not recognized", "Ask your foreman to lay out this box first.");
      }
    } catch (err) {
      reset();
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
        onBarcodeScanned={({ data }) => onBarcode(data)}
      />
      <Animated.View style={[styles.frame, { borderColor: FRAME_COLORS[phase], transform: [{ scale }] }]} />
      <View style={styles.statusWrap} pointerEvents="none">
        <View style={[styles.statusPill, { backgroundColor: FRAME_COLORS[phase] }]}>
          <Text style={[styles.statusText, (phase === "locked" || phase === "bad") && { color: "#fff" }]}>
            {phase === "searching" && "Point the camera at the box's RoughCUT sticker"}
            {phase === "seen" && "Sticker found. Hold steady…"}
            {phase === "locked" && `✓ Got it${lockedCode ? ` · ${lockedCode}` : ""}`}
            {phase === "bad" && "Not a RoughCUT sticker"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const FRAME_COLORS = {
  searching: "#FFFFFF",
  seen: "#F5B800",
  locked: "#22A55B",
  bad: "#D9402B",
} as const;

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
    borderRadius: 16,
  },
  statusWrap: { position: "absolute", bottom: 60, left: 0, right: 0, alignItems: "center", paddingHorizontal: 24 },
  statusPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  statusText: { color: "#111", fontSize: 15, fontWeight: "700", textAlign: "center" },
});

import { Alert } from "react-native";

// Temporary diagnostic: release builds hard-abort on any uncaught JS error,
// which hides the message. This shows it in an alert instead so a failing
// TestFlight build can be diagnosed from the phone. Remove once startup is
// confirmed healthy.
type GlobalWithErrorUtils = {
  ErrorUtils?: {
    setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
  };
};

let shown = 0;

const g = globalThis as unknown as GlobalWithErrorUtils;
if (g.ErrorUtils) {
  g.ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (shown >= 2) return;
    shown += 1;
    try {
      const e = error as { message?: string; stack?: string } | undefined;
      const message = String(e?.message ?? error);
      const stack = String(e?.stack ?? "").slice(0, 700);
      Alert.alert(isFatal ? "RoughCUT fatal error" : "RoughCUT error", `${message}\n\n${stack}`);
    } catch {
      // nothing else we can do here
    }
  });
}

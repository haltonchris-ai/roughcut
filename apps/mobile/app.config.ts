import type { ExpoConfig } from "expo/config";

// Dynamic config (not app.json) specifically so the universal-link domain
// can come from an env var at build time instead of being hardcoded —
// EAS Build reads WEB_ORIGIN_HOST from its own env/secrets, separate from
// the app's runtime Supabase env vars. See DECISIONS.md.
const webOriginHost = process.env.WEB_ORIGIN_HOST ?? "roughcut.app";

const config: ExpoConfig = {
  name: "RoughCUT",
  slug: "roughcut",
  scheme: "roughcut",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  backgroundColor: "#121212",
  icon: "./assets/icon.png",
  splash: {
    backgroundColor: "#121212",
    resizeMode: "contain",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.roughcut.app",
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: "RoughCUT uses the camera to scan box stickers.",
      UIStatusBarStyle: "UIStatusBarStyleLightContent",
      ITSAppUsesNonExemptEncryption: false,
    },
    // Claims /b/* so a tap on a sticker's link opens the app directly
    // instead of the web read-only fallback, per the MOBILE spec section.
    // Requires the real apple-app-site-association file to be served from
    // https://<webOriginHost>/.well-known/apple-app-site-association.
    associatedDomains: [`applinks:${webOriginHost}`],
  },
  android: {
    package: "com.roughcut.app",
    backgroundColor: "#121212",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "https", host: webOriginHost, pathPrefix: "/b" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
    plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sqlite",
    ["expo-build-properties", { ios: { buildReactNativeFromSource: true } }],
  ],
  extra: {
    router: { origin: false },
    eas: {
      projectId: "536eaa8f-392c-4274-9952-9a6d33986311",
    },
  },
};

export default config;

import React, { useState } from "react";
import { AppState, Pressable, ScrollView, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import NetInfo from "@react-native-community/netinfo";
import { StatusBar } from "expo-status-bar";

// Temporary diagnostic app. Loads NO expo-router routes and calls NO native
// module at startup. Each button exercises one native module so a crash
// identifies the culprit. Remove (and restore "main") once the crash is found.
export default function Diag() {
  const [log, setLog] = useState<string[]>(["diag app started OK"]);
  const add = (s: string) => setLog((l) => [...l, s]);

  const tests: { name: string; run: () => Promise<string> | string }[] = [
    {
      name: "SecureStore write+read",
      run: async () => {
        await SecureStore.setItemAsync("diag", "1");
        return "read: " + (await SecureStore.getItemAsync("diag"));
      },
    },
    {
      name: "SecureStore with keychainService",
      run: async () => {
        const o = { keychainService: "com.roughcut.app" };
        await SecureStore.setItemAsync("diag2", "1", o);
        return "read: " + (await SecureStore.getItemAsync("diag2", o));
      },
    },
    {
      name: "SQLite open",
      run: async () => {
        const db = await SQLite.openDatabaseAsync("diag.db");
        await db.execAsync("CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY);");
        return "sqlite ok";
      },
    },
    {
      name: "NetInfo.fetch",
      run: async () => "connected: " + (await NetInfo.fetch()).isConnected,
    },
    {
      name: "NetInfo listener",
      run: () => {
        NetInfo.addEventListener(() => {});
        return "listener added";
      },
    },
    {
      name: "AppState listener",
      run: () => {
        AppState.addEventListener("change", () => {});
        return "listener added";
      },
    },
    {
      name: "StatusBar light",
      run: () => "see top of screen (rendered below)",
    },
    {
      name: "Load full app (expo-router)",
      run: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("expo-router/entry");
        return "router loaded";
      },
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#121212", paddingTop: 70, paddingHorizontal: 16 }}>
      <StatusBar style="light" />
      <Text style={{ color: "#F97316", fontSize: 22, fontWeight: "700" }}>RoughCUT diagnostic</Text>
      <ScrollView style={{ marginTop: 12 }}>
        {tests.map((t) => (
          <Pressable
            key={t.name}
            onPress={async () => {
              add("running: " + t.name);
              try {
                add("OK " + t.name + " -> " + (await t.run()));
              } catch (e) {
                add("FAIL " + t.name + " -> " + String((e as Error)?.message ?? e));
              }
            }}
            style={{ backgroundColor: "#1C1C1E", padding: 14, borderRadius: 8, marginBottom: 8 }}
          >
            <Text style={{ color: "#F5F5F5", fontSize: 16 }}>{t.name}</Text>
          </Pressable>
        ))}
        {log.map((l, i) => (
          <Text key={i} style={{ color: l.startsWith("FAIL") ? "#EF4444" : "#A1A1AA", marginTop: 4 }}>
            {l}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

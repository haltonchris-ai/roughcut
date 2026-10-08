import { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Redirect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { colors, spacing, typography } from "@/lib/theme";
import { PrimaryButton } from "@/lib/ui";

export default function LoginScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href="/(app)/jobs" />;

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) setError("Incorrect email or password.");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={typography.title}>
        Rough<Text style={{ color: colors.accent }}>CUT</Text>
      </Text>
      <Text style={[typography.muted, { marginTop: spacing.sm, marginBottom: spacing.lg }]}>
        Log in with the account your admin set up.
      </Text>

      {error && <Text style={[typography.body, { color: colors.bad, marginBottom: spacing.md }]}>{error}</Text>}

      <Text style={typography.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={colors.muted}
      />

      <Text style={[typography.label, { marginTop: spacing.md }]}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={colors.muted}
      />

      <View style={{ marginTop: spacing.lg }}>
        <PrimaryButton title="Log in" onPress={handleLogin} loading={loading} disabled={!email || !password} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: "center" },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.ink,
    fontSize: 15,
    marginTop: spacing.xs,
  },
});

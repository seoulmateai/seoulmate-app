import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors } from "@/constants/theme";
import { authRedirectUrl, signInWithGoogle } from "@/lib/google";
import { supabase } from "@/lib/supabase";
import { ErrorText, Field, PrimaryButton, Screen } from "@/components/ui";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ next?: string }>();
  const next = typeof params.next === "string" ? params.next : "/";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setNotice(null);
    if (!email.includes("@") || password.length < 8) {
      setError("Use a valid email and a password of at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(
            signInError.code === "email_not_confirmed"
              ? "Please verify your email first. Check your inbox."
              : "Invalid email or password.",
          );
        }
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (!data.session) setNotice(`We sent a verification link to ${email}.`);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>seoulmate</Text>
        <Text style={styles.title}>{mode === "login" ? "Welcome back" : "Create your account"}</Text>
        <Text style={styles.body}>Let everyone be the lead in their own seoul love story.</Text>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <ErrorText>{error}</ErrorText>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <PrimaryButton label={busy ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"} onPress={submit} disabled={busy} />
        <PrimaryButton label="Continue with Google" onPress={google} disabled={busy} />
        <Pressable
          onPress={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
        >
          <Text style={styles.switch}>
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
          </Text>
        </Pressable>
        <Text style={styles.next}>After login you'll continue to {next === "/" ? "Home" : "where you left off"}.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 14 },
  kicker: { color: colors.coral, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" },
  title: { color: colors.foreground, fontSize: 32, fontWeight: "800" },
  body: { color: colors.mutedForeground, fontSize: 15, lineHeight: 22 },
  notice: { color: colors.foreground, fontSize: 14 },
  switch: { color: colors.coral, fontWeight: "700", textAlign: "center" },
  next: { color: colors.mutedForeground, fontSize: 12, textAlign: "center" },
});

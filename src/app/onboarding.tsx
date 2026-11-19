import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { onboardingSchema } from "@/lib/validation";
import { ErrorText, Field, PrimaryButton, Screen } from "@/components/ui";

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{ next?: string }>();
  const { refreshProfile } = useAuth();
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = onboardingSchema.safeParse({
      nickname,
      birthDate,
      termsAgreed: terms,
      privacyAgreed: privacy,
      marketingAgreed: marketing,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("complete_onboarding", {
      p_nickname: parsed.data.nickname,
      p_birth_date: parsed.data.birthDate,
      p_marketing_agreed: parsed.data.marketingAgreed,
    });
    if (rpcError && rpcError.code !== "23505") {
      setBusy(false);
      if (rpcError.message.includes("NOT_AUTHENTICATED")) {
        setError("Your session has expired. Please log in again.");
      } else if (rpcError.message.includes("INVALID_BIRTH_DATE")) {
        setError("Please enter a valid date of birth.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }
    await refreshProfile();
    setBusy(false);
    // The root gate sends an onboarded session on to params.next.
    void params.next;
  }

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>What should he call you?</Text>
        <Text style={styles.body}>This is shown once. Your date of birth stays on your account.</Text>
        <Field label="Nickname" value={nickname} onChangeText={setNickname} maxLength={30} />
        <Field
          label="Date of birth"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />
        <Check label="I agree to the Terms of Service (Required)" checked={terms} onPress={() => setTerms((v) => !v)} />
        <Check label="I agree to the Privacy Policy (Required)" checked={privacy} onPress={() => setPrivacy((v) => !v)} />
        <Check
          label="I agree to receive marketing messages (Optional)"
          checked={marketing}
          onPress={() => setMarketing((v) => !v)}
        />
        <ErrorText>{error}</ErrorText>
        <PrimaryButton label={busy ? "Saving..." : "Continue"} onPress={submit} disabled={busy} />
      </ScrollView>
    </Screen>
  );
}

function Check({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.check}>
      <View style={[styles.box, checked && styles.boxOn]} />
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "800" },
  body: { color: colors.mutedForeground, lineHeight: 20 },
  check: { flexDirection: "row", alignItems: "center", gap: 10 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  boxOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  checkLabel: { color: colors.foreground, flex: 1 },
});

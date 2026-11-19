import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { apiJson } from "@/lib/api";
import {
  enableNotifications,
  notificationStatus,
  setNotificationsPreferred,
} from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { nicknameSchema } from "@/lib/validation";
import { ErrorText, Field, PrimaryButton, Screen } from "@/components/ui";

const LINKS = [
  { href: "/inquiry" as const, label: "Contact us", description: "Questions or feedback? Get in touch." },
  { href: "/legal/terms" as const, label: "Terms of Service", description: "Read the terms for using seoulmate." },
  { href: "/legal/privacy" as const, label: "Privacy Policy", description: "Learn how your information is handled." },
];

export default function SettingsScreen() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState<"on" | "off" | "blocked">("off");

  useEffect(() => {
    if (profile?.nickname) setNickname(profile.nickname);
  }, [profile?.nickname]);

  const refreshAlerts = useCallback(() => {
    notificationStatus().then(setAlerts).catch(() => setAlerts("off"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshAlerts();
    }, [refreshAlerts]),
  );

  async function toggleAlerts() {
    if (alerts === "on") {
      await setNotificationsPreferred(false);
      setAlerts("off");
      return;
    }
    if (alerts === "blocked") {
      await Linking.openSettings();
      return;
    }
    const granted = await enableNotifications();
    setAlerts(granted ? "on" : "blocked");
  }

  async function saveNickname() {
    const parsed = nicknameSchema.safeParse(nickname);
    if (!parsed.success || !session) {
      setError(parsed.success ? "Your session has expired." : parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ nickname: parsed.data })
      .eq("id", session.user.id);
    setSaving(false);
    if (updateError) {
      setError("Couldn't update your nickname. Please try again.");
      return;
    }
    await refreshProfile();
    setMessage("Nickname saved.");
  }

  function confirmDelete() {
    Alert.alert(
      "Delete account?",
      "Account deletion is permanent. Your profile and chat history will no longer be available.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiJson("/api/account/delete", { method: "POST" });
              await signOut();
            } catch {
              Alert.alert("Couldn't delete your account", "Please try again.");
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>YOUR ACCOUNT</Text>
        <Text style={styles.title}>My Page</Text>
        <Text style={styles.email}>{session?.user.email}</Text>
        <View style={styles.card}>
          <Field label="Nickname" value={nickname} onChangeText={setNickname} maxLength={30} />
          <ErrorText>{error}</ErrorText>
          {message ? <Text style={styles.ok}>{message}</Text> : null}
          <PrimaryButton label={saving ? "Saving..." : "Save nickname"} onPress={saveNickname} disabled={saving} />
        </View>
        <View style={styles.links}>
          <Pressable style={styles.link} onPress={toggleAlerts}>
            <View style={styles.linkRow}>
              <View style={styles.linkCopy}>
                <Text style={styles.linkLabel}>Notifications</Text>
                <Text style={styles.linkBody}>
                  {alerts === "on"
                    ? "On. You'll be notified when a reply arrives and the app is in the background."
                    : alerts === "blocked"
                      ? "Blocked in system settings. Tap to open them."
                      : "Off. Tap to allow message alerts."}
                </Text>
              </View>
              <Text style={[styles.alertState, alerts === "on" && styles.alertOn]}>
                {alerts === "on" ? "On" : alerts === "blocked" ? "Blocked" : "Off"}
              </Text>
            </View>
          </Pressable>
          {LINKS.map((link) => (
            <Pressable key={link.href} style={styles.link} onPress={() => router.push(link.href)}>
              <View style={styles.linkRow}>
                <View style={styles.linkCopy}>
                  <Text style={styles.linkLabel}>{link.label}</Text>
                  <Text style={styles.linkBody}>{link.description}</Text>
                </View>
                <SymbolView
                  name={{ ios: "chevron.right", android: "chevron_right" }}
                  tintColor={colors.mutedForeground}
                  size={18}
                />
              </View>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => signOut()} style={styles.signOut}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} style={styles.delete}>
          <Text style={styles.deleteLabel}>Delete account</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  kicker: { color: colors.coral, fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { color: colors.foreground, fontSize: 32, fontWeight: "800" },
  email: { color: colors.mutedForeground },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 },
  ok: { color: colors.foreground, fontSize: 13 },
  links: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  link: { padding: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  linkCopy: { flex: 1, gap: 4 },
  linkLabel: { color: colors.foreground, fontSize: 16, fontWeight: "600" },
  linkBody: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  alertState: { color: colors.mutedForeground, fontSize: 13, fontWeight: "700" },
  alertOn: { color: colors.coral },
  signOut: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutLabel: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  delete: { alignItems: "center", padding: 12 },
  deleteLabel: { color: colors.destructive, fontWeight: "700" },
});

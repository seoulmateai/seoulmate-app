import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { INQUIRY_CATEGORIES, inquirySchema } from "@/lib/validation";
import { ErrorText, Field, PrimaryButton } from "@/components/ui";

export default function InquiryScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [category, setCategory] = useState<(typeof INQUIRY_CATEGORIES)[number]["value"]>("GENERAL");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = inquirySchema.safeParse({ email, category, title, content });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: insertError } = await supabase.from("inquiries").insert(parsed.data);
    setBusy(false);
    if (insertError) {
      setError("Couldn't send your inquiry. Please try again.");
      return;
    }
    setTitle("");
    setContent("");
    setNotice("Thanks! We'll reply to your email as soon as we can.");
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Text style={styles.label}>Category</Text>
      <View style={styles.categories}>
        {INQUIRY_CATEGORIES.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setCategory(item.value)}
            style={[styles.chip, category === item.value && styles.chipOn]}
          >
            <Text style={[styles.chipLabel, category === item.value && styles.chipLabelOn]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Title" value={title} onChangeText={setTitle} maxLength={100} />
      <Text style={styles.label}>Message</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={3000}
        placeholder="Tell us what happened"
        placeholderTextColor={colors.mutedForeground}
        style={styles.message}
      />
      <ErrorText>{error}</ErrorText>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <PrimaryButton label={busy ? "Sending..." : "Send"} onPress={submit} disabled={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, backgroundColor: colors.background, flexGrow: 1 },
  label: { color: colors.foreground, fontWeight: "600" },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.coralSoft, borderColor: "rgba(255,119,114,0.4)" },
  chipLabel: { color: colors.mutedForeground, fontSize: 13 },
  chipLabelOn: { color: colors.coral, fontWeight: "700" },
  message: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.foreground,
    padding: 14,
    textAlignVertical: "top",
  },
  notice: { color: colors.foreground },
});

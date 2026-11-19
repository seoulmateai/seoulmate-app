import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";

const TITLES = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
} as const;

export default function LegalScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const title = page === "privacy" ? TITLES.privacy : TITLES.terms;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title }} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>Coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 12 },
  title: { color: colors.foreground, fontSize: 24, fontWeight: "700" },
  body: { color: colors.mutedForeground },
});

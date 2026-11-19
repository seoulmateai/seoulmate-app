import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { apiJson } from "@/lib/api";
import type { PublicCharacter } from "@/lib/types";
import { ErrorText, PrimaryButton } from "@/components/ui";

export default function CharacterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, profile } = useAuth();
  const [character, setCharacter] = useState<PublicCharacter | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiJson<{ character: PublicCharacter }>(`/api/characters/${id}`)
      .then((body) => setCharacter(body.character))
      .catch(() => setError("This profile isn't available."));
  }, [id]);

  function start() {
    if (!character) return;
    if (!session) {
      router.push({ pathname: "/login", params: { next: `/chat/${character.id}` } });
      return;
    }
    if (!profile) {
      router.push({ pathname: "/onboarding", params: { next: `/chat/${character.id}` } });
      return;
    }
    router.push({ pathname: "/chat/[characterId]", params: { characterId: character.id } });
  }

  if (!character) {
    return (
      <View style={styles.missing}>
        <ErrorText>{error ?? "Loading..."}</ErrorText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={{ uri: character.avatarUrl }} style={styles.photo} contentFit="cover" contentPosition="top" />
        <View style={styles.scrim}>
          <Text style={styles.badge}>{character.badge === "popular" ? "POPULAR" : "NEW FACE"}</Text>
          <Text style={styles.name}>
            {character.name} <Text style={styles.age}>{character.age}</Text>
          </Text>
          <Text style={styles.occupation}>{character.occupation}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.keywords}>
          {character.keywords.map((keyword) => (
            <Text key={keyword} style={styles.keyword}>
              #{keyword}
            </Text>
          ))}
        </View>
        <View style={styles.about}>
          <Text style={styles.aboutTitle}>About {character.name}</Text>
          <Text style={styles.intro}>{character.intro}</Text>
        </View>
        {character.isActive ? (
          <PrimaryButton label="Start chat" onPress={start} />
        ) : (
          <Text style={styles.closed}>New chats with {character.name} are closed.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, backgroundColor: colors.background, padding: 24 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { backgroundColor: colors.background, paddingBottom: 28 },
  hero: { position: "relative" },
  photo: { width: "100%", aspectRatio: 3 / 4, backgroundColor: colors.muted },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 18,
    backgroundColor: "rgba(19,19,24,0.72)",
  },
  badge: { color: colors.coral, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  name: { color: colors.white, fontSize: 32, fontWeight: "800" },
  body: { padding: 20, gap: 14 },
  closed: { color: colors.mutedForeground, fontSize: 14 },
  age: { color: "rgba(255,255,255,0.72)", fontSize: 18, fontWeight: "500" },
  occupation: { color: "rgba(255,255,255,0.82)", fontSize: 15 },
  keywords: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  keyword: {
    color: colors.coral,
    backgroundColor: colors.coralSoft,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: "700",
  },
  about: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 8 },
  aboutTitle: { color: colors.foreground, fontWeight: "700" },
  intro: { color: colors.foreground, lineHeight: 22 },
});

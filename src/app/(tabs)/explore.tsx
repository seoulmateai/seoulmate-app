import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { apiJson } from "@/lib/api";
import { postsForCharacter } from "@/lib/posts";
import type { PublicCharacter } from "@/lib/types";
import { ErrorText, Eyebrow, Screen } from "@/components/ui";

export default function ExploreScreen() {
  const router = useRouter();
  const [characters, setCharacters] = useState<PublicCharacter[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await apiJson<{ characters: PublicCharacter[] }>("/api/characters");
      setCharacters(body.characters);
      setError(null);
    } catch {
      setError("Couldn't load the feed.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const posts = characters.flatMap((character) =>
    postsForCharacter(character.name).map((post) => ({ post, character })),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Eyebrow>Seoul, lately</Eyebrow>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>Moments from the people you can meet.</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {characters.map((character) => (
            <Pressable
              key={character.id}
              accessibilityRole="button"
              accessibilityLabel={character.name}
              style={styles.person}
              onPress={() => router.push({ pathname: "/character/[id]", params: { id: character.id } })}
            >
              <View style={styles.ring}>
                <Image source={{ uri: character.avatarUrl }} style={styles.avatar} />
              </View>
              <Text style={styles.personName} numberOfLines={1}>
                {character.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <ErrorText>{error}</ErrorText>
        {posts.length === 0 ? <Text style={styles.empty}>No posts yet</Text> : null}
        <View style={styles.grid}>
          {posts.map(({ post, character }) => (
            <Pressable
              key={`${character.id}-${post.id}`}
              style={styles.tile}
              accessibilityLabel={post.alt}
              onPress={() =>
                router.push({
                  pathname: "/post/[characterId]/[postId]",
                  params: { characterId: character.id, postId: post.id, name: character.name },
                })
              }
            >
              <Image source={post.image} style={styles.tileImage} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 24, gap: 14 },
  header: { paddingHorizontal: 20, gap: 6 },
  title: { color: colors.foreground, fontSize: 32, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { color: colors.mutedForeground, fontSize: 15, lineHeight: 22 },
  strip: { gap: 16, paddingHorizontal: 20, paddingVertical: 4 },
  person: { width: 72, alignItems: "center", gap: 6 },
  ring: { padding: 2, borderRadius: 36, borderWidth: 1.5, borderColor: colors.coral },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.muted },
  personName: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
  empty: { color: colors.mutedForeground, textAlign: "center", paddingVertical: 40 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2, paddingHorizontal: 2 },
  tile: { width: "32.6%", aspectRatio: 1, backgroundColor: colors.muted, borderRadius: 4, overflow: "hidden" },
  tileImage: { width: "100%", height: "100%" },
});

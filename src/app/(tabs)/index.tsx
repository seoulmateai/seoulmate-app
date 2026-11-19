import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors } from "@/constants/theme";
import { apiJson } from "@/lib/api";
import type { PublicCharacter } from "@/lib/types";
import { ErrorText, Eyebrow, Screen } from "@/components/ui";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "popular", label: "Popular" },
  { value: "new", label: "New faces" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

const STEPS = [
  { n: "01", title: "Pick someone", body: "Choose a face from the people above." },
  { n: "02", title: "Read their profile", body: "See their story and the words that describe them." },
  { n: "03", title: "Start the chat", body: "Open a private conversation and keep going." },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = (width - 20 * 2 - 12) / 2;
  const [characters, setCharacters] = useState<PublicCharacter[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const body = await apiJson<{ characters: PublicCharacter[] }>("/api/characters");
      setCharacters(body.characters);
      setError(null);
    } catch {
      setError("Couldn't load characters. Is the seoulmate server running?");
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = characters.filter((character) => filter === "all" || character.badge === filter);
  const popular = characters.filter((character) => character.badge === "popular").length;
  const fresh = characters.filter((character) => character.badge === "new").length;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.coral} />}
      >
        <Eyebrow>Your Seoul story starts here</Eyebrow>
        <Text style={styles.title}>Who will you meet in Seoul today?</Text>
        <Text style={styles.subtitle}>Every encounter has a story. Find someone who makes yours unforgettable.</Text>
        <View style={styles.stats}>
          {[
            { value: characters.length, label: "Characters" },
            { value: popular, label: "Popular" },
            { value: fresh, label: "New faces" },
          ].map((stat, index) => (
            <View key={stat.label} style={[styles.stat, index > 0 && styles.statDivider]}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
        <ErrorText>{error}</ErrorText>
        <View style={styles.sectionHead}>
          <View style={styles.sectionCopy}>
            <Eyebrow>Featured</Eyebrow>
            <Text style={styles.sectionTitle}>Meet your Seoulmates</Text>
          </View>
        </View>
        <View style={styles.filters}>
          {FILTERS.map((item) => {
            const on = filter === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(item.value)}
                style={[styles.filter, on && styles.filterOn]}
              >
                <Text style={[styles.filterLabel, on && styles.filterLabelOn]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {visible.length === 0 && !error ? <Text style={styles.empty}>No one in this filter yet.</Text> : null}
        <View style={styles.grid}>
          {visible.map((character) => (
            <Pressable
              key={character.id}
              accessibilityRole="button"
              accessibilityLabel={`${character.name}, ${character.age}, ${character.occupation}`}
              style={[styles.card, { width: cardWidth }]}
              onPress={() => router.push({ pathname: "/character/[id]", params: { id: character.id } })}
            >
              <View style={styles.photoWrap}>
                <Image source={{ uri: character.avatarUrl }} style={styles.photo} contentFit="cover" />
                <Text style={styles.badge}>{character.badge === "popular" ? "POPULAR" : "NEW FACE"}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {character.name} <Text style={styles.age}>{character.age}</Text>
                </Text>
                <Text style={styles.occupation} numberOfLines={1}>
                  {character.occupation}
                </Text>
                <Text style={styles.bio} numberOfLines={2}>
                  {character.bio}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        <Eyebrow>How to start</Eyebrow>
        <Text style={styles.sectionTitle}>Choose someone and say hello</Text>
        <View style={styles.steps}>
          {STEPS.map((step) => (
            <View key={step.n} style={styles.step}>
              <Text style={styles.stepN}>{step.n}</Text>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 28, gap: 12 },
  title: { color: colors.foreground, fontSize: 32, fontWeight: "800", letterSpacing: -1, lineHeight: 38 },
  subtitle: { color: colors.mutedForeground, fontSize: 15, lineHeight: 22 },
  stats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  stat: { flex: 1, paddingVertical: 14 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 14 },
  statValue: { color: colors.foreground, fontSize: 28, fontWeight: "800" },
  statLabel: { color: colors.mutedForeground, fontSize: 12, marginTop: 4 },
  sectionHead: { marginTop: 8 },
  sectionCopy: { gap: 4 },
  sectionTitle: { color: colors.foreground, fontSize: 22, fontWeight: "800" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filter: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterOn: { borderColor: "rgba(255,119,114,0.4)", backgroundColor: colors.coralSoft },
  filterLabel: { color: colors.mutedForeground, fontSize: 12 },
  filterLabelOn: { color: colors.coral, fontWeight: "700" },
  empty: { color: colors.mutedForeground, paddingVertical: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  photoWrap: { position: "relative" },
  photo: { width: "100%", aspectRatio: 3 / 4, backgroundColor: colors.muted },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.62)",
    color: colors.white,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardBody: { padding: 12, gap: 2 },
  name: { color: colors.foreground, fontSize: 16, fontWeight: "800" },
  age: { color: colors.mutedForeground, fontSize: 12, fontWeight: "500" },
  occupation: { color: colors.mutedForeground, fontSize: 12 },
  bio: { color: colors.foreground, fontSize: 12, lineHeight: 17, marginTop: 4, opacity: 0.8 },
  steps: { gap: 8 },
  step: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, gap: 4 },
  stepN: { color: colors.coral, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  stepTitle: { color: colors.foreground, fontSize: 15, fontWeight: "700" },
  stepBody: { color: colors.mutedForeground, fontSize: 13, lineHeight: 18 },
});

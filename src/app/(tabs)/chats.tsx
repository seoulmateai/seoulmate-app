import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, ErrorText, Screen } from "@/components/ui";
import { colors } from "@/constants/theme";
import { ApiError, apiJson } from "@/lib/api";
import { formatListTime } from "@/lib/format";
import type { ChatSummary } from "@/lib/types";

export default function ChatsScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const body = await apiJson<{ chats: ChatSummary[] }>("/api/me/chats");
      setChats(body.chats);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && (e.code === "UNAUTHENTICATED" || e.code === "ONBOARDING_REQUIRED")) return;
      setError("Couldn't load your chats.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.coral}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <Text style={styles.title}>Chats</Text>
        <Text style={styles.subtitle}>Private conversations, in one place.</Text>
        <ErrorText>{error}</ErrorText>
        {chats.length === 0 && !error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyBody}>Choose someone from Home and say hello. Their reply shows up here.</Text>
            <PrimaryButton label="Browse characters" onPress={() => router.push("/")} />
          </View>
        ) : null}
        <View style={styles.list}>
          {chats.map((chat, index) => (
            <Pressable
              key={chat.roomId}
              style={[styles.row, index < chats.length - 1 && styles.rowBorder]}
              onPress={() => router.push({ pathname: "/chat/[characterId]", params: { characterId: chat.characterId } })}
            >
              <Image source={{ uri: chat.avatarUrl }} style={styles.avatar} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {chat.name}
                  </Text>
                  {chat.lastMessageAt ? <Text style={styles.time}>{formatListTime(chat.lastMessageAt)}</Text> : null}
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {chat.preview}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 8, paddingBottom: 28 },
  title: { color: colors.foreground, fontSize: 32, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { color: colors.mutedForeground, fontSize: 15, marginBottom: 8 },
  empty: { alignItems: "flex-start", gap: 10, paddingVertical: 28 },
  emptyTitle: { color: colors.foreground, fontSize: 18, fontWeight: "700" },
  emptyBody: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
  list: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.muted },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" },
  name: { color: colors.foreground, fontSize: 16, fontWeight: "700", flex: 1 },
  time: { color: colors.mutedForeground, fontSize: 12 },
  preview: { color: colors.mutedForeground, fontSize: 14 },
});

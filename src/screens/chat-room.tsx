import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { File } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  type KeyboardEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { css, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { ApiError, apiJson } from "@/lib/api";
import { parseMessageContent, splitInlineEmphasis } from "@/lib/content";
import { formatBubbleTime } from "@/lib/format";
import { notifyReply } from "@/lib/notifications";
import { MAX_AFFECTION, stageIndex, stageLabel } from "@/lib/stages";
import { supabase } from "@/lib/supabase";
import {
  MAX_INPUT_LENGTH,
  MESSAGE_PAGE_SIZE,
  type ChatMessage,
  type ChatRoomPayload,
  type ChatSendResult,
  type RubyWallet,
} from "@/lib/types";
import type { RelationshipView } from "@/lib/stages";

const MESSAGE_COLUMNS = "id, turn_id, role, content, image_path, image_width, image_height, created_at";

type RoomMessage = ChatMessage & { localImageUri?: string };

const typingBounce = css.keyframes({
  "0%": { transform: [{ translateY: 0 }] },
  "35%": { transform: [{ translateY: -5 }] },
  "70%": { transform: [{ translateY: 0 }] },
  "100%": { transform: [{ translateY: 0 }] },
});

// Samsung's IME reports a height a few pixels short of the keys, so the
// composer sits under the keyboard. Keep a small gap above the reported top.
const KEYBOARD_GAP = 16;

function keyboardInset(event: KeyboardEvent) {
  const { height, screenY } = event.endCoordinates;
  if (height <= 0) return 0;
  const cover = Math.max(height, Dimensions.get("screen").height - screenY);
  return cover + KEYBOARD_GAP;
}

export function ChatRoom({ characterId }: { characterId: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<ChatRoomPayload | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [wallet, setWallet] = useState<RubyWallet | null>(null);
  const [relationship, setRelationship] = useState<RelationshipView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [outOfRubies, setOutOfRubies] = useState(false);
  const [failed, setFailed] = useState<{ content: string; imageUri: string | null } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef<FlatList<RoomMessage>>(null);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const body = await apiJson<ChatRoomPayload>(`/api/me/chats/${characterId}`);
      setRoom(body);
      setMessages(body.messages);
      setHasMore(body.hasMore);
      setWallet(body.wallet);
      setRelationship(body.relationship);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setError("This chat isn't available.");
      else setError("Couldn't open this chat.");
    }
  }, [characterId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(keyboardInset(event));
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  async function loadOlder() {
    if (!room || !hasMore || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0].id;
    const { data, error: queryError } = await supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("room_id", room.roomId)
      .lt("id", oldest)
      .order("id", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE + 1);
    setLoadingOlder(false);
    if (queryError || !data) return;
    const rows = data as ChatMessage[];
    setHasMore(rows.length > MESSAGE_PAGE_SIZE);
    setMessages((current) => [...rows.slice(0, MESSAGE_PAGE_SIZE).reverse(), ...current]);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const resized = await manipulateAsync(
      asset.uri,
      asset.width && asset.width > 1600 ? [{ resize: { width: 1600 } }] : [],
      { compress: 0.8, format: SaveFormat.JPEG },
    );
    setAttachment(resized.uri);
  }

  async function send(content: string, imageUri: string | null, episodeStage?: number) {
    if (!room || sending) return;
    const trimmed = content.trim();
    if (episodeStage == null && !trimmed && !imageUri) return;
    if (trimmed.length > MAX_INPUT_LENGTH) {
      setError(`Messages can be ${MAX_INPUT_LENGTH} characters or fewer.`);
      return;
    }
    const pendingId = episodeStage == null ? -Date.now() : null;
    if (pendingId != null) {
      const optimistic: RoomMessage = {
        id: pendingId,
        turn_id: `local-${pendingId}`,
        role: "USER",
        content: trimmed,
        image_path: null,
        image_width: null,
        image_height: null,
        created_at: new Date().toISOString(),
        localImageUri: imageUri ?? undefined,
      };
      setMessages((current) => [...current, optimistic]);
      setDraft((current) => (current === content ? "" : current));
      setAttachment((current) => (current === imageUri ? null : current));
    }
    setSending(true);
    setError(null);
    setFailed(null);
    try {
      const form = new FormData();
      form.append("characterId", characterId);
      form.append("content", episodeStage == null ? trimmed : "");
      if (episodeStage != null) form.append("episodeStage", String(episodeStage));
      if (imageUri) {
        // expo/fetch builds the multipart body in JS and rejects React Native {uri} file parts.
        form.append("image", new File(imageUri) as unknown as Blob);
      }
      const body = await apiJson<ChatSendResult>("/api/chat", { method: "POST", body: form });
      setMessages((current) => [...current.filter((message) => message.id !== pendingId), ...body.messages]);
      setWallet(body.wallet);
      setRelationship(body.relationship);
      const reply = [...body.messages].reverse().find((message) => message.role === "ASSISTANT");
      if (reply) {
        void notifyReply({ characterId, name: room.character.name, content: reply.content });
      }
      if (pendingId == null) {
        setDraft("");
        setAttachment(null);
      }
      if (body.newlyUnlocked) {
        Alert.alert("New episode", "A new episode is ready. You can start it from the bar above.");
      }
    } catch (e) {
      if (pendingId != null) {
        setMessages((current) => current.filter((message) => message.id !== pendingId));
        setDraft((current) => (current.length === 0 ? content : current));
        setAttachment((current) => current ?? imageUri);
      }
      if (e instanceof ApiError && e.code === "INSUFFICIENT_RUBY") {
        setOutOfRubies(true);
        if (e.body && typeof e.body === "object" && "wallet" in e.body) {
          setWallet((e.body as { wallet: RubyWallet }).wallet);
        }
      } else if (e instanceof ApiError && e.code === "BLOCKED") {
        setError("This message couldn't be answered. Try saying it differently.");
        setFailed(episodeStage == null ? { content: trimmed, imageUri } : null);
      } else {
        setError("He couldn't reply right now. Please try again.");
        setFailed(episodeStage == null ? { content: trimmed, imageUri } : null);
      }
    } finally {
      setSending(false);
    }
  }

  const rubies = (wallet?.free ?? 0) + (wallet?.paid ?? 0);
  const partnerTyping = sending;

  useEffect(() => {
    const frame = requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [keyboardHeight, messages.length, partnerTyping]);

  return (
    <SafeAreaView
      style={[styles.screen, { paddingBottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/chats"))}
          hitSlop={8}
        >
          <SymbolView name={{ ios: "chevron.left", android: "chevron_left" }} tintColor={colors.foreground} size={26} />
        </Pressable>
        {room ? <Image source={{ uri: room.character.avatarUrl }} style={styles.headerAvatar} /> : null}
        <Text style={styles.headerName} numberOfLines={1}>
          {room?.character.name ?? "Chat"}
        </Text>
        <Text style={styles.rubies}>{rubies} rubies</Text>
      </View>

      {relationship ? (
        <View style={styles.affection}>
          <Text style={styles.stage}>{stageLabel(stageIndex(relationship.affection))}</Text>
          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${(relationship.affection / MAX_AFFECTION) * 100}%` }]} />
          </View>
          <Text style={styles.score}>
            {relationship.affection}/{MAX_AFFECTION}
          </Text>
          {relationship.nextEpisodeStage != null ? (
            <Pressable disabled={sending} onPress={() => send("", null, relationship.nextEpisodeStage ?? undefined)}>
              <Text style={styles.episode}>Start episode {relationship.nextEpisodeStage}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!room && !error ? <ActivityIndicator color={colors.coral} style={styles.loader} /> : null}
      <ErrorTextInline text={error} />

      <FlatList
        ref={listRef}
        style={styles.listView}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListHeaderComponent={
          hasMore ? (
            <Pressable onPress={loadOlder} style={styles.older}>
              <Text style={styles.olderLabel}>{loadingOlder ? "Loading..." : "Load earlier messages"}</Text>
            </Pressable>
          ) : undefined
        }
        renderItem={({ item }) => <Bubble message={item} />}
        ListFooterComponent={
          partnerTyping ? <TypingDots name={room?.character.name} /> : undefined
        }
      />

      {failed ? (
        <Pressable onPress={() => send(failed.content, failed.imageUri)} style={styles.retry}>
          <Text style={styles.retryLabel}>Tap to try that message again</Text>
        </Pressable>
      ) : null}

      {attachment ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: attachment }} style={styles.preview} />
          <Pressable onPress={() => setAttachment(null)}>
            <Text style={styles.remove}>Remove photo</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable onPress={pickImage} disabled={sending} style={styles.photoButton}>
          <Text style={styles.photoLabel}>Photo</Text>
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`Message ${room?.character.name ?? ""}`}
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          multiline
          maxLength={MAX_INPUT_LENGTH}
        />
        <Pressable onPress={() => send(draft, attachment)} disabled={sending} style={styles.send}>
          <Text style={styles.sendLabel}>Send</Text>
        </Pressable>
      </View>

      <Modal visible={outOfRubies} transparent animationType="fade" onRequestClose={() => setOutOfRubies(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>You're out of rubies</Text>
            <Text style={styles.modalBody}>Your free rubies refill at midnight (Korea time). Ruby packs are coming soon!</Text>
            <Pressable onPress={() => setOutOfRubies(false)} style={styles.modalButton}>
              <Text style={styles.modalButtonLabel}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TypingDots({ name }: { name?: string }) {
  const reduced = useReducedMotion();
  return (
    <View accessibilityLabel={`${name ?? "They"} is typing`} style={[styles.message, styles.messageTheirs]}>
      <View style={[styles.bubble, styles.bubbleAi, styles.dotsBubble]}>
        {[0, 140, 280].map((delay) => (
          <Animated.View
            key={delay}
            style={[
              styles.dot,
              reduced
                ? undefined
                : {
                    animationName: typingBounce,
                    animationDuration: "900ms",
                    animationDelay: `${delay}ms`,
                    animationIterationCount: "infinite",
                    animationTimingFunction: "ease-in-out",
                  },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function ErrorTextInline({ text }: { text: string | null }) {
  if (!text) return null;
  return <Text style={styles.error}>{text}</Text>;
}

function Bubble({ message }: { message: RoomMessage }) {
  const mine = message.role === "USER";
  const parts = parseMessageContent(message.content);
  return (
    <View style={[styles.message, mine ? styles.messageMine : styles.messageTheirs]}>
      {message.localImageUri ? (
        <Image source={{ uri: message.localImageUri }} style={styles.chatImage} contentFit="cover" />
      ) : message.image_path ? (
        <ChatImage messageId={message.id} width={message.image_width} height={message.image_height} />
      ) : null}
      {parts.map((part, index) =>
        part.kind === "NARRATION" ? (
          <Text key={index} style={styles.narration}>
            {part.text}
          </Text>
        ) : (
          <View key={index} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAi]}>
            <Text style={mine ? styles.mineText : styles.aiText}>
              {splitInlineEmphasis(part.text).map((span, spanIndex) => (
                <Text key={spanIndex} style={span.emphasis ? styles.emphasis : undefined}>
                  {span.text}
                </Text>
              ))}
            </Text>
          </View>
        ),
      )}
      <Text style={styles.time}>{formatBubbleTime(message.created_at)}</Text>
    </View>
  );
}

function ChatImage({
  messageId,
  width,
  height,
}: {
  messageId: number;
  width: number | null;
  height: number | null;
}) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    apiJson<{ url: string }>(`/api/chat/images/${messageId}?format=json`)
      .then((body) => {
        if (active) setUri(body.url);
      })
      .catch(() => {
        if (active) setUri(null);
      });
    return () => {
      active = false;
    };
  }, [messageId]);
  const aspectRatio = width && height ? width / height : 1;
  if (!uri) return <View style={[styles.chatImage, { aspectRatio }]} />;
  return <Image source={{ uri }} style={[styles.chatImage, { aspectRatio }]} contentFit="cover" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.chat },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  back: { color: colors.coral, fontWeight: "700" },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.muted },
  headerName: { flex: 1, color: colors.foreground, fontSize: 17, fontWeight: "700" },
  rubies: { color: colors.mutedForeground, fontSize: 12 },
  affection: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 10,
    gap: 8,
  },
  stage: { color: colors.coral, fontSize: 12, fontWeight: "800" },
  meter: { height: 6, borderRadius: 99, backgroundColor: colors.muted, overflow: "hidden" },
  meterFill: { height: "100%", backgroundColor: colors.coral },
  score: { color: colors.mutedForeground, fontSize: 12 },
  episode: { color: colors.coral, fontWeight: "700" },
  loader: { marginTop: 24 },
  error: { color: colors.destructive, paddingHorizontal: 16, paddingBottom: 8 },
  listView: { flex: 1 },
  list: { padding: 16, gap: 12 },
  typingStack: { gap: 8, paddingTop: 4 },
  dotsBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.9)" },
  older: { alignItems: "center", paddingBottom: 12 },
  olderLabel: { color: colors.coral, fontWeight: "700" },
  message: { gap: 6, maxWidth: "100%" },
  messageMine: { alignItems: "flex-end" },
  messageTheirs: { alignItems: "flex-start" },
  narration: { color: colors.mutedForeground, fontStyle: "italic", textAlign: "center", alignSelf: "center", lineHeight: 20 },
  bubble: { maxWidth: "82%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: colors.bubbleUser },
  bubbleAi: { backgroundColor: colors.bubbleAi },
  mineText: { color: colors.bubbleUserText, fontSize: 16, lineHeight: 22 },
  aiText: { color: colors.foreground, fontSize: 16, lineHeight: 22 },
  emphasis: { fontStyle: "italic" },
  time: { color: colors.mutedForeground, fontSize: 11 },
  chatImage: { width: 220, borderRadius: 12, backgroundColor: colors.muted },
  retry: { paddingHorizontal: 16, paddingBottom: 6 },
  retryLabel: { color: colors.coral, fontWeight: "700" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  preview: { width: 56, height: 56, borderRadius: 8 },
  remove: { color: colors.mutedForeground },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  photoButton: { paddingVertical: 10 },
  photoLabel: { color: colors.coral, fontWeight: "700" },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    borderRadius: 16,
    backgroundColor: colors.card,
    color: colors.foreground,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  send: { paddingVertical: 10 },
  sendLabel: { color: colors.coral, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { width: "100%", backgroundColor: colors.card, borderRadius: 18, padding: 20, gap: 12 },
  modalTitle: { color: colors.foreground, fontSize: 18, fontWeight: "700", textAlign: "center" },
  modalBody: { color: colors.mutedForeground, textAlign: "center", lineHeight: 20 },
  modalButton: { backgroundColor: colors.coral, borderRadius: 12, minHeight: 44, alignItems: "center", justifyContent: "center" },
  modalButtonLabel: { color: colors.white, fontWeight: "700" },
});

import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors } from "@/constants/theme";
import { postForCharacter } from "@/lib/posts";

export default function PostScreen() {
  const { characterId, postId, name } = useLocalSearchParams<{
    characterId: string;
    postId: string;
    name?: string;
  }>();
  const router = useRouter();
  const post = name && postId ? postForCharacter(name, postId) : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: name ?? "Post" }} />
      {post ? (
        <>
          <Image source={post.image} style={styles.image} contentFit="cover" accessibilityLabel={post.alt} />
          <Text style={styles.caption}>{post.caption}</Text>
          <Pressable onPress={() => router.push({ pathname: "/character/[id]", params: { id: characterId } })}>
            <Text style={styles.link}>View profile</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.caption}>This post isn't available.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, backgroundColor: colors.background, flexGrow: 1 },
  image: { width: "100%", aspectRatio: 1, borderRadius: 18, backgroundColor: colors.muted },
  caption: { color: colors.foreground, fontSize: 16, lineHeight: 24 },
  link: { color: colors.coral, fontWeight: "700" },
});

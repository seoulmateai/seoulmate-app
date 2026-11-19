import { useLocalSearchParams } from "expo-router";

import { ChatRoom } from "@/screens/chat-room";

export default function ChatRoute() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  if (!characterId) return null;
  return <ChatRoom characterId={characterId} />;
}

import type { RelationshipView } from "@/lib/stages";

export type PublicCharacter = {
  id: string;
  name: string;
  age: number;
  occupation: string;
  bio: string;
  intro: string;
  keywords: string[];
  badge: "popular" | "new";
  avatarUrl: string;
  isActive: boolean;
};

export type ChatSummary = {
  roomId: number;
  characterId: string;
  name: string;
  occupation: string;
  avatarUrl: string;
  isActive: boolean;
  lastMessageAt: string | null;
  preview: string;
};

export type ChatMessage = {
  id: number;
  turn_id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  created_at: string;
};

export type RubyWallet = { free: number; paid: number; pendingPoints: number };

export type ChatRoomPayload = {
  ok: true;
  roomId: number;
  character: {
    id: string;
    name: string;
    occupation: string;
    avatarUrl: string;
    isActive: boolean;
  };
  messages: ChatMessage[];
  hasMore: boolean;
  wallet: RubyWallet;
  relationship: RelationshipView;
};

export type ChatSendResult = {
  ok: true;
  messages: ChatMessage[];
  wallet: RubyWallet;
  relationship: RelationshipView;
  newlyUnlocked: boolean;
};

export const MESSAGE_PAGE_SIZE = 30;
export const MAX_INPUT_LENGTH = 1000;

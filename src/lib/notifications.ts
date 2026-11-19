import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";

import { parseMessageContent } from "@/lib/content";

const PREF_KEY = "notifications.enabled";
const CHANNEL = "messages";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function notificationsPreferred() {
  return (await SecureStore.getItemAsync(PREF_KEY)) === "1";
}

export async function setNotificationsPreferred(on: boolean) {
  await SecureStore.setItemAsync(PREF_KEY, on ? "1" : "0");
}

export async function prepareNotifications() {
  if (Platform.OS !== "android") return;
  await Notifications.deleteNotificationChannelAsync(CHANNEL).catch(() => undefined);
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: "Messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 80, 180],
    lightColor: "#ff7772",
  });
}

export async function notificationStatus(): Promise<"on" | "off" | "blocked"> {
  const preferred = await notificationsPreferred();
  const permission = await Notifications.getPermissionsAsync();
  if (preferred && permission.granted) return "on";
  if (!permission.granted && !permission.canAskAgain) return "blocked";
  return "off";
}

export async function enableNotifications() {
  await prepareNotifications();
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted || !current.canAskAgain ? current : await Notifications.requestPermissionsAsync();
  const granted = permission.granted;
  if (granted) await setNotificationsPreferred(true);
  return granted;
}

/** Ask once. Later visits follow the My page switch. */
export async function bootstrapNotifications() {
  await prepareNotifications();
  const stored = await SecureStore.getItemAsync(PREF_KEY);
  if (stored != null) return;
  const permission = await Notifications.requestPermissionsAsync();
  await setNotificationsPreferred(permission.granted);
}

export function replyPreview(content: string) {
  const dialogue = parseMessageContent(content)
    .filter((part) => part.kind === "DIALOGUE")
    .map((part) => part.text)
    .join(" ");
  const text = (dialogue || content.replace(/\*/g, "")).replace(/\s+/g, " ").trim();
  return text.slice(0, 140) || "Sent you a message";
}

export async function notifyReply(input: { characterId: string; name: string; content: string }) {
  if (AppState.currentState === "active") return;
  if (!(await notificationsPreferred())) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  await prepareNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.name,
      body: replyPreview(input.content),
      data: { characterId: input.characterId },
      sound: true,
    },
    trigger: null,
  });
}

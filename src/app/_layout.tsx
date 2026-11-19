import { DarkTheme, ThemeProvider, useGlobalSearchParams, useRouter, useSegments } from "expo-router";
import { Stack } from "expo-router/stack";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { colors } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { bootstrapNotifications } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.foreground,
    border: colors.border,
    primary: colors.coral,
    notification: colors.coral,
  },
};

function pathFrom(segments: string[]) {
  const parts = segments.filter((segment) => !segment.startsWith("(") && segment !== "index");
  return parts.length ? `/${parts.join("/")}` : "/";
}

function safeNext(value: string | undefined, fallback: string) {
  if (!value || !value.startsWith("/")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/onboarding") || value.startsWith("/auth")) {
    return "/";
  }
  return value;
}

function openNotificationChat(data: Record<string, unknown> | undefined, router: ReturnType<typeof useRouter>) {
  const characterId = data?.characterId;
  if (typeof characterId === "string" && characterId.length > 0) {
    router.push({ pathname: "/chat/[characterId]", params: { characterId } });
  }
}

function NotificationBridge() {
  const router = useRouter();

  useEffect(() => {
    bootstrapNotifications().catch(() => undefined);
    const openedAt = Date.now();
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        if (openedAt - response.notification.date > 15_000) return;
        openNotificationChat(response.notification.request.content.data, router);
      })
      .catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotificationChat(response.notification.request.content.data, router);
    });
    return () => subscription.remove();
  }, [router]);

  return null;
}

function Gate({ children }: { children: React.ReactNode }) {
  const { ready, session, profile } = useAuth();
  const segments = useSegments() as string[];
  const params = useGlobalSearchParams<{ next?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const top = segments[0];
    const tab = top === "(tabs)" ? segments[1] : undefined;
    const needsUser =
      tab === "chats" || tab === "settings" || top === "chat" || top === "inquiry" || top === "onboarding";
    const here = pathFrom(segments);
    const next = safeNext(typeof params.next === "string" ? params.next : undefined, "/");

    if (!session && needsUser) {
      router.replace({ pathname: "/login", params: { next: here } });
      return;
    }
    if (session && profile === undefined) return;
    if (session && !profile && top === "login") {
      router.replace({ pathname: "/onboarding", params: { next } });
      return;
    }
    if (session && !profile && needsUser && top !== "onboarding") {
      router.replace({ pathname: "/onboarding", params: { next: here } });
      return;
    }
    if (session && profile && (top === "login" || top === "onboarding")) {
      router.replace(next as "/");
    }
  }, [params.next, profile, ready, router, segments, session]);

  return children;
}

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <AuthProvider>
        <StatusBar style="light" />
        <NotificationBridge />
        <Gate>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.foreground,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ title: "Welcome", headerBackVisible: false }} />
            <Stack.Screen name="character/[id]" options={{ title: "Profile" }} />
            <Stack.Screen name="chat/[characterId]" options={{ headerShown: false }} />
            <Stack.Screen name="post/[characterId]/[postId]" options={{ title: "Post" }} />
            <Stack.Screen name="inquiry" options={{ title: "Contact us" }} />
            <Stack.Screen name="legal/[page]" options={{ title: "" }} />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          </Stack>
        </Gate>
      </AuthProvider>
    </ThemeProvider>
  );
}

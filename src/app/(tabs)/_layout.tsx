import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";

import { colors } from "@/constants/theme";

const TABS = [
  { name: "index", title: "Home", ios: "house.fill", android: "home" },
  { name: "explore", title: "Explore", ios: "safari", android: "explore" },
  { name: "chats", title: "Chats", ios: "message.fill", android: "chat_bubble" },
  { name: "settings", title: "My page", ios: "person.fill", android: "person" },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: tab.ios, android: tab.android }} tintColor={color} size={22} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { completeAuthCode } from "@/lib/supabase";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (params.error_description) throw new Error(params.error_description);
        if (params.code) await completeAuthCode(params.code);
        if (active) router.replace("/");
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Sign-in failed.");
      }
    })();
    return () => {
      active = false;
    };
  }, [params.code, params.error_description, router]);

  return (
    <View style={styles.screen}>
      {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.coral} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: colors.destructive, textAlign: "center" },
});

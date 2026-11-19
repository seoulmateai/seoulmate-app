import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { SafeAreaView, type Edges } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

export function Screen({ children, edges = ["top"] }: { children: React.ReactNode; edges?: Edges }) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

export function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.buttonPressed]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

export function ErrorText({ children }: { children: string | null }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  eyebrow: {
    color: colors.coral,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  field: { gap: 6 },
  label: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.foreground,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  button: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonPressed: { opacity: 0.7 },
  buttonLabel: { color: colors.white, fontSize: 16, fontWeight: "700" },
  error: { color: colors.destructive, fontSize: 13 },
});

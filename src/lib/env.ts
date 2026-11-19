function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`${name} is not set. Add it to .env.local and restart Metro.`);
  return value;
}

// Direct `process.env.EXPO_PUBLIC_*` reads so the release bundle inlines the values.
export const env = {
  get supabaseUrl() {
    return required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  },
  get apiUrl() {
    return required("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL).replace(/\/$/, "");
  },
};

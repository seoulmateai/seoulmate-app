import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { secureStore } from "@/lib/secure-store";

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

const usedCodes = new Set<string>();

export async function completeAuthCode(code: string) {
  if (usedCodes.has(code)) return;
  usedCodes.add(code);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    usedCodes.delete(code);
    throw error;
  }
}

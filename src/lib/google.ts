import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { completeAuthCode, supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export function authRedirectUrl() {
  return Linking.createURL("auth/callback");
}

export async function signInWithGoogle() {
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Google sign-in did not return a URL.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return false;
  const code = new URL(result.url).searchParams.get("code");
  if (!code) throw new Error("Google sign-in did not return a code.");
  await completeAuthCode(code);
  return true;
}

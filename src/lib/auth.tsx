import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

export type Profile = { id: string; nickname: string };

type AuthValue = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null | undefined;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    let active = true;
    setProfile(undefined);
    loadProfile(session.user.id)
      .then((next) => {
        if (active) setProfile(next);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      profile,
      refreshProfile: async () => {
        if (!session) {
          setProfile(null);
          return;
        }
        setProfile(await loadProfile(session.user.id));
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [profile, ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

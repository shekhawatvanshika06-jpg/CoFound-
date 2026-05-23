import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { api, getToken, setToken } from "./api";

export type Me = {
  user_id: string;
  email: string;
  name: string;
  avatar?: string | null;
  onboarded: boolean;
  skills: string[];
  interests: string[];
  goal?: string | null;
  stage?: string | null;
  time_commit?: string | null;
  city?: string | null;
  bio?: string | null;
};

type Ctx = {
  me: Me | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setMe: (m: Me) => void;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMeState] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = await getToken();
    if (!t) {
      setMeState(null);
      setLoading(false);
      return;
    }
    try {
      const m = await api.get<Me>("/auth/me");
      setMeState(m);
    } catch {
      await setToken(null);
      setMeState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signUp = async (email: string, password: string, name: string) => {
    const r = await api.post<{ token: string; user: Me }>("/auth/signup", {
      email, password, name,
    }, { auth: false });
    await setToken(r.token);
    setMeState(r.user);
  };

  const logIn = async (email: string, password: string) => {
    const r = await api.post<{ token: string; user: Me }>("/auth/login", {
      email, password,
    }, { auth: false });
    await setToken(r.token);
    setMeState(r.user);
  };

  const logInWithGoogle = async () => {
    const redirectUrl =
      Platform.OS === "web"
        // @ts-ignore - web-only
        ? `${window.location.origin}/`
        : Linking.createURL("auth");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

    let sessionId: string | null = null;

    if (Platform.OS === "web") {
      // @ts-ignore
      window.location.href = authUrl;
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type !== "success" || !result.url) {
      throw { status: 0, message: "Sign-in cancelled" };
    }
    const url = result.url;
    // session_id may be in hash or query
    const hashIdx = url.indexOf("#");
    const hashPart = hashIdx >= 0 ? url.slice(hashIdx + 1) : "";
    const queryIdx = url.indexOf("?");
    const queryPart = queryIdx >= 0 ? url.slice(queryIdx + 1).split("#")[0] : "";
    const parse = (s: string) => {
      const out: Record<string, string> = {};
      s.split("&").filter(Boolean).forEach((kv) => {
        const [k, v] = kv.split("=");
        out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
      });
      return out;
    };
    sessionId = parse(hashPart).session_id || parse(queryPart).session_id;
    if (!sessionId) throw { status: 0, message: "Missing session id" };

    // Fetch user data from Emergent
    const r = await fetch(
      "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
      { headers: { "X-Session-ID": sessionId } },
    );
    if (!r.ok) throw { status: r.status, message: "Google auth failed" };
    const d = await r.json();

    const back = await api.post<{ token: string; user: Me }>(
      "/auth/google-session",
      {
        session_token: d.session_token,
        name: d.name,
        email: d.email,
        picture: d.picture,
      },
      { auth: false },
    );
    await setToken(back.token);
    setMeState(back.user);
  };

  const logOut = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    await setToken(null);
    setMeState(null);
  };

  return (
    <AuthCtx.Provider
      value={{ me, loading, signUp, logIn, logInWithGoogle, logOut, refresh, setMe: setMeState }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

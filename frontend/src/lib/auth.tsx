"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setTokens, clearTokens } from "./api";

type UserT = {
  id: string;
  full_name: string;
  email: string;
  role: string;
} | null;

const AuthContext = createContext<{
  user: UserT;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}>({ user: null, loading: true, login: async () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserT>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const tokens = await api.post("/auth/login", { email, password });
    setTokens(tokens.access_token, tokens.refresh_token);
    const me = await api.get("/auth/me");
    setUser(me);
    router.push("/dashboard");
  }

  function logout() {
    clearTokens();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

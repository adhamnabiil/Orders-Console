import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearToken } from "../api/http";
import { login as loginApi } from "../api/auth";
import { readAuthUser, type TokenPayload } from "./token";

type AuthContextValue = {
  user: TokenPayload | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TokenPayload | null>(() => readAuthUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      async login(email, password) {
        await loginApi(email, password);
        setUser(readAuthUser());
      },
      logout() {
        clearToken();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

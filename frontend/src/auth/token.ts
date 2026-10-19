import { jwtDecode } from "jwt-decode";
import { getToken } from "../api/http";

export type TokenPayload = {
  sub: string;
  role: "admin" | "agent";
  email: string;
  exp: number;
};

export function readAuthUser(): TokenPayload | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = jwtDecode<TokenPayload>(token);
    if (payload.exp * 1000 <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

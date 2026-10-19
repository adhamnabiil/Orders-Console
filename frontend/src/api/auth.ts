import { http, setToken } from "./http";

export async function login(email: string, password: string): Promise<string> {
  const { data } = await http.post<{ token: string }>("/auth/login", {
    email,
    password,
  });
  setToken(data.token);
  return data.token;
}

import { axiosInstance, setToken } from "./axiosInstance";

export const authApi = {
  login: async (email: string, password: string): Promise<string> => {
    const { data } = await axiosInstance.post<{ token: string }>(
      "/auth/login",
      { email, password },
    );
    setToken(data.token);
    return data.token;
  },
};

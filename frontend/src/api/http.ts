import axios, { AxiosHeaders } from "axios";
import { useAuthStore } from "@/stores/auth";

const isProd = Boolean((import.meta as any).env?.PROD);
const envBase = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)?.trim();
const inferredBase =
  typeof window !== "undefined" ? `${window.location.origin}/api/v1` : undefined;

export const API_BASE_URL =
  (!isProd ? inferredBase : undefined) ??
  envBase ??
  inferredBase ??
  "http://127.0.0.1:8010/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = AxiosHeaders.from(config.headers ?? {});
    (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      const { token, clear } = useAuthStore.getState();
      if (token) clear();
    }
    return Promise.reject(error);
  },
);

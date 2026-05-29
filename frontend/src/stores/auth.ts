import { create } from "zustand";
import type { TokenResponse, UserPublic } from "@/api/types";

type AuthState = {
  token: string | null;
  user: UserPublic | null;
  setAuth: (payload: TokenResponse) => void;
  setUser: (user: UserPublic) => void;
  clear: () => void;
};

const TOKEN_KEY = "isa_access_token";
const USER_KEY = "isa_user";

function loadToken(): string | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw && raw.trim().length > 0 ? raw : null;
}

function loadUser(): UserPublic | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserPublic;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: loadToken(),
  user: loadUser(),
  setAuth: (payload) => {
    localStorage.setItem(TOKEN_KEY, payload.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    set({ token: payload.access_token, user: payload.user });
  },
  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },
}));


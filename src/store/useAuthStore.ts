import { create } from "zustand";
import { apiFetch, clearAuthTokens, getAccessToken } from "@/lib/api";

interface Role {
  id: number;
  name: string;
  permissions: string[];
}

interface User {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  role?: Role;
  roleId?: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  fetchUser: async () => {
    set({ isLoading: true, error: null });
    try {
      if (!getAccessToken()) {
        set({ user: null, isLoading: false });
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const user = await apiFetch<User>(`${apiUrl}/users/me`);
      set({ user, isLoading: false });
    } catch (error) {
      set({
        user: null,
        error: error instanceof Error ? error.message : "Failed to fetch user profile",
        isLoading: false,
      });
    }
  },
  logout: () => {
    clearAuthTokens();
    set({ user: null });
  },
}));

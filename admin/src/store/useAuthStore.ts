import { create } from 'zustand';
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../lib/api';
import { AuthUser } from '../types/pos';

const tokenKey = 'restaurant-pos-auth-token';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  login: (login: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  clearError: () => void;
  hasPermission: (...permissions: string[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(tokenKey),
  user: null,
  loading: false,
  initialized: false,
  error: null,
  clearError: () => set({ error: null }),
  hasPermission: (...permissions) => {
    const user = get().user;
    if (!user) return false;
    return permissions.some((permission) => user.permissions.includes(permission));
  },
  bootstrap: async () => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      set({ initialized: true, user: null, token: null });
      return;
    }

    set({ loading: true, error: null });
    try {
      const user = await fetchCurrentUser();
      set({ token, user, loading: false, initialized: true });
    } catch (error) {
      localStorage.removeItem(tokenKey);
      set({
        token: null,
        user: null,
        loading: false,
        initialized: true,
        error: error instanceof Error ? error.message : 'Session invalide'
      });
    }
  },
  login: async (login, password) => {
    set({ loading: true, error: null });
    try {
      const response = await loginRequest({ login, password });
      localStorage.setItem(tokenKey, response.token);
      set({
        token: response.token,
        user: response.user,
        loading: false,
        initialized: true
      });
      return true;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Connexion impossible'
      });
      return false;
    }
  },
  logout: async () => {
    try {
      await logoutRequest();
    } catch {
      // ignore logout transport errors, local cleanup is still needed
    }
    localStorage.removeItem(tokenKey);
    set({
      token: null,
      user: null,
      initialized: true,
      error: null
    });
  }
}));

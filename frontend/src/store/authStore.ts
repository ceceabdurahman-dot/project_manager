import { create } from 'zustand';
import type { User } from '../types';
import { authApi } from '../api/auth.api';

interface AuthState {
  user: User | null; isLoading: boolean; hasCheckedSession: boolean;
  login:  (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:  null,
  isLoading: false,
  hasCheckedSession: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(email, password);
      set({ user: data.user, hasCheckedSession: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, hasCheckedSession: true });
    }
    window.location.href = '/login';
  },

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.getMe();
      set({ user: data.user, hasCheckedSession: true });
    } catch {
      set({ user: null, hasCheckedSession: true });
    } finally {
      set({ isLoading: false });
    }
  },
}));

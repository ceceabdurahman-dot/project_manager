import { create } from 'zustand';
import type { User } from '../types';
import { authApi } from '../api/auth.api';

interface AuthState {
  user: User | null; token: string | null; isLoading: boolean;
  login:  (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:  null,
  token: localStorage.getItem('token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(email, password);
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  fetchMe: async () => {
    try {
      const { data } = await authApi.getMe();
      set({ user: data.user });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null });
    }
  },
}));

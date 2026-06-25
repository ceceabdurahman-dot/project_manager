import api from './axios';
import type { User } from '../types';

export const authApi = {
  login:  (email: string, password: string) =>
    api.post<{ success: boolean; user: User }>('/auth/login', { email, password }),

  logout: () =>
    api.post<{ success: boolean; message: string }>('/auth/logout'),

  getMe:  () =>
    api.get<{ success: boolean; user: User }>('/auth/me'),

  // currentPassword diperlukan jika mengganti password (keamanan: verifikasi identitas)
  updateProfile: (data: { name?: string; currentPassword?: string; newPassword?: string }) =>
    api.put<{ success: boolean; user: User }>('/auth/profile', data),

  // Admin endpoints
  getUsers: () =>
    api.get<{ success: boolean; users: User[] }>('/auth/users'),

  createUser: (data: { name: string; email: string; password: string; role: string }) =>
    api.post<{ success: boolean; user: User }>('/auth/users', data),

  resetPassword: (userId: string, password: string) =>
    api.post<{ success: boolean; message: string }>(`/auth/users/${userId}/reset-password`, { password }),

  toggleActive: (userId: string) =>
    api.patch<{ success: boolean; isActive: boolean }>(`/auth/users/${userId}/toggle-active`),
};

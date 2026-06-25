import api from './axios';
import type { Project, ProjectStats } from '../types';

export const projectsApi = {
  getAll:       () => api.get<{ success: boolean; projects: Project[] }>('/projects'),
  create:       (data: Partial<Project>) => api.post<{ success: boolean; project: Project }>('/projects', data),
  getOne:       (id: string) => api.get<{ success: boolean; project: Project }>(`/projects/${id}`),
  update:       (id: string, data: Partial<Project>) => api.put<{ success: boolean; project: Project }>(`/projects/${id}`, data),
  remove:       (id: string) => api.delete(`/projects/${id}`),
  getMembers:       (id: string) => api.get<{ success: boolean; members: any[] }>(`/projects/${id}/members`),
  getAvailableUsers: (id: string) => api.get<{ success: boolean; users: any[] }>(`/projects/${id}/available-users`),
  addMember:        (id: string, userId: string, role: string) => api.post<{ success: boolean; member: any }>(`/projects/${id}/members`, { userId, role }),
  updateMemberRole: (id: string, userId: string, role: string) => api.put<{ success: boolean; member: any }>(`/projects/${id}/members/${userId}`, { role }),
  removeMember:     (id: string, userId: string) => api.delete<{ success: boolean; message: string }>(`/projects/${id}/members/${userId}`),
  getStats:         (id: string) => api.get<{ success: boolean; stats: ProjectStats }>(`/projects/${id}/stats`),
};

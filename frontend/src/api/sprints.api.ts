import api from './axios';
import type { Sprint } from '../types';

export interface SprintWithStats extends Sprint {
  taskCount: number;
  doneCount: number;
  totalPoints: number;
  donePoints: number;
  progress: number;
}

export const sprintsApi = {
  getAll:    (projectId: string) =>
    api.get<{ success: boolean; sprints: SprintWithStats[] }>(`/projects/${projectId}/sprints`),
  create:    (projectId: string, data: { name: string; goal?: string; startDate: string; endDate: string }) =>
    api.post<{ success: boolean; sprint: Sprint }>(`/projects/${projectId}/sprints`, data),
  getOne:    (id: string) =>
    api.get<{ success: boolean; sprint: Sprint }>(`/sprints/${id}`),
  update:    (id: string, data: { name: string; goal?: string; startDate: string; endDate: string }) =>
    api.put<{ success: boolean; sprint: Sprint }>(`/sprints/${id}`, data),
  remove:    (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/sprints/${id}`),
  start:     (id: string) =>
    api.patch<{ success: boolean; sprint: Sprint; message: string }>(`/sprints/${id}/start`),
  complete:  (id: string) =>
    api.patch<{ success: boolean; sprint: Sprint; message: string; movedTasks: number }>(`/sprints/${id}/complete`),
};

import api from './axios';
import type { Task, TaskStatus, Comment, Attachment, ActivityLog } from '../types';

export const tasksApi = {
  getAll:    (projectId: string, params?: Record<string, string>) =>
    api.get<{ success: boolean; tasks: Task[] }>(`/projects/${projectId}/tasks`, { params }),
  create:    (projectId: string, data: Partial<Task>) =>
    api.post<{ success: boolean; task: Task }>(`/projects/${projectId}/tasks`, data),
  getOne:    (id: string) =>
    api.get<{ success: boolean; task: Task }>(`/tasks/${id}`),
  update:    (id: string, data: Partial<Task>) =>
    api.put<{ success: boolean; task: Task }>(`/tasks/${id}`, data),
  remove:    (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/tasks/${id}`),
  move:      (id: string, status: TaskStatus, position: number) =>
    api.patch<{ success: boolean; task: Task }>(`/tasks/${id}/move`, { status, position }),

  addComment: (taskId: string, content: string) =>
    api.post<{ success: boolean; comment: Comment }>(`/tasks/${taskId}/comments`, { content }),
  updateComment: (taskId: string, commentId: string, content: string) =>
    api.put<{ success: boolean; comment: Comment }>(`/tasks/${taskId}/comments/${commentId}`, { content }),
  deleteComment: (taskId: string, commentId: string) =>
    api.delete<{ success: boolean; message: string }>(`/tasks/${taskId}/comments/${commentId}`),

  upload: (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ success: boolean; attachment: Attachment }>(
      `/tasks/${taskId}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
  downloadAttachment: (taskId: string, attachmentId: string) =>
    api.get<Blob>(`/tasks/${taskId}/attachments/${attachmentId}/download`, { responseType: 'blob' }),
  deleteAttachment: (taskId: string, attachmentId: string) =>
    api.delete<{ success: boolean; message: string }>(`/tasks/${taskId}/attachments/${attachmentId}`),
};

// ── Reports / Analytics ───────────────────────────────────────────────────────

interface DashboardResponse {
  success: boolean;
  dashboard: {
    totalActive: number;
    completedThisWeek: number;
    overdueCount: number;
    assignedToMe: number;
    recentActivity: ActivityLog[];
  };
}

interface WorkloadUser { id: string; name: string; avatar?: string; }
interface WorkloadEntry { user: WorkloadUser; tasks: number; byPriority: Record<string, number>; }
interface WorkloadResponse { success: boolean; workload: WorkloadEntry[]; }

interface BurndownPoint { date: string; ideal: number; actual: number; }
interface BurndownResponse {
  success: boolean;
  burndown: { data: BurndownPoint[]; totalPoints: number; };
}

interface ActivityResponse {
  success: boolean;
  activities: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
}

export const reportsApi = {
  getDashboard: () =>
    api.get<DashboardResponse>('/dashboard/summary'),
  getWorkload: (projectId: string) =>
    api.get<WorkloadResponse>(`/reports/workload/${projectId}`),
  getBurndown: (sprintId: string) =>
    api.get<BurndownResponse>(`/reports/burndown/${sprintId}`),
  getProjectActivity: (projectId: string, params?: { limit?: number; offset?: number }) =>
    api.get<ActivityResponse>(`/projects/${projectId}/activity`, { params }),
};

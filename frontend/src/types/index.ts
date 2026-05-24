export interface User {
  id: string; name: string; email: string;
  role: 'admin' | 'member'; avatar?: string; isActive: boolean;
}

export interface Project {
  id: string; name: string; description?: string;
  status: 'active' | 'completed' | 'archived';
  color: string; startDate?: string; endDate?: string;
  ownerId: string; owner?: User; members?: User[];
  createdAt: string; updatedAt: string;
}

export interface Sprint {
  id: string; projectId: string; name: string; goal?: string;
  startDate: string; endDate: string;
  status: 'planning' | 'active' | 'completed';
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string; projectId: string; sprintId?: string; parentTaskId?: string;
  title: string; description?: string;
  status: TaskStatus; priority: TaskPriority;
  assigneeId?: string; reporterId: string;
  assignee?: User; reporter?: User;
  dueDate?: string; startDate?: string;
  storyPoints?: number; position: number;
  labels: string[]; subtasks?: Task[];
  comments?: Comment[]; attachments?: Attachment[];
  createdAt: string; updatedAt: string;
}

export interface Comment {
  id: string; taskId: string; userId: string;
  author?: User; content: string;
  createdAt: string; updatedAt: string;
}

export interface Attachment {
  id: string; taskId: string; uploadedBy: string;
  uploader?: User; filename: string; originalName: string;
  mimeType: string; size: number; path: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string; projectId?: string; taskId?: string;
  userId: string; actor?: User; action: string;
  metadata: Record<string, unknown>; createdAt: string;
}

export interface ProjectStats {
  total: number; done: number; inProgress: number;
  overdue: number; progress: number;
}

export interface ApiResponse<T> {
  success: boolean; message?: string; data?: T;
}

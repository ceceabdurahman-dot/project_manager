import { create } from 'zustand';
import type { Task, TaskStatus } from '../types';
import { tasksApi } from '../api/tasks.api';

interface TaskState {
  tasks:     Task[];
  isLoading: boolean;
  error:     string | null;
  fetchAll:  (projectId: string) => Promise<void>;
  create:    (projectId: string, data: Partial<Task>) => Promise<Task>;
  update:    (id: string, data: Partial<Task>) => Promise<void>;
  move:      (id: string, status: TaskStatus, position: number) => Promise<void>;
  remove:    (id: string) => Promise<void>;
  setTasks:  (tasks: Task[]) => void;
  upsert:    (task: Task) => void;
  removeById:(id: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [], isLoading: false, error: null,

  fetchAll: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await tasksApi.getAll(projectId);
      set({ tasks: data.tasks });
    } catch (err: any) {
      set({ tasks: [], error: err?.response?.data?.message ?? 'Gagal memuat task' });
      throw err;
    } finally {
      // Selalu reset isLoading, baik sukses maupun error
      set({ isLoading: false });
    }
  },

  create: async (projectId, d) => {
    const { data } = await tasksApi.create(projectId, d);
    set(s => ({ tasks: [...s.tasks, data.task] }));
    return data.task;
  },

  update: async (id, d) => {
    const { data } = await tasksApi.update(id, d);
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? data.task : t) }));
  },

  move: async (id, status, position) => {
    const { data } = await tasksApi.move(id, status, position);
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? data.task : t) }));
  },

  remove: async (id) => {
    await tasksApi.remove(id);
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }));
  },

  setTasks:   (tasks) => set({ tasks }),
  upsert:     (task)  => set(s => ({
    tasks: s.tasks.some(t => t.id === task.id)
      ? s.tasks.map(t => t.id === task.id ? task : t)
      : [...s.tasks, task],
  })),
  removeById: (id) => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
}));

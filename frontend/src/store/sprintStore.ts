import { create } from 'zustand';
import { sprintsApi, SprintWithStats } from '../api/sprints.api';

interface SprintState {
  sprints:   SprintWithStats[];
  isLoading: boolean;
  error:     string | null;
  fetchAll:  (projectId: string) => Promise<void>;
  create:    (projectId: string, data: { name: string; goal?: string; startDate: string; endDate: string }) => Promise<void>;
  update:    (id: string, data: { name: string; goal?: string; startDate: string; endDate: string }) => Promise<void>;
  remove:    (id: string) => Promise<void>;
  start:     (id: string) => Promise<string>;
  complete:  (id: string) => Promise<string>;
}

export const useSprintStore = create<SprintState>((set, get) => ({
  sprints: [], isLoading: false, error: null,

  fetchAll: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await sprintsApi.getAll(projectId);
      set({ sprints: data.sprints });
    } catch (err: any) {
      set({ error: err?.response?.data?.message ?? 'Gagal memuat sprint' });
    } finally {
      set({ isLoading: false });
    }
  },

  create: async (projectId, d) => {
    await sprintsApi.create(projectId, d);
    // Refetch untuk dapat stats terbaru
    await get().fetchAll(projectId);
  },

  update: async (id, d) => {
    const { data } = await sprintsApi.update(id, d);
    set(s => ({
      sprints: s.sprints.map(sp => sp.id === id ? { ...sp, ...data.sprint } : sp),
    }));
  },

  remove: async (id) => {
    await sprintsApi.remove(id);
    set(s => ({ sprints: s.sprints.filter(sp => sp.id !== id) }));
  },

  start: async (id) => {
    const { data } = await sprintsApi.start(id);
    set(s => ({
      sprints: s.sprints.map(sp => sp.id === id ? { ...sp, status: 'active' } : sp),
    }));
    return data.message;
  },

  complete: async (id) => {
    const { data } = await sprintsApi.complete(id);
    set(s => ({
      sprints: s.sprints.map(sp => sp.id === id ? { ...sp, status: 'completed' } : sp),
    }));
    return data.message;
  },
}));

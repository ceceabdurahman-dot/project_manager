import { create } from 'zustand';
import type { Project, ProjectStats } from '../types';
import { projectsApi } from '../api/projects.api';

interface ProjectState {
  projects:     Project[];
  current:      Project | null;
  stats:        ProjectStats | null;
  isLoading:    boolean;
  error:        string | null;
  fetchAll:     () => Promise<void>;
  fetchOne:     (id: string) => Promise<void>;
  fetchStats:   (id: string) => Promise<void>;
  create:       (data: Partial<Project>) => Promise<Project>;
  update:       (id: string, data: Partial<Project>) => Promise<void>;
  remove:       (id: string) => Promise<void>;
  setCurrent:   (p: Project | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [], current: null, stats: null, isLoading: false, error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await projectsApi.getAll();
      set({ projects: data.projects });
    } catch (err: any) {
      // Tetap reset list agar UI tidak freeze, simpan pesan error
      set({ projects: [], error: err?.response?.data?.message ?? 'Gagal memuat proyek' });
      throw err;
    } finally {
      // Selalu reset isLoading, baik sukses maupun error
      set({ isLoading: false });
    }
  },

  fetchOne: async (id) => {
    try {
      const { data } = await projectsApi.getOne(id);
      set({ current: data.project });
    } catch (err: any) {
      set({ error: err?.response?.data?.message ?? 'Gagal memuat detail proyek' });
      throw err;
    }
  },

  fetchStats: async (id) => {
    try {
      const { data } = await projectsApi.getStats(id);
      set({ stats: data.stats });
    } catch (err: any) {
      set({ error: err?.response?.data?.message ?? 'Gagal memuat statistik' });
      throw err;
    }
  },

  create: async (d) => {
    const { data } = await projectsApi.create(d);
    set(s => ({ projects: [data.project, ...s.projects] }));
    return data.project;
  },

  update: async (id, d) => {
    const { data } = await projectsApi.update(id, d);
    set(s => ({
      projects: s.projects.map(p => p.id === id ? data.project : p),
      current: s.current?.id === id ? data.project : s.current,
    }));
  },

  remove: async (id) => {
    await projectsApi.remove(id);
    set(s => ({ projects: s.projects.filter(p => p.id !== id) }));
  },

  setCurrent: (p) => set({ current: p }),
}));

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { reportsApi } from '../api/tasks.api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ActivityLog } from '../types';
import type { AxiosError } from 'axios';

interface DashboardData {
  totalActive: number;
  completedThisWeek: number;
  overdueCount: number;
  assignedToMe: number;
  recentActivity: ActivityLog[];
}

const StatCard: React.FC<{
  label: string; value: number | string;
  color: string; icon: React.ReactNode; loading?: boolean;
}> = ({ label, value, color, icon, loading }) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>{icon}</div>
    <div>
      {loading
        ? <div className="h-7 w-10 bg-gray-200 animate-pulse rounded mb-1" />
        : <p className="text-2xl font-bold text-gray-900">{value}</p>
      }
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

const ACTION_LABEL: Record<string, string> = {
  project_created: 'membuat proyek',
  project_updated: 'mengubah proyek',
  project_deleted: 'menghapus proyek',
  member_added:    'menambahkan anggota',
  member_removed:  'mengeluarkan anggota',
  task_created:    'membuat task',
  task_updated:    'mengupdate task',
  task_moved:      'memindahkan task',
  task_deleted:    'menghapus task',
};

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { projects, fetchAll } = useProjectStore();
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
    setIsLoading(true);
    setError(null);
    reportsApi.getDashboard()
      .then(r => setDash(r.data.dashboard))
      .catch((err: AxiosError<{ message?: string }>) => {
        setError(err.response?.data?.message ?? 'Gagal memuat dashboard');
      })
      .finally(() => setIsLoading(false));
  }, [fetchAll]);

  const statusData = [
    { name: 'Aktif',   value: dash?.totalActive      ?? 0, color: '#2E6DA4' },
    { name: 'Selesai', value: dash?.completedThisWeek ?? 0, color: '#2E7D57' },
    { name: 'Overdue', value: dash?.overdueCount      ?? 0, color: '#e07b39' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Selamat datang, {user?.name}</h1>
        <p className="text-gray-500 text-sm mt-1">Ringkasan aktivitas dan proyek Anda</p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={isLoading} label="Task Aktif" value={dash?.totalActive ?? 0} color="bg-blue-100"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} />
        <StatCard loading={isLoading} label="Selesai Minggu Ini" value={dash?.completedThisWeek ?? 0} color="bg-green-100"
          icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>} />
        <StatCard loading={isLoading} label="Overdue" value={dash?.overdueCount ?? 0} color="bg-orange-100"
          icon={<svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label="Proyek Aktif" value={projects.filter(p => p.status === 'active').length} color="bg-purple-100"
          icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Proyek Anda</h2>
            <Link to="/projects" className="text-sm text-primary hover:underline">Lihat semua</Link>
          </div>
          <div className="space-y-3">
            {projects.slice(0, 5).map(p => (
              <Link key={p.id} to={`/projects/${p.id}/kanban`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-primary truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.status}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
            {projects.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Belum ada proyek. <Link to="/projects" className="text-primary">Buat proyek baru</Link>
              </p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Status Task</h2>
          {isLoading ? (
            <div className="h-44 flex items-center justify-center text-sm text-gray-400">Memuat...</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="ml-auto font-medium text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {dash?.recentActivity && dash.recentActivity.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Aktivitas Tim Terbaru</h2>
          <div className="space-y-3">
            {dash.recentActivity.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0 mt-0.5">
                  {a.actor?.name?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800">{a.actor?.name ?? 'Seseorang'}</span>
                  {' '}
                  <span className="text-gray-500">{ACTION_LABEL[a.action] ?? a.action}</span>
                  {(a.metadata as Record<string, string>)?.title && (
                    <span className="text-gray-700"> &ldquo;{(a.metadata as Record<string, string>).title}&rdquo;</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                  {new Date(a.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

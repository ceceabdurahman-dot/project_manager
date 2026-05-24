import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reportsApi } from '../api/tasks.api';
import { useSprintStore } from '../store/sprintStore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { Avatar } from '../components/common/Avatar';

interface WorkloadEntry {
  user: { id: string; name: string; avatar?: string };
  tasks: number;
  byPriority: Record<string, number>;
}

interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

export const Reports: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { sprints, fetchAll: fetchSprints } = useSprintStore();
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [burndownData, setBurndownData] = useState<BurndownPoint[]>([]);
  const [burndownLoading, setBurndownLoading] = useState(false);
  const [burndownError, setBurndownError] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    reportsApi.getWorkload(projectId)
      .then(r => setWorkload(r.data.workload))
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Gagal memuat data workload';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
    fetchSprints(projectId);
  }, [projectId, fetchSprints]);

  useEffect(() => {
    if (sprints.length > 0 && !selectedSprintId) {
      const active = sprints.find(s => s.status === 'active');
      setSelectedSprintId(active ? active.id : sprints[0].id);
    }
  }, [sprints, selectedSprintId]);

  useEffect(() => {
    if (!selectedSprintId) return;
    setBurndownLoading(true);
    setBurndownError(null);
    reportsApi.getBurndown(selectedSprintId)
      .then(r => {
        setBurndownData(r.data.burndown.data);
        setTotalPoints(r.data.burndown.totalPoints);
      })
      .catch(err => {
        setBurndownError(err?.response?.data?.message ?? 'Gagal memuat burndown');
      })
      .finally(() => setBurndownLoading(false));
  }, [selectedSprintId]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-900">Laporan &amp; Analytics</h1>
        <p className="text-xs text-gray-400 mt-0.5">Burndown chart &amp; distribusi beban kerja</p>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-4xl">

        {/* Burndown Chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Sprint Burndown</h2>
            {sprints.length > 0 && (
              <select
                value={selectedSprintId}
                onChange={e => setSelectedSprintId(e.target.value)}
                className="input text-sm py-1.5 px-3 w-44"
              >
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.status === 'active' ? 'aktif: ' : ''}{s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {sprints.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada sprint. Buat sprint di Pengaturan Proyek.</p>
          ) : burndownLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
              Memuat burndown...
            </div>
          ) : burndownError ? (
            <p className="text-sm text-red-600 text-center py-8">{burndownError}</p>
          ) : burndownData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada data untuk sprint ini.</p>
          ) : (
            <div>
              <p className="text-xs text-gray-400 mb-3">Total {totalPoints} story points</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={burndownData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 5" dot={false} name="Ideal" />
                  <Line type="monotone" dataKey="actual" stroke="#2E6DA4" strokeWidth={2} dot={{ r: 3 }} name="Actual" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Workload Distribution */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Distribusi Beban Kerja</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">Memuat...</div>
          ) : error ? (
            <p className="text-sm text-red-600 text-center py-8">{error}</p>
          ) : workload.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada data workload.</p>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workload.map(w => ({ name: w.user.name, tasks: w.tasks }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="tasks" name="Jumlah Task" radius={[4, 4, 0, 0]}>
                    {workload.map((_, i) => (
                      <Cell key={i} fill={['#2E6DA4','#2E7D57','#e07b39','#7c3aed','#db2777'][i % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {workload.map(w => (
                  <div key={w.user.id} className="flex items-center gap-3 text-sm">
                    <Avatar name={w.user.name} src={w.user.avatar} size="sm" />
                    <span className="flex-1 text-gray-700">{w.user.name}</span>
                    <span className="font-medium text-gray-900">{w.tasks} task</span>
                    {w.byPriority?.urgent > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                        {w.byPriority.urgent} urgent
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

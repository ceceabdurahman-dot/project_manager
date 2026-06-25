import React, { useEffect, useState } from 'react';
import { useSprintStore } from '../../store/sprintStore';
import { SprintWithStats } from '../../api/sprints.api';
import { Button } from './Button';
import { Modal } from './Modal';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Props {
  projectId: string;
  canManage?: boolean;
}

const statusLabels: Record<string, { text: string; color: string }> = {
  planning:  { text: 'Planning',  color: 'bg-gray-100 text-gray-700' },
  active:    { text: 'Aktif',     color: 'bg-green-100 text-green-700' },
  completed: { text: 'Selesai',   color: 'bg-blue-100 text-blue-700' },
};

export const SprintPanel: React.FC<Props> = ({ projectId, canManage = true }) => {
  const { sprints, isLoading, fetchAll, create, update, remove, start, complete } = useSprintStore();
  const [showForm, setShowForm] = useState(false);
  const [editingSprint, setEditingSprint] = useState<SprintWithStats | null>(null);
  const [formData, setFormData] = useState({ name: '', goal: '', startDate: '', endDate: '' });
  const [formError, setFormError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchAll(projectId); }, [projectId, fetchAll]);

  const openCreate = () => {
    setEditingSprint(null);
    const today = new Date().toISOString().split('T')[0];
    const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    setFormData({ name: '', goal: '', startDate: today, endDate: twoWeeks });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (sprint: SprintWithStats) => {
    setEditingSprint(sprint);
    setFormData({ name: sprint.name, goal: sprint.goal || '', startDate: sprint.startDate, endDate: sprint.endDate });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) {
      setFormError('Nama, tanggal mulai, dan tanggal selesai wajib diisi');
      return;
    }
    if (formData.endDate < formData.startDate) {
      setFormError('Tanggal selesai harus setelah tanggal mulai');
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      if (editingSprint) {
        await update(editingSprint.id, formData);
        await fetchAll(projectId);
      } else {
        await create(projectId, formData);
      }
      setShowForm(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Gagal menyimpan sprint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStart = async (sprint: SprintWithStats) => {
    try {
      const msg = await start(sprint.id);
      setActionMsg(msg);
      await fetchAll(projectId);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err: any) {
      setActionMsg(err?.response?.data?.message || 'Gagal memulai sprint');
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const handleComplete = async (sprint: SprintWithStats) => {
    try {
      const msg = await complete(sprint.id);
      setActionMsg(msg);
      await fetchAll(projectId);
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      setActionMsg(err?.response?.data?.message || 'Gagal menyelesaikan sprint');
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const handleDelete = async (sprint: SprintWithStats) => {
    if (!confirm(`Hapus sprint "${sprint.name}"? Semua task akan dipindahkan ke backlog.`)) return;
    try {
      await remove(sprint.id);
      setActionMsg('Sprint dihapus');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err: any) {
      setActionMsg(err?.response?.data?.message || 'Gagal menghapus sprint');
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const getDaysInfo = (sprint: SprintWithStats) => {
    const start = parseISO(sprint.startDate);
    const end = parseISO(sprint.endDate);
    const total = differenceInDays(end, start) + 1;
    if (sprint.status === 'active') {
      const remaining = differenceInDays(end, new Date()) + 1;
      const overdue = remaining < 0;
      return { total, remaining: Math.max(0, remaining), overdue };
    }
    return { total, remaining: total, overdue: false };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="font-semibold text-gray-900">Sprint</h2>
          <span className="text-xs text-gray-400">({sprints.length})</span>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Sprint Baru
          </Button>
        )}
      </div>

      {!canManage && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          Hanya owner atau admin proyek yang bisa membuat, mengubah, memulai, menyelesaikan, atau menghapus sprint.
        </p>
      )}

      {/* Action message */}
      {actionMsg && (
        <div className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg">
          {actionMsg}
        </div>
      )}

      {/* Sprint list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Memuat sprint...
        </div>
      ) : sprints.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">Belum ada sprint</p>
          <p className="text-xs text-gray-300 mt-1">Buat sprint untuk mengorganisir task dalam iterasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sprints.map(sprint => {
            const days = getDaysInfo(sprint);
            const sl = statusLabels[sprint.status];
            return (
              <div key={sprint.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">{sprint.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sl.color}`}>{sl.text}</span>
                      {sprint.status === 'active' && days.overdue && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Overdue</span>
                      )}
                    </div>
                    {sprint.goal && <p className="text-xs text-gray-500 mb-2 line-clamp-1">{sprint.goal}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>
                        {format(parseISO(sprint.startDate), 'd MMM', { locale: localeId })} — {format(parseISO(sprint.endDate), 'd MMM yyyy', { locale: localeId })}
                      </span>
                      <span>{days.total} hari</span>
                      {sprint.status === 'active' && (
                        <span className={days.overdue ? 'text-red-500 font-medium' : ''}>
                          {days.overdue ? 'Overdue' : `${days.remaining} hari tersisa`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {canManage && <div className="flex items-center gap-1 shrink-0">
                    {sprint.status === 'planning' && (
                      <button onClick={() => handleStart(sprint)} className="text-xs text-green-600 hover:text-green-700 px-2 py-1 hover:bg-green-50 rounded transition-colors" title="Mulai Sprint">
                        ▶ Mulai
                      </button>
                    )}
                    {sprint.status === 'active' && (
                      <button onClick={() => handleComplete(sprint)} className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded transition-colors" title="Selesaikan Sprint">
                        ✓ Selesai
                      </button>
                    )}
                    {sprint.status !== 'completed' && (
                      <button onClick={() => openEdit(sprint)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 hover:bg-gray-50 rounded transition-colors">
                        Edit
                      </button>
                    )}
                    <button onClick={() => handleDelete(sprint)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 hover:bg-red-50 rounded transition-colors">
                      Hapus
                    </button>
                  </div>}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{sprint.doneCount}/{sprint.taskCount} task selesai</span>
                    <span>{sprint.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sprint.progress === 100 ? 'bg-green-500' : sprint.progress > 50 ? 'bg-primary' : 'bg-yellow-400'
                      }`}
                      style={{ width: `${sprint.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingSprint ? 'Edit Sprint' : 'Sprint Baru'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Nama Sprint *</label>
            <input
              className="input" autoFocus
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Sprint 1"
            />
          </div>
          <div>
            <label className="label">Goal (opsional)</label>
            <textarea
              className="input resize-none" rows={2}
              value={formData.goal}
              onChange={e => setFormData({ ...formData, goal: e.target.value })}
              placeholder="Apa yang ingin dicapai di sprint ini?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tanggal Mulai *</label>
              <input
                type="date" className="input"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Tanggal Selesai *</label>
              <input
                type="date" className="input"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>
          {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : (editingSprint ? 'Simpan' : 'Buat Sprint')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

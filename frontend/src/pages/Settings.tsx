import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { Button } from '../components/common/Button';
import { SprintPanel } from '../components/common/SprintPanel';
import { MemberPanel } from '../components/common/MemberPanel';

type ProjectStatus = 'active' | 'completed' | 'archived';

export const Settings: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { current, fetchOne, update } = useProjectStore();
  const [form, setForm] = useState<{ name: string; description: string; status: ProjectStatus }>({
    name: '', description: '', status: 'active',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    fetchOne(projectId).then(() => {
      if (current) setForm({ name: current.name, description: current.description ?? '', status: current.status });
    });
  }, [projectId]);

  useEffect(() => {
    if (current) setForm({ name: current.name, description: current.description ?? '', status: current.status });
  }, [current]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    await update(projectId, form);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-lg font-bold text-gray-900">Pengaturan Proyek</h1>
      <form onSubmit={handleSave} className="card p-6 space-y-4">
        <div>
          <label className="label">Nama Proyek</label>
          <input className="input" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Deskripsi</label>
          <textarea className="input resize-none" rows={3} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit">Simpan Perubahan</Button>
          {saved && <span className="text-sm text-green-600">Tersimpan</span>}
        </div>
      </form>
      {/* Member Management */}
      {projectId && (
        <div className="card p-6">
          <MemberPanel projectId={projectId} />
        </div>
      )}

      {/* Sprint Management */}
      {projectId && (
        <div className="card p-6">
          <SprintPanel projectId={projectId} />
        </div>
      )}
    </div>
  );
};

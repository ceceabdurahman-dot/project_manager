import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { Button } from '../components/common/Button';
import { SprintPanel } from '../components/common/SprintPanel';
import { MemberPanel } from '../components/common/MemberPanel';
import { authApi } from '../api/auth.api';
import { projectsApi } from '../api/projects.api';
import { useAuthStore } from '../store/authStore';

type ProjectStatus = 'active' | 'completed' | 'archived';

export const Settings: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { current, fetchOne, update } = useProjectStore();
  const currentUser = useAuthStore(s => s.user);
  const [form, setForm] = useState<{ name: string; description: string; status: ProjectStatus }>({
    name: '', description: '', status: 'active',
  });
  const [saved, setSaved] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [myProjectRole, setMyProjectRole] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    fetchOne(projectId);
    projectsApi.getMembers(projectId)
      .then(({ data }) => {
        const member = data.members.find(m => m.User.id === currentUser?.id);
        setMyProjectRole(member?.role ?? null);
      })
      .catch(() => setMyProjectRole(null));
  }, [projectId, fetchOne, currentUser?.id]);

  useEffect(() => {
    if (current) setForm({ name: current.name, description: current.description ?? '', status: current.status });
  }, [current]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    if (!canManageProject) {
      setProjectError('Hanya owner atau admin proyek yang bisa mengubah pengaturan proyek.');
      return;
    }
    setProjectError(null);
    setProjectLoading(true);
    try {
      await update(projectId, form);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setProjectError(err?.response?.data?.message ?? 'Gagal menyimpan pengaturan proyek');
    } finally {
      setProjectLoading(false);
    }
  };

  const canManageProject = myProjectRole === 'owner' || myProjectRole === 'admin';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Konfirmasi password baru tidak cocok');
      return;
    }

    setPasswordLoading(true);
    try {
      await authApi.updateProfile({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message ?? 'Gagal mengganti password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-lg font-bold text-gray-900">Pengaturan Proyek</h1>
      <form onSubmit={handleSave} className="card p-6 space-y-4">
        {!canManageProject && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            Anda bisa melihat pengaturan proyek, tetapi hanya owner atau admin proyek yang bisa mengubahnya.
          </p>
        )}
        <div>
          <label className="label">Nama Proyek</label>
          <input className="input" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            disabled={!canManageProject || projectLoading}
            required />
        </div>
        <div>
          <label className="label">Deskripsi</label>
          <textarea className="input resize-none" rows={3} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            disabled={!canManageProject || projectLoading} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}
            disabled={!canManageProject || projectLoading}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        {projectError && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{projectError}</p>
        )}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={projectLoading} disabled={!canManageProject}>Simpan Perubahan</Button>
          {saved && <span className="text-sm text-green-600">Tersimpan</span>}
        </div>
      </form>

      <form onSubmit={handleChangePassword} className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Ganti Password</h2>
          <p className="text-xs text-gray-400 mt-0.5">Masukkan password lama untuk menjaga akun tetap aman.</p>
        </div>
        <div>
          <label className="label">Password Lama</label>
          <input
            className="input"
            type="password"
            value={passwordForm.currentPassword}
            onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Password Baru</label>
          <input
            className="input"
            type="password"
            value={passwordForm.newPassword}
            onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
            minLength={8}
            maxLength={128}
            required
          />
        </div>
        <div>
          <label className="label">Konfirmasi Password Baru</label>
          <input
            className="input"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
            minLength={8}
            maxLength={128}
            required
          />
        </div>
        {passwordError && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{passwordError}</p>
        )}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={passwordLoading}>Ganti Password</Button>
          {passwordSaved && <span className="text-sm text-green-600">Password berhasil diganti</span>}
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
          <SprintPanel projectId={projectId} canManage={canManageProject} />
        </div>
      )}
    </div>
  );
};

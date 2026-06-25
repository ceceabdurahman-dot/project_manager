import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

type UserRole = 'admin' | 'member';

const initialCreateForm = {
  name: '',
  email: '',
  password: '',
  role: 'member' as UserRole,
};

const roleLabels: Record<UserRole, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-700' },
  member: { label: 'Member', className: 'bg-blue-100 text-blue-700' },
};

export const AdminUsers: React.FC = () => {
  const currentUser = useAuthStore(s => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await authApi.getUsers();
      setUsers(data.users);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat daftar user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') fetchUsers();
  }, [currentUser?.role]);

  const filteredUsers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter(user =>
      user.name.toLowerCase().includes(value) ||
      user.email.toLowerCase().includes(value) ||
      user.role.toLowerCase().includes(value)
    );
  }, [query, users]);

  if (currentUser && currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const openCreateModal = () => {
    setCreateForm(initialCreateForm);
    setCreateError('');
    setShowCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (createForm.password.length < 8) {
      setCreateError('Password minimal 8 karakter');
      return;
    }

    setCreateLoading(true);
    try {
      await authApi.createUser(createForm);
      setShowCreate(false);
      showMessage('User berhasil dibuat');
      fetchUsers();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Gagal membuat user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    setResetError('');
    if (resetPassword.length < 8) {
      setResetError('Password baru minimal 8 karakter');
      return;
    }

    setResetLoading(true);
    try {
      await authApi.resetPassword(resetUser.id, resetPassword);
      setResetUser(null);
      setResetPassword('');
      showMessage(`Password ${resetUser.name} berhasil direset`);
    } catch (err: any) {
      setResetError(err?.response?.data?.message || 'Gagal mereset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser?.id) return;
    const nextLabel = user.isActive ? 'nonaktifkan' : 'aktifkan';
    if (!confirm(`${nextLabel[0].toUpperCase()}${nextLabel.slice(1)} akun ${user.name}?`)) return;

    setUpdatingUserId(user.id);
    try {
      await authApi.toggleActive(user.id);
      showMessage(`User berhasil di${user.isActive ? 'nonaktifkan' : 'aktifkan'}`);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal mengubah status user');
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Manajemen User</h1>
          <p className="text-sm text-gray-500 mt-1">Buat user baru, reset password, dan kelola status akun.</p>
        </div>
        <Button onClick={openCreateModal}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah User
        </Button>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:max-w-xs w-full">
            <input
              className="input pl-9"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari nama, email, role..."
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 110-14 7 7 0 010 14z" />
            </svg>
          </div>
          <div className="text-sm text-gray-500">
            {filteredUsers.length} dari {users.length} user
          </div>
        </div>

        {message && <div className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">{message}</div>}
        {error && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-12">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Memuat user...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="py-3 pr-4 font-semibold">User</th>
                  <th className="py-3 pr-4 font-semibold">Role</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(user => {
                  const role = roleLabels[user.role];
                  const isMe = user.id === currentUser?.id;
                  return (
                    <tr key={user.id} className="align-middle">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3 min-w-60">
                          <Avatar name={user.name} size="sm" src={user.avatar} />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {user.name}
                              {isMe && <span className="text-xs text-gray-400 ml-1">(Anda)</span>}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`badge ${role.className}`}>{role.label}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`badge ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {user.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => { setResetUser(user); setResetPassword(''); setResetError(''); }}
                          >
                            Reset Password
                          </Button>
                          <Button
                            type="button"
                            variant={user.isActive ? 'danger' : 'secondary'}
                            size="sm"
                            loading={updatingUserId === user.id}
                            disabled={isMe}
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td className="py-10 text-center text-gray-400" colSpan={4}>
                      Tidak ada user yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tambah User" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Nama</label>
            <input
              className="input"
              value={createForm.name}
              onChange={e => setCreateForm(form => ({ ...form, name: e.target.value }))}
              maxLength={100}
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={createForm.email}
              onChange={e => setCreateForm(form => ({ ...form, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Password Awal</label>
            <input
              className="input"
              type="password"
              value={createForm.password}
              onChange={e => setCreateForm(form => ({ ...form, password: e.target.value }))}
              minLength={8}
              maxLength={128}
              required
            />
          </div>
          <div>
            <label className="label">Role Aplikasi</label>
            <select
              className="input"
              value={createForm.role}
              onChange={e => setCreateForm(form => ({ ...form, role: e.target.value as UserRole }))}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {createError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button type="submit" loading={createLoading}>Buat User</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetUser} onClose={() => setResetUser(null)} title="Reset Password" size="sm">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="text-sm text-gray-600">
            User: <span className="font-medium text-gray-900">{resetUser?.name}</span>
          </div>
          <div>
            <label className="label">Password Baru</label>
            <input
              className="input"
              type="password"
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              minLength={8}
              maxLength={128}
              required
            />
          </div>
          {resetError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{resetError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setResetUser(null)}>Batal</Button>
            <Button type="submit" loading={resetLoading}>Reset</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

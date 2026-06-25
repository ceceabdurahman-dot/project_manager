import React, { useEffect, useState } from 'react';
import { projectsApi } from '../../api/projects.api';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Modal } from './Modal';
import type { User } from '../../types';

interface MemberEntry {
  id: string;
  role: string;
  User: { id: string; name: string; email: string; avatar?: string };
}

interface Props {
  projectId: string;
}

const roleLabels: Record<string, { text: string; color: string }> = {
  owner:  { text: 'Owner',  color: 'bg-yellow-100 text-yellow-800' },
  admin:  { text: 'Admin',  color: 'bg-purple-100 text-purple-700' },
  member: { text: 'Member', color: 'bg-blue-100 text-blue-700' },
  viewer: { text: 'Viewer', color: 'bg-gray-100 text-gray-600' },
};

export const MemberPanel: React.FC<Props> = ({ projectId }) => {
  const currentUser = useAuthStore(s => s.user);
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('member');
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Cek role user saat ini di project ini
  const myRole = members.find(m => m.User.id === currentUser?.id)?.role;
  const canManage = myRole === 'owner' || myRole === 'admin';

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const { data } = await projectsApi.getMembers(projectId);
      setMembers(data.members);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, [projectId]);

  const openAddModal = async () => {
    setError('');
    setAddUserId('');
    setAddRole('member');
    try {
      const { data } = await projectsApi.getAvailableUsers(projectId);
      setAllUsers(data.users);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat daftar user');
      setAllUsers([]);
    }
    setShowAdd(true);
  };

  const handleAdd = async () => {
    if (!addUserId) { setError('Pilih user terlebih dahulu'); return; }
    setError('');
    try {
      await projectsApi.addMember(projectId, addUserId, addRole);
      setShowAdd(false);
      setActionMsg('Anggota berhasil ditambahkan');
      setTimeout(() => setActionMsg(''), 3000);
      fetchMembers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal menambahkan anggota');
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await projectsApi.updateMemberRole(projectId, userId, newRole);
      setActionMsg('Role berhasil diubah');
      setTimeout(() => setActionMsg(''), 3000);
      fetchMembers();
    } catch (err: any) {
      setActionMsg(err?.response?.data?.message || 'Gagal mengubah role');
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const handleRemove = async (member: MemberEntry) => {
    if (!confirm(`Keluarkan ${member.User.name} dari proyek?`)) return;
    try {
      await projectsApi.removeMember(projectId, member.User.id);
      setActionMsg(`${member.User.name} dikeluarkan`);
      setTimeout(() => setActionMsg(''), 3000);
      fetchMembers();
    } catch (err: any) {
      setActionMsg(err?.response?.data?.message || 'Gagal mengeluarkan anggota');
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  // User yang belum jadi anggota
  const availableUsers = allUsers.filter(u => !members.some(m => m.User.id === u.id));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="font-semibold text-gray-900">Anggota</h2>
          <span className="text-xs text-gray-400">({members.length})</span>
        </div>
        {canManage && (
          <Button size="sm" onClick={openAddModal}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah
          </Button>
        )}
      </div>

      {/* Action message */}
      {actionMsg && (
        <div className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg">
          {actionMsg}
        </div>
      )}

      {/* Member list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Memuat anggota...
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(member => {
            const rl = roleLabels[member.role] || roleLabels.member;
            const isMe = member.User.id === currentUser?.id;
            const isMemberOwner = member.role === 'owner';
            // Bisa ubah role: canManage, bukan diri sendiri, bukan owner, dan untuk admin hanya owner yang bisa ubah
            const canChangeRole = canManage && !isMe && !isMemberOwner && (member.role !== 'admin' || myRole === 'owner');
            const canRemove = canManage && !isMe && !isMemberOwner && (member.role !== 'admin' || myRole === 'owner');

            return (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                <Avatar name={member.User.name} size="sm" src={member.User.avatar} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {member.User.name}
                      {isMe && <span className="text-xs text-gray-400 ml-1">(Anda)</span>}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rl.color}`}>{rl.text}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{member.User.email}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canChangeRole && (
                    <select
                      value={member.role}
                      onChange={e => handleChangeRole(member.User.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white cursor-pointer hover:border-gray-300 transition-colors"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}
                  {canRemove && (
                    <button
                      onClick={() => handleRemove(member)}
                      className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                      title="Keluarkan"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add member modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Anggota" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Pilih User</label>
            {availableUsers.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">Semua user sudah menjadi anggota</p>
            ) : (
              <select
                className="input"
                value={addUserId}
                onChange={e => setAddUserId(e.target.value)}
              >
                <option value="">— Pilih user —</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={addRole} onChange={e => setAddRole(e.target.value)}>
              {myRole === 'owner' && <option value="admin">Admin</option>}
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Batal</Button>
            <Button onClick={handleAdd} disabled={!addUserId}>Tambahkan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

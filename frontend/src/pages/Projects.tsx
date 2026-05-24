import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const Projects: React.FC = () => {
  const { projects, fetchAll, create, isLoading } = useProjectStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#2E6DA4' });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);
    try {
      await create(form);
      // Hanya tutup modal dan reset form jika berhasil
      setOpen(false);
      setForm({ name: '', description: '', color: '#2E6DA4' });
    } catch (err: any) {
      // Tampilkan error, modal tetap terbuka agar user tidak kehilangan input
      setCreateError(err?.response?.data?.message ?? 'Gagal membuat proyek. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setOpen(false);
    setCreateError(null);
    setForm({ name: '', description: '', color: '#2E6DA4' });
  };

  // Bug fix: hapus duplikat #e07b39, ganti dengan #c0392b (merah)
  const COLORS = ['#2E6DA4', '#2E7D57', '#e07b39', '#9c6fa5', '#c0392b', '#1a1a2e'];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Semua Proyek</h1>
          <p className="text-sm text-gray-500 mt-1">{projects.length} proyek ditemukan</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Proyek Baru
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Memuat...</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}/kanban`}
              className="card p-5 hover:shadow-md hover:border-gray-300 transition-all group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ background: p.color }}>
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 group-hover:text-primary truncate">{p.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === 'active'     ? 'bg-green-100 text-green-700' :
                    p.status === 'completed'  ? 'bg-blue-100 text-blue-700'  :
                                                'bg-gray-100 text-gray-500'
                  }`}>{p.status}</span>
                </div>
              </div>
              {p.description && <p className="text-sm text-gray-500 line-clamp-2">{p.description}</p>}
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {p.members?.length ?? 0} anggota
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} onClose={handleCloseModal} title="Buat Proyek Baru">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Nama Proyek *</label>
            <input className="input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nama proyek" required />
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea className="input resize-none" rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Deskripsi singkat..." />
          </div>
          <div>
            <label className="label">Warna</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* Tampilkan error tanpa menutup modal */}
          {createError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={handleCloseModal}>Batal</Button>
            <Button type="submit" disabled={!form.name.trim() || isSubmitting}>
              {isSubmitting ? 'Membuat...' : 'Buat Proyek'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

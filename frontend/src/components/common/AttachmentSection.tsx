import React, { useRef, useState } from 'react';
import { tasksApi } from '../../api/tasks.api';
import type { Attachment } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface Props {
  taskId: string;
  attachments: Attachment[];
  onAttachmentAdded:   (attachment: Attachment) => void;
  onAttachmentDeleted: (attachmentId: string) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const fileBadge = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'IMG';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word')) return 'DOC';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'XLS';
  if (mimeType === 'application/zip') return 'ZIP';
  if (mimeType === 'text/plain') return 'TXT';
  return 'FILE';
};

export const AttachmentSection: React.FC<Props> = ({
  taskId, attachments, onAttachmentAdded, onAttachmentDeleted,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore(s => s.user);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setIsUploading(true);
    try {
      const { data } = await tasksApi.upload(taskId, file);
      onAttachmentAdded(data.attachment);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal mengunggah file');
    } finally {
      setIsUploading(false);
      // Reset input agar file yang sama bisa diunggah ulang
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setError('');
    try {
      await tasksApi.deleteAttachment(taskId, attachmentId);
      onAttachmentDeleted(attachmentId);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal menghapus lampiran');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-700">
            Lampiran {attachments.length > 0 && <span className="text-gray-400 font-normal">({attachments.length})</span>}
          </h3>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs text-primary hover:text-primary-dark font-medium transition-colors disabled:opacity-50"
        >
          {isUploading ? 'Mengunggah...' : '+ Tambah file'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          onChange={handleFileChange}
        />
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {attachments.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-1">Belum ada lampiran</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map(att => (
            <li key={att.id} className="flex items-center gap-3 group rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50 transition-colors">
              <span className="w-10 shrink-0 rounded bg-gray-100 px-1.5 py-1 text-center text-[10px] font-semibold text-gray-500">
                {fileBadge(att.mimeType)}
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={`/uploads/${att.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={att.originalName}
                  className="text-sm text-primary hover:underline truncate block"
                  title={att.originalName}
                >
                  {att.originalName}
                </a>
                <p className="text-xs text-gray-400">
                  {formatBytes(att.size)}
                  {att.uploader && <span> - oleh {att.uploader.name}</span>}
                </p>
              </div>
              {/* Hapus hanya untuk pengunggah atau admin. */}
              {(att.uploadedBy === user?.id || user?.role === 'admin') && (
                <button
                  onClick={() => handleDelete(att.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all shrink-0"
                  title="Hapus lampiran"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

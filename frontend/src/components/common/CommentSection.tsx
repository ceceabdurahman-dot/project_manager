import React, { useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { Comment } from '../../types';
import { tasksApi } from '../../api/tasks.api';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from './Avatar';

interface Props {
  taskId: string;
  comments: Comment[];
  onCommentAdded: (comment: Comment) => void;
  onCommentUpdated: (comment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
}

export const CommentSection: React.FC<Props> = ({ taskId, comments, onCommentAdded, onCommentUpdated, onCommentDeleted }) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');
  const user = useAuthStore(s => s.user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const { data } = await tasksApi.addComment(taskId, newComment.trim());
      onCommentAdded(data.comment);
      setNewComment('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal mengirim komentar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    if (!editContent.trim()) return;
    setError('');
    try {
      const { data } = await tasksApi.updateComment(taskId, commentId, editContent.trim());
      onCommentUpdated(data.comment);
      setEditingId(null);
      setEditContent('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal mengubah komentar');
    }
  };

  const handleDelete = async (commentId: string) => {
    setError('');
    try {
      await tasksApi.deleteComment(taskId, commentId);
      onCommentDeleted(commentId);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal menghapus komentar');
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-700">
          Komentar {comments.length > 0 && <span className="text-gray-400 font-normal">({comments.length})</span>}
        </h3>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {/* Comment list */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-2">Belum ada komentar</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar name={comment.author?.name || '?'} size="sm" src={comment.author?.avatar} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{comment.author?.name}</span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(parseISO(comment.createdAt), { addSuffix: true, locale: localeId })}
                  </span>
                  {/* Edit/Delete (only for author or admin) */}
                  {(comment.userId === user?.id || user?.role === 'admin') && editingId !== comment.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {comment.userId === user?.id && (
                        <button onClick={() => startEdit(comment)} className="text-xs text-gray-400 hover:text-primary transition-colors">
                          Edit
                        </button>
                      )}
                      <button onClick={() => handleDelete(comment.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="mt-1 space-y-2">
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="input text-sm resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(comment.id)}
                        disabled={!editContent.trim()}
                        className="text-xs text-white bg-primary hover:bg-primary-dark px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditContent(''); }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap mt-0.5 break-words">{comment.content}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-gray-100">
        <Avatar name={user?.name || '?'} size="sm" src={user?.avatar} />
        <div className="flex-1 flex gap-2">
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Tulis komentar..."
            className="input text-sm flex-1"
            maxLength={5000}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isSubmitting ? '...' : 'Kirim'}
          </button>
        </div>
      </form>
    </div>
  );
};

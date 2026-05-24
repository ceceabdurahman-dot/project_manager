import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext, DragEndEvent, PointerSensor,
  useSensor, useSensors, DragOverlay, closestCorners,
} from '@dnd-kit/core';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useSprintStore } from '../store/sprintStore';
import { useProjectSocket } from '../hooks/useSocket';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { TaskCard } from '../components/kanban/TaskCard';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { CommentSection } from '../components/common/CommentSection';
import { tasksApi } from '../api/tasks.api';
import { onCommentEvent, offCommentEvent } from '../socket/socketManager';
import type { Task, TaskStatus, Comment } from '../types';

const COLUMNS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];

export const KanbanPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { tasks, fetchAll, move, create, isLoading } = useTaskStore();
  const { current, fetchOne } = useProjectStore();
  const { sprints, fetchAll: fetchSprints } = useSprintStore();
  const [sprintFilter, setSprintFilter] = useState<string>('all');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addStatus, setAddStatus] = useState<TaskStatus | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTask) { setTaskDetail(null); return; }
    setDetailLoading(true);
    tasksApi.getOne(selectedTask.id)
      .then(({ data }) => setTaskDetail(data.task))
      .catch(() => setTaskDetail(selectedTask))
      .finally(() => setDetailLoading(false));
  }, [selectedTask]);

  useEffect(() => {
    const handler = (type: 'added' | 'updated' | 'deleted', data: { taskId: string; comment?: Comment; commentId?: string }) => {
      if (!selectedTask || data.taskId !== selectedTask.id) return;
      setTaskDetail(prev => {
        if (!prev) return prev;
        if (type === 'added' && data.comment) {
          return { ...prev, comments: [...(prev.comments || []), data.comment] };
        }
        if (type === 'updated' && data.comment) {
          return { ...prev, comments: (prev.comments || []).map(c => c.id === data.comment!.id ? data.comment! : c) };
        }
        if (type === 'deleted' && data.commentId) {
          return { ...prev, comments: (prev.comments || []).filter(c => c.id !== data.commentId) };
        }
        return prev;
      });
    };
    onCommentEvent(handler);
    return () => offCommentEvent(handler);
  }, [selectedTask]);

  useProjectSocket(projectId);

  useEffect(() => {
    if (!projectId) return;
    fetchAll(projectId);
    fetchOne(projectId);
    fetchSprints(projectId);
  }, [projectId, fetchAll, fetchOne, fetchSprints]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tasksByStatus = useCallback((status: TaskStatus) =>
    tasks
      .filter(t => t.status === status && !t.parentTaskId)
      .filter(t => sprintFilter === 'all' ? true : sprintFilter === 'backlog' ? !t.sprintId : t.sprintId === sprintFilter)
      .sort((a, b) => a.position - b.position),
  [tasks, sprintFilter]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setDragError(null);
    if (!over || active.id === over.id) return;

    const task = tasks.find(t => t.id === active.id);
    if (!task) return;

    const overId = over.id as string;
    const newStatus = COLUMNS.includes(overId as TaskStatus)
      ? overId as TaskStatus
      : tasks.find(t => t.id === overId)?.status ?? task.status;
    const colTasks = tasksByStatus(newStatus);
    const newIdx = colTasks.findIndex(t => t.id === overId);
    const newPos = newIdx >= 0 ? newIdx : colTasks.length;

    try {
      await move(task.id, newStatus, newPos);
    } catch {
      setDragError('Gagal memindahkan task. Coba lagi.');
      setTimeout(() => setDragError(null), 3000);
    }
  };

  const handleAddTask = async () => {
    if (!newTitle.trim() || !projectId || !addStatus) return;
    setAddError(null);
    setIsAdding(true);
    try {
      await create(projectId, {
        title: newTitle,
        status: addStatus,
        sprintId: sprintFilter !== 'all' && sprintFilter !== 'backlog' ? sprintFilter : undefined,
      });
      setNewTitle('');
      setAddStatus(null);
    } catch (err: any) {
      setAddError(err?.response?.data?.message ?? 'Gagal membuat task. Coba lagi.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCloseAddModal = () => {
    setAddStatus(null);
    setAddError(null);
    setNewTitle('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{current?.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Kanban Board · {tasks.length} task</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sprintFilter}
            onChange={e => setSprintFilter(e.target.value)}
            className="input text-sm py-1.5 px-3 w-44"
          >
            <option value="all">Semua Task</option>
            <option value="backlog">Tanpa Sprint</option>
            {sprints.map(s => (
              <option key={s.id} value={s.id}>
                {s.status === 'active' ? 'aktif: ' : ''}{s.name}
              </option>
            ))}
          </select>
          <Button onClick={() => setAddStatus('todo')} size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Task
          </Button>
        </div>
      </div>

      {dragError && (
        <div className="mx-6 mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {dragError}
        </div>
      )}

      <div className="flex-1 overflow-x-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Memuat task...</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
            onDragStart={e => setActiveTask(tasks.find(t => t.id === e.active.id) ?? null)}
          >
            <div className="flex gap-4 pb-4">
              {COLUMNS.map(status => (
                <KanbanColumn key={status} status={status} tasks={tasksByStatus(status)}
                  onTaskClick={setSelectedTask} onAddTask={setAddStatus} />
              ))}
            </div>
            <DragOverlay>
              {activeTask && (
                <div className="rotate-2 shadow-2xl">
                  <TaskCard task={activeTask} onClick={() => {}} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <Modal open={!!addStatus} onClose={handleCloseAddModal} title="Tambah Task Baru" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Judul Task</label>
            <input
              autoFocus className="input" value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Apa yang perlu dikerjakan?"
              onKeyDown={e => e.key === 'Enter' && handleAddTask()}
            />
          </div>
          {addError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{addError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={handleCloseAddModal}>Batal</Button>
            <Button onClick={handleAddTask} disabled={!newTitle.trim() || isAdding}>
              {isAdding ? 'Membuat...' : 'Buat Task'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask?.title ?? ''} size="lg">
        {selectedTask && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="label">Status</span><span className="capitalize">{selectedTask.status.replace('_', ' ')}</span></div>
              <div><span className="label">Prioritas</span><span className="capitalize">{selectedTask.priority}</span></div>
              {selectedTask.assignee && <div><span className="label">Assignee</span><span>{selectedTask.assignee.name}</span></div>}
              {selectedTask.dueDate && <div><span className="label">Due Date</span><span>{selectedTask.dueDate}</span></div>}
            </div>
            {selectedTask.description && (
              <div>
                <p className="label">Deskripsi</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedTask.description}</p>
              </div>
            )}
            <div className="border-t border-gray-100 pt-4">
              {detailLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Memuat komentar...
                </div>
              ) : (
                <CommentSection
                  taskId={selectedTask.id}
                  comments={taskDetail?.comments ?? []}
                  onCommentAdded={(comment: Comment) => {
                    setTaskDetail(prev => prev ? { ...prev, comments: [...(prev.comments ?? []), comment] } : prev);
                  }}
                  onCommentUpdated={(comment: Comment) => {
                    setTaskDetail(prev => prev ? {
                      ...prev,
                      comments: (prev.comments ?? []).map(c => c.id === comment.id ? comment : c),
                    } : prev);
                  }}
                  onCommentDeleted={(commentId: string) => {
                    setTaskDetail(prev => prev ? {
                      ...prev,
                      comments: (prev.comments ?? []).filter(c => c.id !== commentId),
                    } : prev);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

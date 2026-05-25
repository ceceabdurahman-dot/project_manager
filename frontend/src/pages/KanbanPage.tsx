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
import { AttachmentSection } from '../components/common/AttachmentSection';
import { tasksApi } from '../api/tasks.api';
import { projectsApi } from '../api/projects.api';
import { onCommentEvent, offCommentEvent } from '../socket/socketManager';
import type { Task, TaskStatus, TaskPriority, Comment, Attachment } from '../types';

const COLUMNS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

const upsertComment = (comments: Comment[], comment: Comment): Comment[] => {
  const exists = comments.some(item => item.id === comment.id);
  return exists
    ? comments.map(item => item.id === comment.id ? comment : item)
    : [...comments, comment];
};

const upsertAttachment = (attachments: Attachment[], attachment: Attachment): Attachment[] => {
  const exists = attachments.some(item => item.id === attachment.id);
  return exists
    ? attachments.map(item => item.id === attachment.id ? attachment : item)
    : [...attachments, attachment];
};

interface ProjectMemberOption {
  id: string;
  User: { id: string; name: string; email: string };
}

interface AddTaskForm {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  sprintId: string;
  parentTaskId: string;
  startDate: string;
  dueDate: string;
  storyPoints: string;
  position: string;
  labels: string;
}

const createEmptyTaskForm = (status: TaskStatus, sprintId?: string): AddTaskForm => ({
  title: '',
  description: '',
  status,
  priority: 'medium',
  assigneeId: '',
  sprintId: sprintId ?? '',
  parentTaskId: '',
  startDate: '',
  dueDate: '',
  storyPoints: '',
  position: '',
  labels: '',
});

const formatDateInput = (value?: string): string => value ? value.slice(0, 10) : '';

const createTaskFormFromTask = (task: Task): AddTaskForm => ({
  title: task.title ?? '',
  description: task.description ?? '',
  status: task.status,
  priority: task.priority,
  assigneeId: task.assigneeId ?? '',
  sprintId: task.sprintId ?? '',
  parentTaskId: task.parentTaskId ?? '',
  startDate: formatDateInput(task.startDate),
  dueDate: formatDateInput(task.dueDate),
  storyPoints: task.storyPoints == null ? '' : String(task.storyPoints),
  position: task.position == null ? '' : String(task.position),
  labels: Array.isArray(task.labels) ? task.labels.join(', ') : '',
});

const normalizeTaskDetail = (task: Task & { Comments?: Comment[]; Attachments?: Attachment[] }): Task => ({
  ...task,
  comments: task.comments ?? task.Comments ?? [],
  attachments: task.attachments ?? task.Attachments ?? [],
});

export const KanbanPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { tasks, fetchAll, move, create, update: updateTask, remove: removeTask, isLoading } = useTaskStore();
  const { current, fetchOne } = useProjectStore();
  const { sprints, fetchAll: fetchSprints } = useSprintStore();
  const [sprintFilter, setSprintFilter] = useState<string>('all');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addStatus, setAddStatus] = useState<TaskStatus | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<AddTaskForm>(() => createEmptyTaskForm('todo'));
  const [members, setMembers] = useState<ProjectMemberOption[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTask) { setTaskDetail(null); return; }
    setDetailLoading(true);
    tasksApi.getOne(selectedTask.id)
      .then(({ data }) => setTaskDetail(normalizeTaskDetail(data.task)))
      .catch(() => setTaskDetail(selectedTask))
      .finally(() => setDetailLoading(false));
  }, [selectedTask]);

  useEffect(() => {
    const handler = (type: 'added' | 'updated' | 'deleted', data: { taskId: string; comment?: Comment; commentId?: string }) => {
      if (!selectedTask || data.taskId !== selectedTask.id) return;
      setTaskDetail(prev => {
        if (!prev) return prev;
        if (type === 'added' && data.comment) {
          return { ...prev, comments: upsertComment(prev.comments || [], data.comment) };
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

  useEffect(() => {
    if (!projectId) return;
    projectsApi.getMembers(projectId)
      .then(({ data }) => setMembers(data.members))
      .catch(() => setMembers([]));
  }, [projectId]);

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

  const openAddTask = (status: TaskStatus) => {
    const sprintId = sprintFilter !== 'all' && sprintFilter !== 'backlog' ? sprintFilter : '';
    setTaskForm(createEmptyTaskForm(status, sprintId));
    setFormError(null);
    setEditingTask(null);
    setAddStatus(status);
  };

  const openEditTask = (task: Task) => {
    const taskForForm = taskDetail ?? task;
    setTaskForm(createTaskFormFromTask(taskForForm));
    setFormError(null);
    setAddStatus(null);
    setEditingTask(taskForForm);
    setSelectedTask(null);
  };

  const buildTaskPayload = () => {
    const labels = taskForm.labels
      .split(',')
      .map(label => label.trim())
      .filter(Boolean);
    const storyPoints = taskForm.storyPoints === '' ? undefined : Number(taskForm.storyPoints);
    const position = taskForm.position === '' ? undefined : Number(taskForm.position);

    return {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || undefined,
      status: taskForm.status,
      priority: taskForm.priority,
      assigneeId: taskForm.assigneeId || undefined,
      sprintId: taskForm.sprintId || undefined,
      parentTaskId: taskForm.parentTaskId || undefined,
      startDate: taskForm.startDate || undefined,
      dueDate: taskForm.dueDate || undefined,
      storyPoints,
      position,
      labels,
    };
  };

  const handleSaveTask = async () => {
    const title = taskForm.title.trim();
    if (!title || isSavingTask) return;
    if (!editingTask && (!projectId || !addStatus)) return;
    if (taskForm.startDate && taskForm.dueDate && taskForm.dueDate < taskForm.startDate) {
      setFormError('Tanggal jatuh tempo tidak boleh sebelum tanggal mulai.');
      return;
    }

    setFormError(null);
    setIsSavingTask(true);
    try {
      const payload = buildTaskPayload();
      if (editingTask) {
        await updateTask(editingTask.id, payload);
      } else if (projectId) {
        await create(projectId, payload);
      }
      setTaskForm(createEmptyTaskForm('todo'));
      setAddStatus(null);
      setEditingTask(null);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Gagal menyimpan task. Coba lagi.');
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    const ok = window.confirm(`Hapus task "${task.title}"?`);
    if (!ok || isDeletingTask) return;

    setIsDeletingTask(true);
    try {
      await removeTask(task.id);
      setSelectedTask(null);
      setTaskDetail(null);
    } catch {
      setDragError('Gagal menghapus task. Coba lagi.');
      setTimeout(() => setDragError(null), 3000);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleCloseTaskForm = () => {
    setAddStatus(null);
    setEditingTask(null);
    setFormError(null);
    setTaskForm(createEmptyTaskForm('todo'));
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
          <Button onClick={() => openAddTask('todo')} size="sm">
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
                  onTaskClick={setSelectedTask} onAddTask={openAddTask} />
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

      <Modal
        open={!!addStatus || !!editingTask}
        onClose={handleCloseTaskForm}
        title={editingTask ? 'Edit Task' : 'Tambah Task Baru'}
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            handleSaveTask();
          }}
        >
          <div>
            <label className="label">Judul Task *</label>
            <input
              autoFocus className="input" value={taskForm.title}
              onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Apa yang perlu dikerjakan?"
              maxLength={250}
              required
            />
          </div>

          <div>
            <label className="label">Deskripsi</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={taskForm.description}
              onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Tambahkan detail pekerjaan, konteks, atau checklist singkat"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={taskForm.status}
                onChange={e => setTaskForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
              >
                {COLUMNS.map(status => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prioritas</label>
              <select
                className="input"
                value={taskForm.priority}
                onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Assignee</label>
              <select
                className="input"
                value={taskForm.assigneeId}
                onChange={e => setTaskForm(f => ({ ...f, assigneeId: e.target.value }))}
              >
                <option value="">Belum ditugaskan</option>
                {members.map(member => (
                  <option key={member.User.id} value={member.User.id}>
                    {member.User.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sprint</label>
              <select
                className="input"
                value={taskForm.sprintId}
                onChange={e => setTaskForm(f => ({ ...f, sprintId: e.target.value }))}
              >
                <option value="">Tanpa Sprint</option>
                {sprints.map(sprint => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.status === 'active' ? 'aktif: ' : ''}{sprint.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Parent Task</label>
            <select
              className="input"
              value={taskForm.parentTaskId}
              onChange={e => setTaskForm(f => ({ ...f, parentTaskId: e.target.value }))}
            >
              <option value="">Tidak ada parent</option>
              {tasks
                .filter(task => !task.parentTaskId && task.id !== editingTask?.id)
                .map(task => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="label">Tanggal Mulai</label>
              <input
                className="input"
                type="date"
                value={taskForm.startDate}
                onChange={e => setTaskForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Jatuh Tempo</label>
              <input
                className="input"
                type="date"
                value={taskForm.dueDate}
                onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Story Points</label>
              <input
                className="input"
                type="number"
                min={0}
                max={999}
                value={taskForm.storyPoints}
                onChange={e => setTaskForm(f => ({ ...f, storyPoints: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Posisi</label>
              <input
                className="input"
                type="number"
                min={0}
                step="0.1"
                value={taskForm.position}
                onChange={e => setTaskForm(f => ({ ...f, position: e.target.value }))}
                placeholder="auto"
              />
            </div>
          </div>

          <div>
            <label className="label">Labels</label>
            <input
              className="input"
              value={taskForm.labels}
              onChange={e => setTaskForm(f => ({ ...f, labels: e.target.value }))}
              placeholder="frontend, urgent, dokumen"
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={handleCloseTaskForm}>Batal</Button>
            <Button type="submit" loading={isSavingTask} disabled={!taskForm.title.trim()}>
              {editingTask ? 'Simpan Perubahan' : 'Buat Task'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask?.title ?? ''} size="lg">
        {selectedTask && (
          <div className="space-y-5">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => openEditTask(selectedTask)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={isDeletingTask}
                onClick={() => handleDeleteTask(selectedTask)}
              >
                Hapus
              </Button>
            </div>
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
                  Memuat detail task...
                </div>
              ) : (
                <div className="space-y-5">
                  <CommentSection
                    taskId={selectedTask.id}
                    comments={taskDetail?.comments ?? []}
                    onCommentAdded={(comment: Comment) => {
                      setTaskDetail(prev => prev ? { ...prev, comments: upsertComment(prev.comments ?? [], comment) } : prev);
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
                  <div className="border-t border-gray-100 pt-4">
                    <AttachmentSection
                      taskId={selectedTask.id}
                      attachments={taskDetail?.attachments ?? []}
                      onAttachmentAdded={(attachment: Attachment) => {
                        setTaskDetail(prev => prev ? {
                          ...prev,
                          attachments: upsertAttachment(prev.attachments ?? [], attachment),
                        } : prev);
                      }}
                      onAttachmentDeleted={(attachmentId: string) => {
                        setTaskDetail(prev => prev ? {
                          ...prev,
                          attachments: (prev.attachments ?? []).filter(att => att.id !== attachmentId),
                        } : prev);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

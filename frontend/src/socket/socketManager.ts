import { io, Socket } from 'socket.io-client';
import { useTaskStore } from '../store/taskStore';
import type { Task, Comment } from '../types';

let socket: Socket | null = null;

// Comment event listener system — komponen bisa subscribe/unsubscribe per-task
type CommentEventType = 'added' | 'updated' | 'deleted';
type CommentListener = (
  type: CommentEventType,
  data: { taskId: string; comment?: Comment; commentId?: string }
) => void;
const commentListeners = new Set<CommentListener>();

export const onCommentEvent  = (listener: CommentListener) => { commentListeners.add(listener); };
export const offCommentEvent = (listener: CommentListener) => { commentListeners.delete(listener); };

const notifyCommentListeners = (
  type: CommentEventType,
  data: { taskId: string; comment?: Comment; commentId?: string }
) => { commentListeners.forEach(l => l(type, data)); };

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
  });

  socket.on('connect',       () => console.log('🔌 Socket connected'));
  socket.on('disconnect',    () => console.log('🔌 Socket disconnected'));
  socket.on('connect_error', (e) => console.error('Socket error:', e.message));

  // Task events — update Zustand store langsung
  socket.on('task:created', (task: Task) => useTaskStore.getState().upsert(task));
  socket.on('task:updated', (task: Task) => useTaskStore.getState().upsert(task));
  socket.on('task:moved',   (task: Task) => useTaskStore.getState().upsert(task));
  socket.on('task:deleted', ({ id }: { id: string }) => useTaskStore.getState().removeById(id));

  // Comment events — forward ke listener yang subscribe
  socket.on('comment:added',   (d: { taskId: string; comment: Comment }) =>
    notifyCommentListeners('added', d));
  socket.on('comment:updated', (d: { taskId: string; comment: Comment }) =>
    notifyCommentListeners('updated', d));
  socket.on('comment:deleted', (d: { taskId: string; commentId: string }) =>
    notifyCommentListeners('deleted', d));

  return socket;
};

export const joinProject      = (projectId: string) => socket?.emit('join_project',  { projectId });
export const leaveProject     = (projectId: string) => socket?.emit('leave_project', { projectId });
export const getSocket        = () => socket;
export const disconnectSocket = () => { socket?.disconnect(); socket = null; };

import { useEffect } from 'react';
import { connectSocket, joinProject, leaveProject } from '../socket/socketManager';
import { useAuthStore } from '../store/authStore';

export const useProjectSocket = (projectId?: string) => {
  const token = useAuthStore(s => s.token);

  useEffect(() => {
    if (!token || !projectId) return;
    const socket = connectSocket(token);
    socket.on('connect', () => joinProject(projectId));
    if (socket.connected) joinProject(projectId);
    return () => { leaveProject(projectId); };
  }, [token, projectId]);
};

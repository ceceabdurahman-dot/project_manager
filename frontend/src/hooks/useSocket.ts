import { useEffect } from 'react';
import { connectSocket, joinProject, leaveProject } from '../socket/socketManager';
import { useAuthStore } from '../store/authStore';

export const useProjectSocket = (projectId?: string) => {
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user || !projectId) return;
    const socket = connectSocket();
    socket.on('connect', () => joinProject(projectId));
    if (socket.connected) joinProject(projectId);
    return () => { leaveProject(projectId); };
  }, [user, projectId]);
};

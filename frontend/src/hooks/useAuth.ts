import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { connectSocket } from '../socket/socketManager';

export const useInitAuth = () => {
  const { user, fetchMe, hasCheckedSession, isLoading } = useAuthStore();

  useEffect(() => {
    if (!hasCheckedSession) fetchMe();
  }, [hasCheckedSession, fetchMe]);

  useEffect(() => {
    if (user) connectSocket();
  }, [user]);

  return { user, isLoading, hasCheckedSession };
};

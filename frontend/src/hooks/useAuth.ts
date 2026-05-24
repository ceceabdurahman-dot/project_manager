import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { connectSocket } from '../socket/socketManager';

export const useInitAuth = () => {
  const { token, user, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token && !user) fetchMe();
    if (token) connectSocket(token);
  }, [token]);

  return { token, user };
};

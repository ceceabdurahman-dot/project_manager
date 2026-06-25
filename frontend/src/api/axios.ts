import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes('/auth/login');
    // Jangan redirect jika error berasal dari request login itu sendiri
    // (agar pesan error tetap muncul di form login)
    if (err.response?.status === 401 && !isLoginRequest) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

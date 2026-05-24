import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/common/Button';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Login gagal, periksa email dan password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-blue-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Project Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Masuk ke akun Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              className="input" placeholder="email@local.dev" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              className="input" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" required />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <Button type="submit" loading={isLoading} className="w-full justify-center">
            Masuk
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowForgot(!showForgot)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Lupa password?
          </button>
          {showForgot && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-500 text-left">
              Hubungi administrator untuk mereset password Anda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

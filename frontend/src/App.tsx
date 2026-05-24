import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useInitAuth } from './hooks/useAuth';
import { useProjectStore } from './store/projectStore';
import { Sidebar } from './components/layout/Sidebar';
import { Login }     from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Projects }  from './pages/Projects';
import { KanbanPage }from './pages/KanbanPage';
import { Timeline }  from './pages/Timeline';
import { Reports }   from './pages/Reports';
import { Settings }  from './pages/Settings';

// ── Protected wrapper ─────────────────────────────────────────────────
const Protected: React.FC = () => {
  const { token, user } = useInitAuth();
  const { fetchAll } = useProjectStore();

  useEffect(() => { if (token) fetchAll(); }, [token, fetchAll]);

  if (!token) return <Navigate to="/login" replace />;
  if (!user)  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

// ── App ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route path="/"                                  element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"                         element={<Dashboard />} />
          <Route path="/projects"                          element={<Projects />} />
          <Route path="/projects/:projectId/kanban"        element={<KanbanPage />} />
          <Route path="/projects/:projectId/timeline"      element={<Timeline />} />
          <Route path="/projects/:projectId/reports"       element={<Reports />} />
          <Route path="/projects/:projectId/settings"      element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

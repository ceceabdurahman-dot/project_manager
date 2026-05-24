import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export const Timeline: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { tasks, fetchAll } = useTaskStore();
  const { current, fetchOne } = useProjectStore();

  useEffect(() => {
    if (!projectId) return;
    fetchAll(projectId);
    fetchOne(projectId);
  }, [projectId, fetchAll, fetchOne]);

  const tasksWithDates = tasks.filter(t => t.startDate || t.dueDate);
  const projectStart = current?.startDate ? parseISO(current.startDate) : new Date();
  const totalDays = 30;

  const dayHeaders = Array.from({ length: totalDays }, (_, i) => addDays(projectStart, i));

  const statusColor: Record<string, string> = {
    backlog: 'bg-gray-300', todo: 'bg-blue-400',
    in_progress: 'bg-yellow-400', review: 'bg-purple-400', done: 'bg-green-500',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-900">{current?.name} — Timeline</h1>
        <p className="text-xs text-gray-400 mt-0.5">{tasksWithDates.length} task dengan tanggal</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="card overflow-hidden">
          {/* Day headers */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-48 shrink-0 px-4 py-2 text-xs font-semibold text-gray-500 border-r border-gray-200">Task</div>
            <div className="flex overflow-hidden">
              {dayHeaders.map((d, i) => (
                <div key={i} className="w-10 shrink-0 px-1 py-2 text-center border-r border-gray-100">
                  <p className="text-xs text-gray-400">{format(d,'dd')}</p>
                  {i === 0 || d.getDate() === 1 ? <p className="text-xs font-semibold text-gray-600">{format(d,'MMM',{locale:localeId})}</p> : null}
                </div>
              ))}
            </div>
          </div>
          {/* Task rows */}
          {tasksWithDates.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm">Belum ada task dengan tanggal mulai/selesai</div>
          ) : tasksWithDates.map(task => {
            const start = task.startDate ? parseISO(task.startDate) : (task.dueDate ? parseISO(task.dueDate) : null);
            const end   = task.dueDate   ? parseISO(task.dueDate)   : start;
            if (!start || !end) return null;
            const offsetDays = Math.max(0, differenceInDays(start, projectStart));
            const durationDays = Math.max(1, differenceInDays(end, start) + 1);
            const color = statusColor[task.status] || 'bg-gray-300';
            return (
              <div key={task.id} className="flex items-center border-b border-gray-100 hover:bg-gray-50">
                <div className="w-48 shrink-0 px-4 py-2 border-r border-gray-200">
                  <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{task.status.replace('_',' ')}</p>
                </div>
                <div className="flex items-center relative h-10 overflow-hidden" style={{ width: totalDays * 40 }}>
                  <div
                    className={`absolute h-6 rounded-full ${color} opacity-80 flex items-center px-2`}
                    style={{ left: offsetDays * 40, width: durationDays * 40 - 4 }}
                  >
                    <span className="text-white text-xs truncate font-medium">{task.title}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

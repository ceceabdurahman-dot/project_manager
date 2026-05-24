import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';

const colConfig: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  backlog:     { label: 'Backlog',      color: 'bg-gray-400',    bg: 'bg-gray-50' },
  todo:        { label: 'To Do',        color: 'bg-blue-400',    bg: 'bg-blue-50' },
  in_progress: { label: 'In Progress',  color: 'bg-yellow-400',  bg: 'bg-yellow-50' },
  review:      { label: 'Review',       color: 'bg-purple-400',  bg: 'bg-purple-50' },
  done:        { label: 'Done',         color: 'bg-green-400',   bg: 'bg-green-50' },
};

interface Props {
  status: TaskStatus; tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
}

export const KanbanColumn: React.FC<Props> = ({ status, tasks, onTaskClick, onAddTask }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { label, color, bg } = colConfig[status];

  return (
    <div className={`flex flex-col rounded-xl min-h-64 w-64 shrink-0 ${bg} border border-gray-200 transition-all ${isOver ? 'ring-2 ring-primary/40' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200/60">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
          <span className="font-semibold text-sm text-gray-700">{label}</span>
          <span className="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded-full border border-gray-200">{tasks.length}</span>
        </div>
        {onAddTask && (
          <button onClick={() => onAddTask(status)} className="p-1 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        )}
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex flex-col gap-2 p-2 flex-1">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <TaskCard key={task.id} task={task} onClick={onTaskClick} />)}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            Seret task ke sini
          </div>
        )}
      </div>
    </div>
  );
};

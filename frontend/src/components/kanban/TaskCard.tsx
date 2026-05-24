import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../types';
import { Avatar } from '../common/Avatar';
import { PriorityBadge } from '../common/PriorityBadge';
import { format, isPast, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Props { task: Task; onClick: (task: Task) => void; }

export const TaskCard: React.FC<Props> = ({ task, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const isOverdue = task.dueDate && task.status !== 'done' && isPast(parseISO(task.dueDate));

  return (
    <div
      ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={() => onClick(task)}
      className={`bg-white rounded-xl border border-gray-200 p-3 cursor-pointer shadow-sm hover:shadow-md hover:border-primary/30 transition-all group ${isDragging ? 'opacity-50 shadow-xl rotate-1' : ''}`}
    >
      {/* Labels */}
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map(l => <span key={l} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{l}</span>)}
        </div>
      )}

      <p className="text-sm font-medium text-gray-800 leading-snug mb-2 line-clamp-2">{task.title}</p>

      <div className="flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center gap-2 ml-auto">
          {/* Subtasks count */}
          {(task.subtasks?.length ?? 0) > 0 && (
            <span className="text-xs text-gray-400">{task.subtasks!.filter(s=>s.status==='done').length}/{task.subtasks!.length}</span>
          )}
          {/* Comments */}
          {(task.comments?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {task.comments!.length}
            </span>
          )}
          {/* Due date */}
          {task.dueDate && (
            <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {format(parseISO(task.dueDate), 'd MMM', { locale: localeId })}
            </span>
          )}
          {/* Assignee */}
          {task.assignee && <Avatar name={task.assignee.name} size="xs" src={task.assignee.avatar} />}
        </div>
      </div>
    </div>
  );
};

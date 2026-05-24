import React from 'react';
import type { TaskPriority } from '../../types';

const cfg: Record<TaskPriority, { label: string; cls: string }> = {
  low:    { label: 'Low',    cls: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', cls: 'bg-blue-100 text-blue-700' },
  high:   { label: 'High',   cls: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', cls: 'bg-red-100 text-red-700' },
};

export const PriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const { label, cls } = cfg[priority];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
};

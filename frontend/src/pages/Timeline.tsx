import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO, differenceInDays, addDays, isValid, min, max } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';

const DAY_WIDTH = 44;

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
};

export const Timeline: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { tasks, fetchAll, isLoading } = useTaskStore();
  const { current, fetchOne } = useProjectStore();

  useEffect(() => {
    if (!projectId) return;
    fetchAll(projectId);
    fetchOne(projectId);
  }, [projectId, fetchAll, fetchOne]);

  const tasksWithDates = tasks.filter(t => t.startDate || t.dueDate);
  const taskDates = tasksWithDates
    .flatMap(task => [parseDate(task.startDate), parseDate(task.dueDate)])
    .filter(Boolean) as Date[];
  const projectStartDate = parseDate(current?.startDate);
  const projectEndDate = parseDate(current?.endDate);
  const timelineStart = taskDates.length > 0
    ? min([projectStartDate ?? taskDates[0], ...taskDates])
    : projectStartDate ?? new Date();
  const timelineEnd = taskDates.length > 0
    ? max([projectEndDate ?? taskDates[0], ...taskDates])
    : projectEndDate ?? addDays(timelineStart, 29);
  const totalDays = Math.max(1, differenceInDays(timelineEnd, timelineStart) + 1);
  const dayHeaders = Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));
  const monthSegments = dayHeaders.reduce<Array<{ key: string; label: string; days: number }>>((segments, date) => {
    const key = format(date, 'yyyy-MM');
    const label = format(date, 'MMMM yyyy', { locale: localeId });
    const lastSegment = segments[segments.length - 1];
    if (lastSegment?.key === key) {
      lastSegment.days += 1;
      return segments;
    }
    segments.push({ key, label, days: 1 });
    return segments;
  }, []);

  const statusColor: Record<string, string> = {
    backlog: 'bg-gray-300',
    todo: 'bg-blue-400',
    in_progress: 'bg-yellow-400',
    review: 'bg-purple-400',
    done: 'bg-green-500',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-900">{current?.name} - Timeline</h1>
        <p className="text-xs text-gray-400 mt-0.5">{tasksWithDates.length} task dengan tanggal</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="card overflow-hidden min-w-max">
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-64 shrink-0 px-4 py-3 text-xs font-semibold text-gray-500 border-r border-gray-200">Task</div>
            <div>
              <div className="flex border-b border-gray-200">
                {monthSegments.map(segment => (
                  <div
                    key={segment.key}
                    className="h-8 border-r border-gray-200 px-2 text-center text-xs font-semibold text-gray-600 leading-8 truncate"
                    style={{ width: segment.days * DAY_WIDTH }}
                    title={segment.label}
                  >
                    {segment.label}
                  </div>
                ))}
              </div>
              <div className="flex overflow-hidden">
              {dayHeaders.map((date, i) => (
                <div key={date.toISOString()} className="shrink-0 px-1 py-2 text-center border-r border-gray-100" style={{ width: DAY_WIDTH }}>
                  <p className="text-xs text-gray-400">{format(date, 'dd')}</p>
                  <p className="text-[10px] leading-3 text-gray-400">{format(date, 'EEE', { locale: localeId })}</p>
                </div>
              ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-12 text-sm">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Memuat timeline...
            </div>
          ) : tasksWithDates.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm">Belum ada task dengan tanggal mulai/selesai</div>
          ) : tasksWithDates.map(task => {
            const start = parseDate(task.startDate) ?? parseDate(task.dueDate);
            const end = parseDate(task.dueDate) ?? start;
            if (!start || !end) return null;

            const offsetDays = Math.max(0, differenceInDays(start, timelineStart));
            const unclippedDurationDays = Math.max(1, differenceInDays(end, start) + 1);
            const durationDays = Math.min(unclippedDurationDays, totalDays - offsetDays);
            if (offsetDays >= totalDays || durationDays <= 0) return null;

            const color = statusColor[task.status] || 'bg-gray-300';
            const barWidth = durationDays * DAY_WIDTH - 6;
            const dateLabel = `${format(start, 'd MMM', { locale: localeId })} - ${format(end, 'd MMM yyyy', { locale: localeId })}`;
            return (
              <div key={task.id} className="flex items-center border-b border-gray-100 hover:bg-gray-50">
                <div className="w-64 shrink-0 px-4 py-2 border-r border-gray-200">
                  <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{task.status.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-500 truncate">{dateLabel}</p>
                </div>
                <div className="flex items-center relative h-10 overflow-hidden" style={{ width: totalDays * DAY_WIDTH }}>
                  <div
                    className={`absolute h-6 rounded ${color} opacity-80 flex items-center overflow-hidden px-2`}
                    style={{ left: offsetDays * DAY_WIDTH, width: barWidth }}
                    title={`${task.title} (${task.startDate ?? task.dueDate} - ${task.dueDate ?? task.startDate})`}
                  >
                    {barWidth >= 88 && <span className="text-white text-xs truncate font-medium">{task.title}</span>}
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

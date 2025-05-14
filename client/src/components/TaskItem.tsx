import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import SubtaskItem from './SubtaskItem';
import { Task, ReminderFrequency } from '../types';
import { format } from 'date-fns';
import { TaskScheduler } from './TaskScheduler';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TaskItemProps {
  task: Task;
  goalId: number;
  onToggleTaskComplete: (goalId: number, taskId: string, completed: boolean) => Promise<void>;
  onToggleSubtaskComplete: (goalId: number, taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
  onUpdateTaskSchedule?: (
    goalId: number, 
    taskId: string, 
    updates: { 
      dueDate?: string; 
      addedToCalendar?: boolean;
      reminderEnabled?: boolean;
      reminderTime?: string;
      enableWhatsapp?: boolean;
      whatsappNumber?: string;
      reminderFrequency?: ReminderFrequency;
    }
  ) => Promise<void>;
  onUpdateSubtaskSchedule?: (
    goalId: number, 
    taskId: string, 
    subtaskId: string,
    updates: { 
      dueDate?: string; 
      addedToCalendar?: boolean;
    }
  ) => Promise<void>;
  contactPhone?: string;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  goalId,
  onToggleTaskComplete,
  onToggleSubtaskComplete,
  onUpdateTaskSchedule,
  onUpdateSubtaskSchedule,
  contactPhone,
}) => {
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  const handleToggle = async (checked: boolean) => {
    await onToggleTaskComplete(goalId, task.id, checked);
  };

  const handleUpdateDueDate = async (dueDate: string | undefined) => {
    if (onUpdateTaskSchedule) {
      await onUpdateTaskSchedule(goalId, task.id, { dueDate });
    }
  };

  const handleAddToCalendar = async (add: boolean) => {
    if (onUpdateTaskSchedule) {
      await onUpdateTaskSchedule(goalId, task.id, { addedToCalendar: add });
    }
  };

  const handleEnableReminder = async (enabled: boolean, reminderTime?: string) => {
    if (onUpdateTaskSchedule) {
      await onUpdateTaskSchedule(goalId, task.id, { 
        reminderEnabled: enabled,
        reminderTime
      });
    }
  };
  
  const handleEnableWhatsapp = async (enabled: boolean, phoneNumber?: string) => {
    if (onUpdateTaskSchedule) {
      await onUpdateTaskSchedule(goalId, task.id, { 
        enableWhatsapp: enabled,
        whatsappNumber: phoneNumber
      });
    }
  };

  return (
    <li className="group">
      <div className="flex items-start gap-2 p-3 hover:bg-blue-50 rounded-lg transition-colors mb-2">
        <div className="flex-shrink-0 mt-0.5">
          <Checkbox
            id={`task-${task.id}`}
            checked={task.completed}
            onCheckedChange={handleToggle}
            className="w-5 h-5 border-2 border-blue-300 rounded data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
          />
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex flex-col">
            <div className="flex justify-between items-start gap-2">
              <label
                htmlFor={`task-${task.id}`}
                className={`text-base font-medium cursor-pointer break-words ${
                  task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                }`}
              >
                {task.title}
              </label>
              
              {/* Actions - simplified and always visible */}
              <div className="flex-shrink-0 flex items-center space-x-1">
                <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="p-1 text-gray-500 hover:text-blue-600 rounded-full bg-gray-50 hover:bg-blue-50 w-8 h-8 flex items-center justify-center transition-colors" title="Schedule Task">
                      <span className="text-lg">📅</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="w-[90vw] md:max-w-md">
                    <DialogHeader>
                      <DialogTitle>📅 Schedule Task</DialogTitle>
                    </DialogHeader>
                    <TaskScheduler 
                      task={task}
                      onUpdateDueDate={handleUpdateDueDate}
                      onAddToCalendar={handleAddToCalendar}
                      onEnableReminder={handleEnableReminder}
                      onEnableWhatsapp={handleEnableWhatsapp}
                      contactPhone={contactPhone}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* Time, Complexity, and Due Date Information */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              {task.estimatedMinutes && (
                <span className="bg-blue-50 text-blue-600 py-1 px-2 rounded-full">
                  <span>⏱️ {task.estimatedMinutes} min</span>
                </span>
              )}
              
              {task.complexity && (
                <span 
                  className={`py-1 px-2 rounded-full ${
                    task.complexity === 'low' 
                      ? 'bg-green-50 text-green-600' 
                      : task.complexity === 'medium'
                      ? 'bg-yellow-50 text-yellow-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {task.complexity === 'low' ? '🟢 Easy' : 
                   task.complexity === 'medium' ? '🟡 Medium' : '🔴 Hard'}
                </span>
              )}
              
              {task.dueDate && (
                <span 
                  className={`bg-purple-50 text-purple-600 py-1 px-2 rounded-full`}
                  title={format(new Date(task.dueDate), 'PPP')}
                >
                  📆 {format(new Date(task.dueDate), 'MMM d')}
                </span>
              )}
              
              {task.addedToCalendar && (
                <span className="bg-teal-50 text-teal-600 py-1 px-2 rounded-full">
                  🗓️ In Calendar
                </span>
              )}
              
              {task.enableWhatsapp && (
                <span className="bg-green-50 text-green-600 py-1 px-2 rounded-full">
                  💬 WhatsApp
                </span>
              )}
            </div>
          </div>

          {/* Subtasks if any */}
          {task.subtasks && task.subtasks.length > 0 && (
            <ul className="mt-2 space-y-2 text-sm">
              {task.subtasks.map((subtask) => (
                <SubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  taskId={task.id}
                  goalId={goalId}
                  onToggleComplete={onToggleSubtaskComplete}
                  onUpdateSubtaskSchedule={onUpdateSubtaskSchedule}
                />
              ))}
            </ul>
          )}
        </div>
        {/* Desktop actions - visible on hover */}
        <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity items-center space-x-1">
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <button className="p-1 text-gray-400 hover:text-purple-600 rounded" title="Schedule Task">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Task</DialogTitle>
              </DialogHeader>
              <TaskScheduler 
                task={task}
                onUpdateDueDate={handleUpdateDueDate}
                onAddToCalendar={handleAddToCalendar}
                onEnableReminder={handleEnableReminder}
                onEnableWhatsapp={handleEnableWhatsapp}
                contactPhone={contactPhone}
              />
            </DialogContent>
          </Dialog>
          
          <button className="p-1 text-gray-400 hover:text-gray-700 rounded" title="Edit Task">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
};

export default TaskItem;

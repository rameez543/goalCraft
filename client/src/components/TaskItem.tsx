import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import SubtaskItem from './SubtaskItem';
import { Task } from '../types';
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
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  goalId,
  onToggleTaskComplete,
  onToggleSubtaskComplete,
  onUpdateTaskSchedule,
  onUpdateSubtaskSchedule,
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

  return (
    <li className="group">
      <div className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg">
        <div className="flex-shrink-0 mt-0.5">
          <Checkbox
            id={`task-${task.id}`}
            checked={task.completed}
            onCheckedChange={handleToggle}
            className="w-5 h-5 border-2 border-gray-300 rounded data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
          />
        </div>
        <div className="flex-grow">
          <div className="flex flex-col">
            <label
              htmlFor={`task-${task.id}`}
              className={`text-base text-gray-800 cursor-pointer ${
                task.completed ? 'line-through text-gray-400' : ''
              }`}
            >
              {task.title}
            </label>
            
            {/* Time, Complexity, and Due Date Information */}
            <div className="flex items-center space-x-3 mt-1 text-xs flex-wrap">
              {task.estimatedMinutes && (
                <span className="flex items-center text-blue-600">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                  {task.estimatedMinutes} min
                </span>
              )}
              
              {task.complexity && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  task.complexity === 'low' ? 'bg-green-100 text-green-800' :
                  task.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {task.complexity} complexity
                </span>
              )}
              
              {task.dueDate && (
                <span className="flex items-center text-purple-600">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-1" 
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
                  Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                </span>
              )}
              
              {task.addedToCalendar && (
                <span className="flex items-center text-green-600">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                  In Calendar
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
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
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

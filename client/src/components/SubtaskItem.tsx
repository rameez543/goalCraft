import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Subtask } from '../types';
import { format } from 'date-fns';
import { TaskScheduler } from './TaskScheduler';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SubtaskItemProps {
  subtask: Subtask;
  taskId: string;
  goalId: number;
  onToggleComplete: (goalId: number, taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
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

const SubtaskItem: React.FC<SubtaskItemProps> = ({ 
  subtask, 
  taskId, 
  goalId, 
  onToggleComplete,
  onUpdateSubtaskSchedule 
}) => {
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  
  const handleToggle = async (checked: boolean) => {
    await onToggleComplete(goalId, taskId, subtask.id, checked);
  };
  
  const handleUpdateDueDate = async (dueDate: string | undefined) => {
    if (onUpdateSubtaskSchedule) {
      await onUpdateSubtaskSchedule(goalId, taskId, subtask.id, { dueDate });
    }
  };

  const handleAddToCalendar = async (add: boolean) => {
    if (onUpdateSubtaskSchedule) {
      await onUpdateSubtaskSchedule(goalId, taskId, subtask.id, { addedToCalendar: add });
    }
  };

  return (
    <li className="flex items-start ml-2 md:ml-4 gap-2 md:gap-3 p-1.5 hover:bg-gray-50 rounded-lg group">
      <div className="flex-shrink-0 mt-0.5">
        <Checkbox
          id={`subtask-${subtask.id}`}
          checked={subtask.completed}
          onCheckedChange={handleToggle}
          className="w-4 h-4 border-2 border-gray-300 rounded data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
        />
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex flex-col">
          <div className="flex justify-between items-start gap-2">
            <label
              htmlFor={`subtask-${subtask.id}`}
              className={`text-gray-700 cursor-pointer break-words ${
                subtask.completed ? 'line-through text-gray-400' : ''
              }`}
            >
              {subtask.title}
            </label>
            
            {/* Actions for mobile - always visible */}
            <div className="flex-shrink-0 md:hidden flex items-center space-x-1">
              {onUpdateSubtaskSchedule && (
                <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="p-1 text-gray-500 hover:text-purple-600 rounded" title="Schedule Subtask">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
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
                  <DialogContent className="w-[90vw] md:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Schedule Subtask</DialogTitle>
                    </DialogHeader>
                    <TaskScheduler 
                      task={{ ...subtask, subtasks: [] } as any}
                      subtask={subtask}
                      onUpdateDueDate={handleUpdateDueDate}
                      onAddToCalendar={handleAddToCalendar}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {/* Time estimate for subtask */}
            {subtask.estimatedMinutes && (
              <span className="flex items-center text-blue-600 text-xs">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 mr-1 flex-shrink-0" 
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
                <span className="truncate">{subtask.estimatedMinutes} min</span>
              </span>
            )}
            
            {/* Due date information */}
            {subtask.dueDate && (
              <span className="flex items-center text-purple-600 text-xs">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 mr-1 flex-shrink-0" 
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
                <span className="truncate">{format(new Date(subtask.dueDate), 'MMM d')}</span>
              </span>
            )}
            
            {/* Calendar status */}
            {subtask.addedToCalendar && (
              <span className="flex items-center text-green-600 text-xs">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 mr-1 flex-shrink-0" 
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
                <span className="truncate">Calendar</span>
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Desktop actions - visible on hover */}
      <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity items-center space-x-1">
        {onUpdateSubtaskSchedule && (
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <button className="p-1 text-gray-400 hover:text-purple-600 rounded" title="Schedule Subtask">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
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
                <DialogTitle>Schedule Subtask</DialogTitle>
              </DialogHeader>
              <TaskScheduler 
                task={{ ...subtask, subtasks: [] } as any}
                subtask={subtask}
                onUpdateDueDate={handleUpdateDueDate}
                onAddToCalendar={handleAddToCalendar}
              />
            </DialogContent>
          </Dialog>
        )}
        
        <button className="p-1 text-gray-400 hover:text-gray-700 rounded" title="Edit Subtask">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
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
    </li>
  );
};

export default SubtaskItem;

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import SubtaskItem from './SubtaskItem';
import { Task } from '../types';

interface TaskItemProps {
  task: Task;
  goalId: number;
  onToggleTaskComplete: (goalId: number, taskId: string, completed: boolean) => Promise<void>;
  onToggleSubtaskComplete: (goalId: number, taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  goalId,
  onToggleTaskComplete,
  onToggleSubtaskComplete,
}) => {
  const handleToggle = async (checked: boolean) => {
    await onToggleTaskComplete(goalId, task.id, checked);
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
            
            {/* Time and Complexity Information */}
            <div className="flex items-center space-x-3 mt-1 text-xs">
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
                />
              ))}
            </ul>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
          <button className="p-1 text-gray-400 hover:text-gray-700 rounded">
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

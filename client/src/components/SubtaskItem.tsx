import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Subtask } from '../types';

interface SubtaskItemProps {
  subtask: Subtask;
  taskId: string;
  goalId: number;
  onToggleComplete: (goalId: number, taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ subtask, taskId, goalId, onToggleComplete }) => {
  const handleToggle = async (checked: boolean) => {
    await onToggleComplete(goalId, taskId, subtask.id, checked);
  };

  return (
    <li className="flex items-start ml-4 space-x-3 p-1.5 hover:bg-gray-50 rounded-lg group">
      <div className="flex-shrink-0 mt-0.5">
        <Checkbox
          id={`subtask-${subtask.id}`}
          checked={subtask.completed}
          onCheckedChange={handleToggle}
          className="w-4 h-4 border-2 border-gray-300 rounded data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
        />
      </div>
      <label
        htmlFor={`subtask-${subtask.id}`}
        className={`text-gray-700 cursor-pointer flex-grow ${
          subtask.completed ? 'line-through text-gray-400' : ''
        }`}
      >
        {subtask.title}
      </label>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1 text-gray-400 hover:text-gray-700 rounded">
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

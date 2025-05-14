import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import TaskItem from './TaskItem';
import ProgressUpdateForm from './ProgressUpdateForm';
import RoadblockForm from './RoadblockForm';
import { RoadblockTips } from './AICoach';
import { Goal } from '../types';

interface TaskResultsProps {
  goal: Goal;
  onDeleteGoal: (id: number) => Promise<void>;
  onToggleTaskComplete: (goalId: number, taskId: string, completed: boolean) => Promise<void>;
  onToggleSubtaskComplete: (goalId: number, taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
}

const TaskResults: React.FC<TaskResultsProps> = ({
  goal,
  onDeleteGoal,
  onToggleTaskComplete,
  onToggleSubtaskComplete,
}) => {
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      await onDeleteGoal(goal.id);
    }
  };

  const completedTasks = goal.tasks.filter(task => task.completed).length;
  const totalTasks = goal.tasks.length;

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden mb-6 transition-all duration-300 hover:shadow-lg">
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{goal.title}</h3>
            <div className="flex items-center mt-2">
              <Progress value={goal.progress} className="w-32 h-1.5 mr-2" />
              <span className="text-xs text-gray-500">{goal.progress}% complete</span>
            </div>
            
            {/* Display time estimates and constraints */}
            <div className="flex flex-wrap items-center mt-2 gap-2">
              {goal.totalEstimatedMinutes && (
                <div className="flex items-center text-blue-600 text-xs">
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
                  <span>Total: {goal.totalEstimatedMinutes} min</span>
                </div>
              )}
              
              {goal.timeConstraintMinutes && (
                <div className="flex items-center text-purple-600 text-xs">
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
                  <span>Time Constraint: {goal.timeConstraintMinutes} min</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100"
              title="Edit Goal"
            >
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
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100"
              title="Delete Goal"
              onClick={handleDelete}
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Accountability buttons */}
      <div className="flex flex-wrap gap-2 pt-3 px-5 pb-0 border-b border-gray-100">
        <ProgressUpdateForm goalId={goal.id} goalTitle={goal.title} />
        <RoadblockForm goalId={goal.id} goalTitle={goal.title} />
      </div>
      
      <CardContent className="p-5">
        {/* Display progress updates if available */}
        {goal.lastProgressUpdate && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-700 mb-1">Latest Progress Update:</h4>
            <p className="text-sm text-blue-600">{goal.lastProgressUpdate}</p>
          </div>
        )}
        
        {/* Display roadblocks if available */}
        {goal.roadblocks && (
          <div className="mb-4">
            <div className="p-3 bg-red-50 rounded-lg border border-red-100 mb-2">
              <h4 className="text-sm font-medium text-red-700 mb-1">Roadblock Reported:</h4>
              <p className="text-sm text-red-600">{goal.roadblocks}</p>
            </div>
            <RoadblockTips goalId={goal.id} />
          </div>
        )}
        
        {/* Display additional information if available */}
        {goal.additionalInfo && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Additional Information:</h4>
            <p className="text-sm text-gray-600">{goal.additionalInfo}</p>
          </div>
        )}
        
        <ul className="space-y-3">
          {goal.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              goalId={goal.id}
              onToggleTaskComplete={onToggleTaskComplete}
              onToggleSubtaskComplete={onToggleSubtaskComplete}
            />
          ))}
        </ul>

        {/* Add Task Button */}
        <Button
          variant="ghost"
          className="mt-4 flex items-center text-primary hover:text-blue-700 text-sm font-medium"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Task
        </Button>
      </CardContent>
    </Card>
  );
};

export default TaskResults;

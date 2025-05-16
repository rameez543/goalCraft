import React from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Clock, Edit, MoreHorizontal, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TaskOptionsDropdownProps {
  goalId: number;
  task: any;
  onEdit: () => void;
}

const TaskOptionsDropdown: React.FC<TaskOptionsDropdownProps> = ({ 
  goalId,
  task,
  onEdit
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateTask = (updates: Partial<any>) => {
    const updatedTasks = task.goal.tasks.map((t: any) => {
      if (t.id === task.id) {
        return { ...t, ...updates };
      }
      return t;
    });

    apiRequest("PATCH", `/api/goals/${goalId}`, {
      tasks: updatedTasks
    }).then(() => {
      // Use refetchQueries instead of invalidateQueries to prevent unwanted navigation
      queryClient.refetchQueries({ 
        queryKey: ['/api/goals'],
        type: 'active' 
      });
    }).catch(error => {
      console.error("Error updating task:", error);
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    });
  };

  const deleteTask = () => {
    // Remove the task from the goal
    const updatedTasks = task.goal.tasks.filter((t: any) => t.id !== task.id);
    
    // Update the goal with the tasks excluding the removed one
    apiRequest("PATCH", `/api/goals/${goalId}`, {
      tasks: updatedTasks
    }).then(() => {
      // Use refetchQueries instead of invalidateQueries to prevent unwanted navigation
      queryClient.refetchQueries({ 
        queryKey: ['/api/goals'],
        type: 'active' 
      });
      toast({
        title: "🗑️ Task removed",
        duration: 1500,
      });
    }).catch(error => {
      console.error("Error removing task:", error);
      toast({
        title: "Error removing task",
        description: error.message,
        variant: "destructive",
      });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-6 w-6"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3 w-3 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Set Priority</DropdownMenuLabel>
        
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            updateTask({ complexity: 'high' });
          }}
        >
          <span className="text-red-500 mr-2">😓</span> High Priority
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            updateTask({ complexity: 'medium' });
          }}
        >
          <span className="text-yellow-500 mr-2">😐</span> Medium Priority
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            updateTask({ complexity: 'low' });
          }}
        >
          <span className="text-green-500 mr-2">😌</span> Low Priority
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Time Estimate</DropdownMenuLabel>
        
        {[15, 30, 60].map(minutes => (
          <DropdownMenuItem
            key={minutes}
            onClick={(e) => {
              e.stopPropagation();
              updateTask({ estimatedMinutes: minutes });
            }}
          >
            <Clock className="h-4 w-4 mr-2" /> {minutes} minutes
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            const customTime = prompt("Enter time in minutes:");
            if (customTime) {
              const minutes = parseInt(customTime);
              if (!isNaN(minutes) && minutes > 0) {
                updateTask({ estimatedMinutes: minutes });
              }
            }
          }}
        >
          <Clock className="h-4 w-4 mr-2" /> Custom time...
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit className="h-4 w-4 mr-2" /> Edit Task
        </DropdownMenuItem>
        
        <DropdownMenuItem
          className="text-red-500"
          onClick={(e) => {
            e.stopPropagation();
            deleteTask();
          }}
        >
          <X className="h-4 w-4 mr-2" /> Delete Task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TaskOptionsDropdown;
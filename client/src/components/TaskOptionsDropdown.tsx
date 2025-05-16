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
import { Clock, Edit, MessageCircle, MoreHorizontal, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TaskOptionsDropdownProps {
  goalId: number;
  taskId: string;
  onEdit?: () => void;
  onDiscuss?: () => void;
}

const TaskOptionsDropdown: React.FC<TaskOptionsDropdownProps> = ({ 
  goalId,
  taskId,
  onEdit,
  onDiscuss
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await apiRequest("PATCH", `/api/tasks/edit`, {
        goalId,
        taskId,
        delete: true
      });

      toast({
        title: "Task deleted",
        description: "The task has been removed",
      });

      // Use invalidate then refetch to ensure data is fresh without losing place
      await queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.refetchQueries({ 
        queryKey: ['/api/goals'],
        type: 'all'
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error deleting task",
        description: "Failed to delete the task",
        variant: "destructive"
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0" 
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Task options</DropdownMenuLabel>
        
        {onDiscuss && (
          <DropdownMenuItem onClick={onDiscuss}>
            <MessageCircle className="mr-2 h-4 w-4" />
            <span>Discuss with AI</span>
          </DropdownMenuItem>
        )}
        
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="text-red-600 focus:text-red-600" 
          onClick={handleDelete}
        >
          <X className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TaskOptionsDropdown;
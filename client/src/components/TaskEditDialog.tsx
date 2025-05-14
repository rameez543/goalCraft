import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Task } from "../types";

interface TaskEditDialogProps {
  goalId: number;
  task: Task;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const TaskEditDialog: React.FC<TaskEditDialogProps> = ({
  goalId,
  task,
  onClose,
  onTaskUpdated,
}) => {
  const [title, setTitle] = useState(task.title);
  const [context, setContext] = useState(task.context || "");
  const [actionItems, setActionItems] = useState<string[]>(task.actionItems || []);
  const [newActionItem, setNewActionItem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAddActionItem = () => {
    if (newActionItem.trim()) {
      setActionItems((prev) => [...prev, newActionItem.trim()]);
      setNewActionItem("");
    }
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddActionItem();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the task",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/tasks/edit", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goalId,
          taskId: task.id,
          title,
          context,
          actionItems,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update task");
      }
      
      toast({
        title: "Task updated",
        description: "Task has been successfully updated",
      });
      
      onTaskUpdated();
      onClose();
      
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="context">Context or Description</Label>
        <Textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Add any helpful context or description for this task"
          rows={4}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Action Items</Label>
        <div className="flex space-x-2">
          <Input
            value={newActionItem}
            onChange={(e) => setNewActionItem(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Add an action item"
            className="flex-1"
          />
          <Button 
            type="button" 
            onClick={handleAddActionItem}
            variant="outline"
            disabled={!newActionItem.trim()}
          >
            Add
          </Button>
        </div>
        
        {actionItems.length > 0 && (
          <ul className="mt-2 space-y-2">
            {actionItems.map((item, index) => (
              <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                <span className="text-sm">{item}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveActionItem(index)}
                  className="h-8 w-8 p-0 text-red-500"
                >
                  <span role="img" aria-label="remove">❌</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};
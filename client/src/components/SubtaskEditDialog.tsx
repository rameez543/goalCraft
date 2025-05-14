import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Subtask } from "../types";

interface SubtaskEditDialogProps {
  goalId: number;
  taskId: string;
  subtask: Subtask;
  onClose: () => void;
  onSubtaskUpdated: () => void;
}

export const SubtaskEditDialog: React.FC<SubtaskEditDialogProps> = ({
  goalId,
  taskId,
  subtask,
  onClose,
  onSubtaskUpdated,
}) => {
  const [title, setTitle] = useState(subtask.title);
  const [context, setContext] = useState(subtask.context || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the subtask",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/subtasks/edit", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goalId,
          taskId,
          subtaskId: subtask.id,
          title,
          context,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update subtask");
      }
      
      toast({
        title: "Subtask updated",
        description: "Subtask has been successfully updated",
      });
      
      onSubtaskUpdated();
      onClose();
      
    } catch (error) {
      console.error("Error updating subtask:", error);
      toast({
        title: "Error",
        description: "Failed to update subtask. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Subtask Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter subtask title"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="context">Context or Description</Label>
        <Textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Add any helpful context or description for this subtask"
          rows={4}
        />
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
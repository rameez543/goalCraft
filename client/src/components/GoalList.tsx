import React from "react";
import { Goal } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MessageCircle, PlusCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GoalListProps {
  goals: Goal[];
  onSelectGoal: (goalId: number) => void;
}

export const GoalList: React.FC<GoalListProps> = ({ goals, onSelectGoal }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createEmptyGoalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/goals", {
        title: "New goal",
        timeConstraintMinutes: 0
      });
      return response.json();
    },
    onSuccess: (newGoal) => {
      // Use refetchQueries instead of invalidateQueries to avoid unwanted navigation
      queryClient.refetchQueries({ 
        queryKey: ['/api/goals'],
        type: 'active' 
      });
      onSelectGoal(newGoal.id);
      toast({
        title: "Goal created",
        description: "Tell your AI coach more details about this goal",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create goal",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  });

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-3">
          <PlusCircle className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-xl mb-2">No goals yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first goal to get started
        </p>
        <Button onClick={() => createEmptyGoalMutation.mutate()} disabled={createEmptyGoalMutation.isPending}>
          {createEmptyGoalMutation.isPending ? "Creating..." : "Create a goal"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <Card key={goal.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectGoal(goal.id)}>
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <h3 className="font-medium">{goal.title}</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGoal(goal.id);
                }}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Progress value={goal.progress} className="h-2" />
              <span className="text-xs font-medium">{goal.progress}%</span>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {goal.tasks.filter(t => t.completed).length} of {goal.tasks.length} tasks completed
            </div>
          </div>
        </Card>
      ))}
      
      <Button 
        variant="outline" 
        className="w-full" 
        onClick={() => createEmptyGoalMutation.mutate()}
        disabled={createEmptyGoalMutation.isPending}
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        Add new goal
      </Button>
    </div>
  );
};
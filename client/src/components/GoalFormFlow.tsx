import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GoalFormFlowProps {
  onComplete: (goalId: number) => void;
}

export const GoalFormFlow: React.FC<GoalFormFlowProps> = ({ onComplete }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form stages
  const [stage, setStage] = useState<'goal' | 'routine' | 'roadblocks' | 'preferences'>('goal');
  
  // Form data
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [timeConstraint, setTimeConstraint] = useState<number | null>(null);
  const [dailyRoutine, setDailyRoutine] = useState("");
  const [knownRoadblocks, setKnownRoadblocks] = useState("");
  const [preferredTime, setPreferredTime] = useState<'morning' | 'afternoon' | 'evening' | 'flexible'>('flexible');
  const [adhd, setAdhd] = useState<boolean>(false);
  const [notificationPreference, setNotificationPreference] = useState<'email' | 'inapp' | 'both'>('inapp');
  
  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async () => {
      // Combine all the collected information
      const goalData = {
        title: goalTitle,
        additionalInfo: `
Description: ${goalDescription}

Daily Routine: ${dailyRoutine}

Known Roadblocks: ${knownRoadblocks}

Preferences:
- Preferred Time: ${preferredTime}
- ADHD Accommodations: ${adhd ? 'Yes' : 'No'}
- Notification Preference: ${notificationPreference}
        `,
        timeConstraintMinutes: timeConstraint || 0,
        notificationChannels: notificationPreference === 'both' 
          ? ['email', 'inapp'] 
          : [notificationPreference]
      };
      
      const response = await apiRequest("POST", "/api/goals", goalData);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      toast({
        title: "Goal created!",
        description: "Your personalized plan is ready. Let's get started!",
      });
      onComplete(data.id);
    },
    onError: (error) => {
      toast({
        title: "Failed to create goal",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    }
  });

  // Handle form submission for each stage
  const handleNextStage = () => {
    if (stage === 'goal') {
      if (!goalTitle.trim()) {
        toast({
          title: "Goal title required",
          description: "Please enter what you want to achieve",
          variant: "destructive"
        });
        return;
      }
      setStage('routine');
    } else if (stage === 'routine') {
      setStage('roadblocks');
    } else if (stage === 'roadblocks') {
      setStage('preferences');
    } else if (stage === 'preferences') {
      createGoalMutation.mutate();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {stage === 'goal' && "What would you like to achieve?"}
          {stage === 'routine' && "Tell me about your routine"}
          {stage === 'roadblocks' && "What might get in your way?"}
          {stage === 'preferences' && "Let's personalize your experience"}
        </CardTitle>
        <CardDescription>
          {stage === 'goal' && "I'll help you break this goal down into manageable steps"}
          {stage === 'routine' && "This helps me understand when to schedule tasks"}
          {stage === 'roadblocks' && "Identifying obstacles helps us plan around them"}
          {stage === 'preferences' && "I'll adapt to your needs and preferences"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Goal Information */}
        {stage === 'goal' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="goal-title">Goal Title</Label>
              <Input 
                id="goal-title" 
                placeholder="e.g., Learn to play guitar, Start a morning exercise routine" 
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="goal-description">Brief Description</Label>
              <Textarea 
                id="goal-description" 
                placeholder="Why is this goal important to you? What does success look like?" 
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time-constraint">Time Constraint (optional)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="time-constraint" 
                  type="number" 
                  placeholder="e.g., 30" 
                  value={timeConstraint || ""}
                  onChange={(e) => setTimeConstraint(e.target.value ? parseInt(e.target.value) : null)}
                />
                <span>minutes per day</span>
              </div>
              <p className="text-xs text-muted-foreground">How much time can you dedicate to this goal each day?</p>
            </div>
          </>
        )}
        
        {/* Routine Information */}
        {stage === 'routine' && (
          <div className="space-y-2">
            <Label htmlFor="daily-routine">Your Typical Day</Label>
            <Textarea 
              id="daily-routine" 
              placeholder="Briefly describe your typical daily schedule. When do you wake up? When do you work? When do you have free time?" 
              value={dailyRoutine}
              onChange={(e) => setDailyRoutine(e.target.value)}
              className="min-h-[150px]"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">This helps me suggest tasks that fit into your schedule</p>
          </div>
        )}
        
        {/* Roadblocks */}
        {stage === 'roadblocks' && (
          <div className="space-y-2">
            <Label htmlFor="roadblocks">Potential Obstacles</Label>
            <Textarea 
              id="roadblocks" 
              placeholder="What challenges do you expect? What has stopped you from achieving similar goals in the past?" 
              value={knownRoadblocks}
              onChange={(e) => setKnownRoadblocks(e.target.value)}
              className="min-h-[150px]"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Being aware of obstacles helps us plan strategies to overcome them</p>
          </div>
        )}
        
        {/* Preferences */}
        {stage === 'preferences' && (
          <>
            <div className="space-y-2">
              <Label>When do you prefer to work on your goals?</Label>
              <RadioGroup value={preferredTime} onValueChange={(value) => setPreferredTime(value as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="morning" id="morning" />
                  <Label htmlFor="morning">Morning</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="afternoon" id="afternoon" />
                  <Label htmlFor="afternoon">Afternoon</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="evening" id="evening" />
                  <Label htmlFor="evening">Evening</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="flexible" id="flexible" />
                  <Label htmlFor="flexible">Flexible</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="adhd" checked={adhd} onCheckedChange={(checked) => setAdhd(!!checked)} />
              <Label htmlFor="adhd">I have ADHD or struggle with focus/attention</Label>
            </div>
            
            <div className="space-y-2 pt-2">
              <Label>How would you like to receive updates?</Label>
              <RadioGroup value={notificationPreference} onValueChange={(value) => setNotificationPreference(value as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email">Email only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inapp" id="inapp" />
                  <Label htmlFor="inapp">In-app notifications only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both">Both email and in-app</Label>
                </div>
              </RadioGroup>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {stage !== 'goal' && (
          <Button 
            variant="outline" 
            onClick={() => {
              if (stage === 'routine') setStage('goal');
              if (stage === 'roadblocks') setStage('routine');
              if (stage === 'preferences') setStage('roadblocks');
            }}
          >
            Back
          </Button>
        )}
        
        <Button 
          onClick={handleNextStage}
          disabled={stage === 'goal' && !goalTitle.trim() || createGoalMutation.isPending}
          className="ml-auto"
        >
          {createGoalMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating your plan...
            </>
          ) : stage === 'preferences' ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Create my plan
            </>
          ) : (
            <>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
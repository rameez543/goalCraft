import React, { useState, useEffect } from "react";
import { CoachAvatar } from "@/components/CoachAvatar";
import { ChatInterface } from "@/components/ChatInterface";
import { GoalFormFlow } from "@/components/GoalFormFlow";
import { Goal } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Loader2, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  MessageCircle, 
  Plus, 
  Sparkles, 
  Star, 
  Trophy, 
  Users, 
  ListTodo,
  PanelLeftOpen,
  Lightbulb,
  ThumbsUp
} from "lucide-react";

const NewDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [coachMood, setCoachMood] = useState<"happy" | "thinking" | "encouraging" | "concerned" | "proud">("happy");
  const [coachMessage, setCoachMessage] = useState<string>("");
  const [currentTab, setCurrentTab] = useState<string>("today");
  
  // Fetch user's goals
  const { data: goals, isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    enabled: !!user
  });
  
  // Get selected goal
  const selectedGoal = selectedGoalId ? goals?.find(g => g.id === selectedGoalId) : null;
  
  // Fetch coaching message
  const { data: coachingData, isLoading: isLoadingCoaching } = useQuery<{ message: string, type: string }>({
    queryKey: ['/api/coach/message'],
    enabled: !!user && !!goals?.length,
    refetchOnWindowFocus: false,
    refetchInterval: 3600000 // Refresh every hour
  });
  
  // Update coach message and mood based on coaching data
  useEffect(() => {
    if (coachingData?.message) {
      setCoachMessage(coachingData.message);
      
      // Set mood based on message type
      if (coachingData.type === 'encouragement') {
        setCoachMood('encouraging');
      } else if (coachingData.type === 'tip') {
        setCoachMood('thinking');
      } else if (coachingData.type === 'congratulation') {
        setCoachMood('proud');
      } else if (coachingData.type === 'milestone') {
        setCoachMood('happy');
      }
    }
  }, [coachingData]);
  
  // Toggle task completion
  const taskCompletionMutation = useMutation({
    mutationFn: async ({ goalId, taskId, completed }: { goalId: number, taskId: string, completed: boolean }) => {
      const response = await apiRequest("PATCH", "/api/tasks", {
        goalId,
        taskId,
        completed
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      
      // Show celebration for completion
      if (!selectedGoal) return;
      
      const allTasksCompleted = selectedGoal.tasks.every(task => task.completed);
      
      if (allTasksCompleted) {
        toast({
          title: "🎉 Goal Complete!",
          description: "Congratulations! You've completed all tasks for this goal!"
        });
        setCoachMood("proud");
        setCoachMessage("Amazing job! You've completed all tasks for this goal. I'm so proud of you!");
      } else {
        toast({
          title: "✅ Task updated",
          description: "Your progress has been saved"
        });
      }
    }
  });
  
  // Get today's tasks across all goals
  const getTodaysTasks = () => {
    if (!goals) return [];
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todaysTasks: { goalId: number, goalTitle: string, task: any }[] = [];
    
    goals.forEach(goal => {
      goal.tasks.forEach(task => {
        // Include task if due today or overdue and not completed
        if (task.dueDate && task.dueDate.startsWith(today) && !task.completed) {
          todaysTasks.push({
            goalId: goal.id,
            goalTitle: goal.title,
            task
          });
        }
      });
    });
    
    return todaysTasks;
  };
  
  // Calculate user streak based on task completions
  const getUserStreak = () => {
    if (!goals || !goals.length) return 0;
    
    // This is a simplified version - in a real app, you'd track daily activity
    // For this demo, we'll just count completed tasks as a proxy for streaks
    const totalCompletedTasks = goals.reduce((sum, goal) => {
      return sum + goal.tasks.filter(t => t.completed).length;
    }, 0);
    
    return Math.min(Math.max(1, Math.floor(totalCompletedTasks / 3)), 99); // Cap at 99
  };
  
  // Handle goal creation completion
  const handleGoalCreated = (goalId: number) => {
    setIsCreatingGoal(false);
    setSelectedGoalId(goalId);
    setCurrentTab("chat");
  };
  
  return (
    <div className="container mx-auto py-4 px-4 md:px-8">
      {/* Header with coach avatar */}
      <div className="mb-6">
        <CoachAvatar
          userName={user?.username}
          mood={coachMood}
          lastMessage={coachMessage || undefined}
          isTyping={isLoadingCoaching}
          selectedGoal={selectedGoal || undefined}
          currentStreak={getUserStreak()}
        />
      </div>
      
      {/* Main content area */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="today" className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>Today</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              <span>Goals</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span>Coach Chat</span>
            </TabsTrigger>
          </TabsList>
          
          <Button variant="outline" size="sm" onClick={() => setIsCreatingGoal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>
        
        {/* Today's Tasks Tab */}
        <TabsContent value="today" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight">Today's Tasks</h2>
            <Badge className="bg-primary">{getTodaysTasks().length} tasks</Badge>
          </div>
          
          {isLoadingGoals ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : getTodaysTasks().length === 0 ? (
            <Card>
              <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">No tasks scheduled for today</h3>
                <p className="text-muted-foreground max-w-md">
                  You don't have any tasks scheduled for today. Talk with your coach to create a plan or
                  check your goals to schedule some tasks.
                </p>
                <Button className="mt-4" onClick={() => setCurrentTab("chat")}>
                  Chat with coach
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {getTodaysTasks().map(({ goalId, goalTitle, task }) => (
                <Card key={task.id} className="overflow-hidden">
                  <div className="flex items-center p-4">
                    <div className="flex items-center gap-4 flex-1">
                      <Checkbox 
                        checked={task.completed}
                        onCheckedChange={(checked) => {
                          taskCompletionMutation.mutate({
                            goalId,
                            taskId: task.id,
                            completed: !!checked
                          });
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">
                          From: {goalTitle}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {task.estimatedMinutes && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.estimatedMinutes} min
                        </Badge>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedGoalId(goalId);
                            setCurrentTab("chat");
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            
                            // Delete the task
                            taskCompletionMutation.mutate({
                              goalId,
                              taskId: task.id,
                              completed: true,
                            }, {
                              onSuccess: () => {
                                toast({
                                  title: "Task removed",
                                  description: "The task has been marked as completed and removed from your list",
                                });
                              }
                            });
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          {goals && goals.length > 0 && (
            <div className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Goal Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {goals.map(goal => (
                    <div key={goal.id} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium">{goal.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {goal.tasks.filter(t => t.completed).length}/{goal.tasks.length}
                        </div>
                      </div>
                      <Progress value={goal.progress || 0} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        {/* Goals Tab */}
        <TabsContent value="goals">
          {isLoadingGoals ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : goals && goals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {goals.map(goal => (
                <Card 
                  key={goal.id} 
                  className={`overflow-hidden transition-all hover:shadow-md cursor-pointer ${
                    selectedGoalId === goal.id ? 'border-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedGoalId(goal.id);
                    setCurrentTab("chat");
                  }}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg">{goal.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <Progress value={goal.progress || 0} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{goal.tasks.filter(t => t.completed).length}/{goal.tasks.length} Tasks</span>
                      <span>{goal.progress || 0}% Complete</span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-2 border-t bg-muted/50 flex justify-between">
                    <Button variant="ghost" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      // Open a dialog to show goal details
                    }}>
                      <PanelLeftOpen className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGoalId(goal.id);
                        setCurrentTab("chat");
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Discuss
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">No goals yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Let's start by creating your first goal. I'll help you break it down into manageable tasks.
                </p>
                <Button className="mt-4" onClick={() => setIsCreatingGoal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create my first goal
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Coach Chat Tab */}
        <TabsContent value="chat" className="relative min-h-[60vh]">
          {selectedGoal ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {selectedGoal.title}
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedGoalId(null)}
                >
                  Change goal
                </Button>
              </div>
              
              <ChatInterface 
                goalId={selectedGoal.id} 
                initialMessage={`Let's talk about your goal "${selectedGoal.title}". How can I help you make progress today?`}
              />
            </div>
          ) : isLoadingGoals ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : goals && goals.length > 0 ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <h2 className="text-xl font-semibold mb-2">Select a goal to discuss</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Choose one of your goals to chat with your coach about specific tasks and get help.
                </p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {goals.map(goal => (
                  <Card 
                    key={goal.id} 
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setSelectedGoalId(goal.id)}
                  >
                    <CardContent className="p-4">
                      <div className="font-medium">{goal.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {goal.tasks.filter(t => t.completed).length}/{goal.tasks.length} tasks completed
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground mb-2">Or start a new goal</p>
                <Button onClick={() => setIsCreatingGoal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Goal
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md mx-auto space-y-4"
              >
                <div className="rounded-full bg-primary/10 p-4 inline-block">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Welcome to your AI Coach</h2>
                <p className="text-muted-foreground">
                  I'll help you achieve your goals by breaking them down into manageable tasks
                  and providing support along the way.
                </p>
                <Button size="lg" onClick={() => setIsCreatingGoal(true)}>
                  Get Started
                </Button>
              </motion.div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Goal Creation Dialog */}
      <Dialog open={isCreatingGoal} onOpenChange={setIsCreatingGoal}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Create a New Goal</DialogTitle>
          <DialogDescription>
            I'll help you break this goal down into manageable steps.
          </DialogDescription>
          <GoalFormFlow onComplete={handleGoalCreated} />
        </DialogContent>
      </Dialog>
      
      {/* Motivation cards shown on the dashboard */}
      {currentTab === "today" && goals && goals.length > 0 && (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-2">
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium">ADHD Tip</h3>
                <p className="text-sm text-muted-foreground">
                  Use the Pomodoro technique: 25 minutes of focus, then a 5-minute break.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-2">
                <ThumbsUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-medium">You've got this!</h3>
                <p className="text-sm text-muted-foreground">
                  Taking small steps consistently leads to big achievements.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-purple-100 dark:bg-purple-900/50 p-2">
                <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium">Did you know?</h3>
                <p className="text-sm text-muted-foreground">
                  Celebrating small wins boosts motivation and productivity.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default NewDashboard;
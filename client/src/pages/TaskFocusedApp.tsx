import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Goal } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, Calendar, Check, ChevronDown, ChevronRight, 
  Clock, Edit, Loader2, MessageCircle, MoreHorizontal, Plus, 
  Send, Star, X 
} from "lucide-react";
import TaskOptionsDropdown from "@/components/TaskOptionsDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Message interface
interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  isTaskCreation?: boolean;
  goalId?: number;
}

export default function TaskFocusedApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Chat state
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hi there! I'm your AI task coach. How can I help you today?",
      sender: "ai",
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Goal collapse state
  const [collapsedGoals, setCollapsedGoals] = useState<Record<number, boolean>>({});
  
  // Modal state
  const [chatOpen, setChatOpen] = useState(false);
  const [goalDescription, setGoalDescription] = useState("");
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{
    goalId: number;
    taskId: string;
    title: string;
  } | null>(null);
  
  // Goal edit state
  const [editGoalId, setEditGoalId] = useState<number | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState("");
  const [editGoalModalOpen, setEditGoalModalOpen] = useState(false);
  
  // Goal delete state
  const [deleteGoalId, setDeleteGoalId] = useState<number | null>(null);
  const [deleteGoalModalOpen, setDeleteGoalModalOpen] = useState(false);
  
  // Conversation history for AI context retention
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  
  // Fetch user's goals
  const { data: goals = [], isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    enabled: !!user,
    refetchOnWindowFocus: false
  });
  
  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/coach/chat", {
        message: content,
        conversationHistory: conversationHistory
      });
    },
    onMutate: (content) => {
      // Add user message immediately
      const newMessage: Message = {
        id: Date.now().toString(),
        content,
        sender: "user",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      
      // Update conversation history for context retention
      setConversationHistory(prev => [...prev, { role: 'user', content }]);
      
      setInput("");
      setIsTyping(true);
    },
    onSuccess: async (response) => {
      try {
        const data = await response.json();
        
        const aiMessage: Message = {
          id: Date.now().toString(),
          content: data.message,
          sender: "ai",
          timestamp: new Date(),
          isTaskCreation: data.tasksCreated,
          goalId: data.tasksCreated ? goals.find(g => 
            g.tasks.some(t => data.relatedTasks?.includes(t.title))
          )?.id : undefined
        };
        
        // Add to the UI messages
        setMessages(prev => [...prev, aiMessage]);
        
        // Update conversation history with AI response for context retention
        setConversationHistory(prev => [...prev, { role: 'assistant', content: data.message }]);
        
        // If new tasks were created, refresh goals data
        if (data.tasksCreated) {
          await queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
          queryClient.refetchQueries({ 
            queryKey: ['/api/goals'],
            type: 'all'
          });
        }
      } catch (error) {
        console.error("Failed to parse response:", error);
        toast({
          title: "Error",
          description: "Failed to parse AI response",
          variant: "destructive"
        });
      } finally {
        setIsTyping(false);
      }
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      setIsTyping(false);
    }
  });
  
  // Task completion mutation with optimistic updates and debounced server communication
  const toggleTaskCompletion = useMutation({
    mutationFn: async ({ goalId, taskId, completed }: { goalId: number; taskId: string; completed: boolean }) => {
      return await apiRequest("PATCH", "/api/tasks", {
        goalId,
        taskId,
        completed
      });
    },
    onMutate: async ({ goalId, taskId, completed }) => {
      // Cancel any outgoing refetches to prevent UI flicker
      await queryClient.cancelQueries({ queryKey: ['/api/goals'] });
      
      // Save the previous value for potential rollback
      const previousGoals = queryClient.getQueryData<Goal[]>(['/api/goals']);
      
      // Optimistically update goals in UI immediately
      if (previousGoals) {
        const newGoals = previousGoals.map(goal => {
          if (goal.id === goalId) {
            // Calculate new progress based on task completion status
            const updatedTasks = goal.tasks.map(task => {
              if (task.id === taskId) {
                return { ...task, completed };
              }
              return task;
            });
            
            // Update the goal's progress calculation directly in the optimistic update
            const completedTaskCount = updatedTasks.filter(t => t.completed).length;
            const totalTasks = updatedTasks.length;
            const newProgress = totalTasks > 0 ? Math.round((completedTaskCount / totalTasks) * 100) : 0;
            
            return {
              ...goal,
              tasks: updatedTasks,
              progress: newProgress
            };
          }
          return goal;
        });
        
        // Update the UI immediately
        queryClient.setQueryData(['/api/goals'], newGoals);
      }
      
      // Return the previous value for potential rollback
      return { previousGoals };
    },
    onError: (error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousGoals) {
        queryClient.setQueryData(['/api/goals'], context.previousGoals);
      }
      
      console.error("Error toggling task completion:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Use a slight delay before refetching to prevent UI jank
      // This creates a smooth experience while ensuring eventual consistency
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      }, 700); // Short delay that won't be noticeable but prevents rapid refetches
    }
  });
  
  // Subtask completion mutation with enhanced optimistic updates for better performance
  const toggleSubtaskCompletion = useMutation({
    mutationFn: async ({ 
      goalId, 
      taskId, 
      subtaskId, 
      completed 
    }: { 
      goalId: number; 
      taskId: string; 
      subtaskId: string; 
      completed: boolean 
    }) => {
      return await apiRequest("PATCH", "/api/subtasks", {
        goalId,
        taskId,
        subtaskId,
        completed
      });
    },
    onMutate: async ({ goalId, taskId, subtaskId, completed }) => {
      // Cancel any outgoing refetches to prevent UI flicker
      await queryClient.cancelQueries({ queryKey: ['/api/goals'] });
      
      // Save previous state for potential rollback
      const previousGoals = queryClient.getQueryData<Goal[]>(['/api/goals']);
      
      // Apply optimistic update immediately to make UI responsive
      if (previousGoals) {
        const newGoals = previousGoals.map(goal => {
          if (goal.id === goalId) {
            // Create updated tasks with the subtask change
            const updatedTasks = goal.tasks.map(task => {
              if (task.id === taskId) {
                const updatedSubtasks = task.subtasks?.map(subtask => {
                  if (subtask.id === subtaskId) {
                    return { ...subtask, completed };
                  }
                  return subtask;
                });
                
                // Check if all subtasks are completed to maybe update parent task completion
                const allSubtasksCompleted = updatedSubtasks?.every(st => st.completed) || false;
                
                return {
                  ...task,
                  // Update subtasks array
                  subtasks: updatedSubtasks,
                  // Optionally update parent task status if all subtasks completed
                  ...(allSubtasksCompleted && updatedSubtasks && updatedSubtasks.length > 0 
                    ? { completed: true } 
                    : {})
                };
              }
              return task;
            });
            
            // Recalculate goal progress based on all task completions
            const completedTaskCount = updatedTasks.filter(t => t.completed).length;
            const totalTasks = updatedTasks.length;
            const newProgress = totalTasks > 0 ? Math.round((completedTaskCount / totalTasks) * 100) : 0;
            
            return {
              ...goal,
              tasks: updatedTasks,
              progress: newProgress
            };
          }
          return goal;
        });
        
        // Update UI immediately
        queryClient.setQueryData(['/api/goals'], newGoals);
      }
      
      return { previousGoals };
    },
    onError: (error, variables, context) => {
      // Restore previous state on error
      if (context?.previousGoals) {
        queryClient.setQueryData(['/api/goals'], context.previousGoals);
      }
      
      console.error("Error toggling subtask completion:", error);
      toast({
        title: "Error",
        description: "Failed to update subtask",
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Use a minimal delay to prevent excessive network requests while 
      // ensuring data consistency with the server
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      }, 500);
    }
  });
  
  // Create goal mutation
  const createGoal = useMutation({
    mutationFn: async (title: string) => {
      return await apiRequest("POST", "/api/goals", {
        title
      });
    },
    onSuccess: async () => {
      setGoalDescription("");
      setGoalModalOpen(false);
      
      toast({
        title: "Goal created",
        description: "Your goal has been created",
      });
      
      // Refresh goals data
      await queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
    },
    onError: (error) => {
      console.error("Error creating goal:", error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive"
      });
    }
  });
  
  // Edit goal mutation
  const editGoal = useMutation({
    mutationFn: async ({ id, title }: { id: number, title: string }) => {
      console.log("Updating goal:", id, title);
      return await apiRequest("PATCH", `/api/goals/${id}`, {
        title: title
      });
    },
    onSuccess: async () => {
      setEditGoalTitle("");
      setEditGoalId(null);
      setEditGoalModalOpen(false);
      
      toast({
        title: "Goal updated",
        description: "Your goal has been updated",
      });
      
      // Refresh goals data
      await queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
    },
    onError: (error) => {
      console.error("Error updating goal:", error);
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive"
      });
    }
  });
  
  // Delete goal mutation
  const deleteGoal = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: async () => {
      setDeleteGoalId(null);
      setDeleteGoalModalOpen(false);
      
      toast({
        title: "Goal deleted",
        description: "Your goal has been removed",
      });
      
      // Refresh goals data
      await queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
    },
    onError: (error) => {
      console.error("Error deleting goal:", error);
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive"
      });
    }
  });
  
  // Get priority emoji based on complexity
  const getPriorityEmoji = (complexity: string | undefined, completed: boolean = false) => {
    // If the task is completed, show a different emoji
    if (completed) {
      return "✅";
    }
    
    // Based on complexity level
    switch (complexity?.toLowerCase()) {
      case 'high':
        return "🔥"; // Difficult/high priority
      case 'medium':
        return "⚡"; // Medium difficulty
      case 'low':
        return "🌱"; // Easy/low priority
      default:
        return "📋"; // Default/unknown
    }
  };
  
  // Get emoji for goals
  const getGoalEmoji = (progress: number | null) => {
    if (progress === 100) {
      return "🏆"; // Completed goal
    } else if (progress && progress > 75) {
      return "🚀"; // Almost there
    } else if (progress && progress > 50) {
      return "🔄"; // Good progress
    } else if (progress && progress > 25) {
      return "🌟"; // Started progress
    } else {
      return "🎯"; // New goal
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };
  
  // Calculate all tasks for today's view
  const todaysTasks = goals.flatMap(goal => 
    goal.tasks
      .filter(task => !task.completed)
      .map(task => ({ ...task, goalId: goal.id, goalTitle: goal.title }))
  ).sort((a, b) => {
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (
      (priorityOrder[a.complexity?.toLowerCase() as keyof typeof priorityOrder] || 3) -
      (priorityOrder[b.complexity?.toLowerCase() as keyof typeof priorityOrder] || 3)
    );
  });
  
  // Handle task click in chat
  const handleTaskClick = (goalId: number) => {
    // Switch to the goals tab
    const tabsElement = document.querySelector('[role="tablist"]');
    const goalsTabButton = tabsElement?.querySelector('[value="goals"]');
    if (goalsTabButton instanceof HTMLElement) {
      goalsTabButton.click();
    }
    
    // Scroll to and highlight the goal
    setTimeout(() => {
      const goalElement = document.getElementById(`goal-${goalId}`);
      if (goalElement) {
        goalElement.scrollIntoView({ behavior: 'smooth' });
        goalElement.classList.add('highlight-goal');
        setTimeout(() => {
          goalElement.classList.remove('highlight-goal');
        }, 2000);
      }
    }, 100);
  };
  
  return (
    <div className="flex flex-col h-full min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      {/* Header/Nav */}
      <header className="bg-white/95 backdrop-blur shadow-sm border-b py-3 px-4 sm:px-6 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-purple-500" />
            <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">TaskBreaker</h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile menu button for small screens */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChatOpen(true)}
                className="mr-1"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Desktop buttons for larger screens */}
            <div className="hidden md:block">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-1"
              >
                <MessageCircle className="h-4 w-4" />
                <span>AI Coach</span>
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGoalModalOpen(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Goal</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatar.png" />
                  <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main task area */}
        <div className="flex-1 overflow-y-auto p-4 bg-transparent backdrop-blur-[2px]">
          <Tabs defaultValue="today" className="space-y-4">
            <div className="flex justify-between items-center">
              <TabsList className="bg-white/80 backdrop-blur border shadow-sm rounded-full">
                <TabsTrigger value="today" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-full">
                  ⚡ Today
                </TabsTrigger>
                <TabsTrigger value="goals" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-full">
                  🎯 My Goals
                </TabsTrigger>
              </TabsList>
              
              {/* Status info */}
              <div className="text-sm text-gray-500">
                {goals.length > 0 ? (
                  <span>
                    {todaysTasks.length} tasks remaining
                  </span>
                ) : (
                  <span>No goals yet</span>
                )}
              </div>
            </div>
            
            {/* Today's Tasks */}
            <TabsContent value="today" className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {isLoadingGoals ? (
                  <div className="flex justify-center items-center p-4 sm:p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  </div>
                ) : todaysTasks.length > 0 ? (
                  todaysTasks.map(task => (
                    <div
                      key={`${task.goalId}-${task.id}`}
                      className="bg-white/90 backdrop-blur rounded-xl shadow-sm border p-3 sm:p-4 transition-all hover:shadow-md hover:translate-y-[-2px]"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={() => toggleTaskCompletion.mutate({
                            goalId: task.goalId!,
                            taskId: task.id,
                            completed: !task.completed
                          })}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            task.completed 
                              ? "bg-green-100 border-green-500 text-green-500" 
                              : "border-gray-300 hover:border-purple-400"
                          }`}
                        >
                          {task.completed && <Check className="h-4 w-4" />}
                        </button>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getPriorityEmoji(task.complexity, task.completed)}</span>
                            <h3 className={`text-md font-medium ${task.completed ? "line-through text-gray-400" : ""}`}>
                              {task.title}
                            </h3>
                          </div>
                          <div className="text-xs text-gray-500">
                            From: {task.goalTitle}
                          </div>
                        </div>
                        
                        <TaskOptionsDropdown 
                          goalId={task.goalId!} 
                          taskId={task.id}
                          onDiscuss={() => {
                            setSelectedTask({
                              goalId: task.goalId!,
                              taskId: task.id,
                              title: task.title
                            });
                            setTaskModalOpen(true);
                          }}
                        />
                      </div>
                      
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="ml-8 mt-2 space-y-2">
                          {task.subtasks.map(subtask => (
                            <div key={subtask.id} className="flex items-center gap-2">
                              <button
                                onClick={() => toggleSubtaskCompletion.mutate({
                                  goalId: task.goalId!,
                                  taskId: task.id,
                                  subtaskId: subtask.id,
                                  completed: !subtask.completed
                                })}
                                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  subtask.completed 
                                    ? "bg-green-100 border-green-500 text-green-500" 
                                    : "border-gray-300 hover:border-purple-400"
                                }`}
                              >
                                {subtask.completed && <Check className="h-3 w-3" />}
                              </button>
                              <span className={`text-sm ${subtask.completed ? "line-through text-gray-400" : ""}`}>
                                {subtask.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg p-8 text-center border">
                    <div className="text-5xl mb-4">🎉</div>
                    <h3 className="text-xl font-medium mb-2">All caught up!</h3>
                    <p className="text-gray-500 mb-4">You've completed all your tasks for today.</p>
                    <Button onClick={() => setGoalModalOpen(true)}>Create a new goal</Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Goals View */}
            <TabsContent value="goals" className="space-y-3 sm:space-y-4">
              {isLoadingGoals ? (
                <div className="flex justify-center items-center p-4 sm:p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : goals.length > 0 ? (
                goals.map((goal) => (
                  <div 
                    key={goal.id}
                    id={`goal-${goal.id}`}
                    className="bg-white/90 backdrop-blur rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md hover:translate-y-[-2px]"
                  >
                    <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <button 
                            onClick={() => setCollapsedGoals(prev => ({
                              ...prev, 
                              [goal.id]: !prev[goal.id]
                            }))}
                            className="mr-2 text-gray-500 hover:text-purple-600 transition-colors"
                          >
                            {collapsedGoals[goal.id] ? 
                              <ChevronRight className="h-5 w-5" /> : 
                              <ChevronDown className="h-5 w-5" />
                            }
                          </button>
                          <span className="mr-2 text-xl">{getGoalEmoji(goal.progress)}</span>
                          <h3 className="text-lg font-medium">{goal.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-gray-500 hover:text-blue-600"
                            onClick={() => {
                              setEditGoalId(goal.id);
                              setEditGoalTitle(goal.title);
                              setEditGoalModalOpen(true);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-gray-500 hover:text-red-600"
                            onClick={() => {
                              setDeleteGoalId(goal.id);
                              setDeleteGoalModalOpen(true);
                            }}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Remove</span>
                          </Button>
                        </div>
                        <Badge 
                          variant={
                            (goal.progress || 0) === 100 
                              ? "default" 
                              : (goal.progress || 0) > 50 
                                ? "default" 
                                : "outline"
                          }
                          className={(goal.progress || 0) === 100 ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                        >
                          {(goal.progress || 0).toFixed(0)}% Complete
                        </Badge>
                      </div>
                      <Progress 
                        value={goal.progress || 0} 
                        className="h-2" 
                      />
                    </div>
                    
                    {!collapsedGoals[goal.id] && (
                      <div className="divide-y">
                        {goal.tasks
                          .sort((a, b) => {
                            // Sort completed tasks to the bottom
                            if (a.completed !== b.completed) {
                              return a.completed ? 1 : -1;
                            }
                            
                            // Then sort by priority
                            const priorityOrder = { high: 0, medium: 1, low: 2 };
                            return (
                              (priorityOrder[a.complexity?.toLowerCase() as keyof typeof priorityOrder] || 3) -
                              (priorityOrder[b.complexity?.toLowerCase() as keyof typeof priorityOrder] || 3)
                            );
                          })
                          .map(task => (
                            <div 
                              key={task.id}
                              className={`p-2 sm:p-3 rounded-lg ${task.completed ? "bg-gray-50" : "bg-white/50"}`}
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => toggleTaskCompletion.mutate({
                                    goalId: goal.id,
                                    taskId: task.id,
                                    completed: !task.completed
                                  })}
                                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    task.completed 
                                      ? "bg-green-100 border-green-500 text-green-500" 
                                      : "border-gray-300 hover:border-purple-400"
                                  }`}
                                >
                                  {task.completed && <Check className="h-4 w-4" />}
                                </button>
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{getPriorityEmoji(task.complexity, task.completed)}</span>
                                    <span className={`${task.completed ? "line-through text-gray-400" : "font-medium"}`}>
                                      {task.title}
                                    </span>
                                  </div>
                                  
                                  {task.estimatedMinutes && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        {task.estimatedMinutes} min
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                <TaskOptionsDropdown 
                                  goalId={goal.id} 
                                  taskId={task.id}
                                  onDiscuss={() => {
                                    setSelectedTask({
                                      goalId: goal.id,
                                      taskId: task.id,
                                      title: task.title
                                    });
                                    setTaskModalOpen(true);
                                  }}
                                />
                              </div>
                              
                              {/* Subtasks */}
                              {task.subtasks && task.subtasks.length > 0 && !task.completed && (
                                <div className="ml-9 mt-2 space-y-2">
                                  {task.subtasks.map(subtask => (
                                    <div key={subtask.id} className="flex items-center gap-2">
                                      <button
                                        onClick={() => toggleSubtaskCompletion.mutate({
                                          goalId: goal.id,
                                          taskId: task.id,
                                          subtaskId: subtask.id,
                                          completed: !subtask.completed
                                        })}
                                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                          subtask.completed 
                                            ? "bg-green-100 border-green-500 text-green-500" 
                                            : "border-gray-300 hover:border-purple-400"
                                        }`}
                                      >
                                        {subtask.completed && <Check className="h-3 w-3" />}
                                      </button>
                                      <span className={`text-sm ${subtask.completed ? "line-through text-gray-400" : ""}`}>
                                        {subtask.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg p-8 text-center border">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="text-xl font-medium mb-2">No goals yet</h3>
                  <p className="text-gray-500 mb-4">Create your first goal to get started.</p>
                  <Button onClick={() => setGoalModalOpen(true)}>Create a new goal</Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-[425px] h-[80vh] flex flex-col p-0 gap-0">
          <DialogTitle className="p-4 border-b text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-500" />
            AI Task Coach
          </DialogTitle>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg relative ${
                      message.sender === "user" 
                        ? "bg-purple-100 text-purple-900" 
                        : "bg-white border"
                    }`}
                  >
                    {message.sender === "ai" && (
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src="/robot.png" />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-semibold text-purple-700">AI Coach</span>
                      </div>
                    )}
                    
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                    
                    <div className="text-[10px] text-gray-500 mt-1 text-right">
                      {formatTimestamp(message.timestamp)}
                    </div>
                    
                    {message.isTaskCreation && message.goalId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 text-xs"
                        onClick={() => handleTaskClick(message.goalId!)}
                      >
                        View Tasks
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[80%] p-3 rounded-lg bg-white border">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src="/robot.png" />
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold text-purple-700">AI Coach</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-3 border-t">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) {
                  sendMessage.mutate(input.trim());
                }
              }}
              className="flex gap-2"
            >
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || isTyping}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* New Goal Modal */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle>Create New Goal</DialogTitle>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (goalDescription.trim()) {
                createGoal.mutate(goalDescription.trim());
              }
            }}
            className="space-y-4"
          >
            <div>
              <Textarea 
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                placeholder="Describe your goal... (e.g., 'I want to learn Spanish in 3 months')"
                className="h-32"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setGoalModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!goalDescription.trim() || createGoal.isPending}
              >
                {createGoal.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : "Create Goal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Goal Modal */}
      <Dialog open={editGoalModalOpen} onOpenChange={setEditGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle>Edit Goal</DialogTitle>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (editGoalId && editGoalTitle.trim()) {
                editGoal.mutate({ id: editGoalId, title: editGoalTitle.trim() });
              }
            }}
            className="space-y-4"
          >
            <div>
              <Textarea 
                value={editGoalTitle}
                onChange={(e) => setEditGoalTitle(e.target.value)}
                placeholder="Update your goal description..."
                className="h-32"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  setEditGoalModalOpen(false);
                  setEditGoalId(null);
                  setEditGoalTitle("");
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!editGoalTitle.trim() || editGoal.isPending}
              >
                {editGoal.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : "Update Goal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Goal Modal */}
      <Dialog open={deleteGoalModalOpen} onOpenChange={setDeleteGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle>Delete Goal</DialogTitle>
          <div className="py-4">
            <p className="mb-4">Are you sure you want to delete this goal? This action cannot be undone and all associated tasks will be removed.</p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteGoalModalOpen(false);
                  setDeleteGoalId(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  if (deleteGoalId) {
                    deleteGoal.mutate(deleteGoalId);
                  }
                }}
                disabled={deleteGoal.isPending}
              >
                {deleteGoal.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : "Delete Goal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Task Discussion Modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle>Discuss Task</DialogTitle>
          <div className="mb-4">
            <h3 className="font-medium">{selectedTask?.title}</h3>
            <p className="text-sm text-gray-500">
              What would you like to know about this task?
            </p>
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start text-left"
              onClick={() => {
                if (selectedTask) {
                  setChatOpen(true);
                  setTaskModalOpen(false);
                  setInput(`How can I approach the task "${selectedTask.title}"?`);
                  setTimeout(() => {
                    const form = document.querySelector("form");
                    if (form) form.dispatchEvent(new Event("submit", { cancelable: true }));
                  }, 500);
                }
              }}
            >
              How can I approach this task?
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-left"
              onClick={() => {
                if (selectedTask) {
                  setChatOpen(true);
                  setTaskModalOpen(false);
                  setInput(`I'm stuck on "${selectedTask.title}". What should I do?`);
                  setTimeout(() => {
                    const form = document.querySelector("form");
                    if (form) form.dispatchEvent(new Event("submit", { cancelable: true }));
                  }, 500);
                }
              }}
            >
              I'm stuck on this task
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-left"
              onClick={() => {
                if (selectedTask) {
                  setChatOpen(true);
                  setTaskModalOpen(false);
                  setInput(`Break down "${selectedTask.title}" into smaller steps`);
                  setTimeout(() => {
                    const form = document.querySelector("form");
                    if (form) form.dispatchEvent(new Event("submit", { cancelable: true }));
                  }, 500);
                }
              }}
            >
              Break this down into smaller steps
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  isTaskCreation?: boolean;
  goalId?: number;
}

const TaskFocusedApp: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hi! 👋 Tell me your goal, and I'll help break it down into actionable tasks.",
      sender: "ai",
      timestamp: new Date()
    }
  ]);
  const [expandedGoals, setExpandedGoals] = useState<Record<number, boolean>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [newGoalMode, setNewGoalMode] = useState(false);
  
  // Fetch user's goals
  const { data: goals = [], isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    enabled: !!user
  });
  
  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/coach/chat", {
        message: content
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
            g.tasks.some(t => data.relatedTasks?.includes(t.id))
          )?.id : undefined
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // If new tasks were created, refresh goals data
        if (data.tasksCreated) {
          queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
          
          // Auto-expand the goal that was just created
          if (aiMessage.goalId !== undefined) {
            setExpandedGoals(prev => ({
              ...prev,
              [aiMessage.goalId as number]: true
            }));
          }
          
          // If we were in new goal mode, exit it
          if (newGoalMode) {
            setNewGoalMode(false);
          }
          
          toast({
            title: "✅ Tasks created!",
            description: "Your goal has been broken down into actionable tasks",
          });
        }
      } catch (error) {
        console.error("Failed to process AI response:", error);
      }
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Sorry, I'm having trouble processing your request. Please try again.",
        sender: "ai",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsTyping(false);
    }
  });
  
  // Toggle task completion
  const toggleTaskCompletion = useMutation({
    mutationFn: async ({ goalId, taskId, completed }: { goalId: number, taskId: string, completed: boolean }) => {
      return await apiRequest("PATCH", "/api/tasks", {
        goalId,
        taskId,
        completed
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      toast({
        title: completed ? "✅ Task completed!" : "⏪ Task reopened",
        duration: 1500,
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === "") return;
    sendMessage.mutate(input);
  };
  
  // Toggle goal expanded state
  const toggleGoalExpanded = (goalId: number) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };
  
  // Start new goal creation mode
  const startNewGoal = () => {
    setNewGoalMode(true);
    setChatOpen(true);
    
    // Add a message to guide the user
    const aiMessage: Message = {
      id: Date.now().toString(),
      content: "Let's create a new goal! 🚀 What would you like to achieve? Please describe your goal in detail, and I'll help break it down into manageable tasks.",
      sender: "ai",
      timestamp: new Date()
    };
    
    setMessages([aiMessage]);
    setInput("");
  };
  
  // Get all incomplete tasks across all goals
  const getIncompleteTasks = () => {
    if (!goals) return [];
    
    return goals.flatMap(goal => 
      goal.tasks
        .filter(task => !task.completed)
        .map(task => ({
          goalId: goal.id,
          goalTitle: goal.title,
          ...task
        }))
    );
  };
  
  // Get priority tasks (due soon or marked important)
  const getPriorityTasks = () => {
    const incompleteTasks = getIncompleteTasks();
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    return incompleteTasks.filter(task => {
      if (!task.dueDate) return false;
      
      const dueDate = new Date(task.dueDate);
      return dueDate <= threeDaysFromNow;
    });
  };
  
  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header */}
      <header className="border-b p-3 flex justify-between items-center bg-white">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-transparent bg-clip-text">TaskBreaker</span>
          <Badge variant="outline" className="text-xs font-normal ml-2 bg-purple-50 text-purple-700 border-purple-200">
            ADHD-friendly
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            onClick={() => setChatOpen(true)}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Chat with AI
          </Button>
          
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profilePicture || undefined} alt={user?.username || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main task area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <Tabs defaultValue="today" className="space-y-4">
            <div className="flex justify-between items-center">
              <TabsList className="bg-white border">
                <TabsTrigger value="today" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
                  📌 Today
                </TabsTrigger>
                <TabsTrigger value="goals" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
                  🎯 Goals
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
                  ✅ Completed
                </TabsTrigger>
              </TabsList>
              
              <Button 
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
                onClick={startNewGoal}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Goal
              </Button>
            </div>
            
            {/* Today's tab */}
            <TabsContent value="today" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800">Today's Tasks 📝</h2>
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0">
                    {getPriorityTasks().length} tasks
                  </Badge>
                </div>
                
                {isLoadingGoals ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  </div>
                ) : getPriorityTasks().length === 0 ? (
                  <div className="bg-white border rounded-lg p-8 text-center">
                    <div className="text-5xl mb-4">🎉</div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">All caught up!</h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      You don't have any priority tasks for today. Would you like to create a new goal?
                    </p>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={startNewGoal}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Goal
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getPriorityTasks().map(task => (
                      <div 
                        key={task.id}
                        className="bg-white border rounded-lg p-4 flex items-start gap-3 transition-shadow hover:shadow-md"
                      >
                        <button 
                          className="mt-0.5 h-5 w-5 rounded-full border-2 border-purple-400 flex-shrink-0 flex items-center justify-center"
                          onClick={() => {
                            toggleTaskCompletion.mutate({
                              goalId: task.goalId,
                              taskId: task.id,
                              completed: true
                            });
                          }}
                        >
                          {task.completed && (
                            <Check className="h-3 w-3 text-purple-600" />
                          )}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900">{task.title}</h3>
                              <p className="text-xs text-gray-500">
                                Goal: {task.goalTitle}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {task.dueDate && (
                                <Badge variant="outline" className="text-xs gap-1 border-orange-200 bg-orange-50 text-orange-700">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </Badge>
                              )}
                              
                              {task.estimatedMinutes && (
                                <Badge variant="outline" className="text-xs gap-1 border-blue-200 bg-blue-50 text-blue-700">
                                  <Clock className="h-3 w-3" />
                                  {task.estimatedMinutes} min
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {task.context && (
                            <p className="mt-2 text-sm text-gray-600 max-w-3xl">
                              {task.context}
                            </p>
                          )}
                          
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-2">
                              <h4 className="text-xs font-medium text-gray-500 mb-1">Subtasks:</h4>
                              {task.subtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-2">
                                  <div className="w-4 h-4 border border-gray-300 rounded-sm flex items-center justify-center">
                                    {subtask.completed && (
                                      <Check className="h-3 w-3 text-purple-600" />
                                    )}
                                  </div>
                                  <span className={`text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                    {subtask.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {getPriorityTasks().length > 0 && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-lg p-4 flex items-center gap-3">
                    <div className="rounded-full bg-purple-100 p-2">
                      <Star className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">ADHD Pro Tip 💡</h3>
                      <p className="text-sm text-gray-600">
                        Try the Pomodoro technique: focus for 25 minutes, then take a 5-minute break!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Goals tab */}
            <TabsContent value="goals" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800">Your Goals 🎯</h2>
                </div>
                
                {isLoadingGoals ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  </div>
                ) : goals.length === 0 ? (
                  <div className="bg-white border rounded-lg p-8 text-center">
                    <div className="text-5xl mb-4">🚀</div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">Start your journey!</h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      You don't have any goals yet. Let's create your first goal and break it down into tasks.
                    </p>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={startNewGoal}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Goal
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {goals.map(goal => (
                      <div 
                        key={goal.id} 
                        className="bg-white border rounded-lg overflow-hidden transition-shadow hover:shadow-sm"
                      >
                        {/* Goal header */}
                        <div 
                          className="p-4 flex items-center justify-between cursor-pointer"
                          onClick={() => toggleGoalExpanded(goal.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="text-xl">🎯</div>
                            <div>
                              <h3 className="font-medium text-gray-900">{goal.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress
                                  value={goal.progress || 0}
                                  className="h-1.5 w-32 bg-gray-100"
                                />
                                <span className="text-xs text-gray-500">
                                  {goal.progress || 0}% Complete
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-0">
                              {goal.tasks.filter(t => !t.completed).length} remaining
                            </Badge>
                            <Button variant="ghost" size="icon">
                              {expandedGoals[goal.id] ? (
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-gray-500" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Tasks */}
                        {expandedGoals[goal.id] && (
                          <div className="px-4 pb-4 pt-1 space-y-2 border-t">
                            {goal.tasks.map(task => (
                              <div 
                                key={task.id}
                                className={`p-3 flex items-start gap-3 rounded-md ${
                                  task.completed 
                                    ? 'bg-gray-50 text-gray-500' 
                                    : 'bg-white hover:bg-gray-50'
                                }`}
                              >
                                <button 
                                  className={`mt-0.5 h-5 w-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                                    task.completed 
                                      ? 'bg-green-500 text-white' 
                                      : 'border-2 border-purple-400'
                                  }`}
                                  onClick={() => {
                                    toggleTaskCompletion.mutate({
                                      goalId: goal.id,
                                      taskId: task.id,
                                      completed: !task.completed
                                    });
                                  }}
                                >
                                  {task.completed && (
                                    <Check className="h-3 w-3" />
                                  )}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <h4 className={`font-medium ${
                                      task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                                    }`}>
                                      {task.title}
                                    </h4>
                                    
                                    <div className="flex items-center gap-1">
                                      {task.dueDate && (
                                        <Badge variant="outline" className={`text-xs gap-1 ${
                                          task.completed 
                                            ? 'border-gray-200 bg-gray-50 text-gray-400' 
                                            : 'border-orange-200 bg-orange-50 text-orange-700'
                                        }`}>
                                          <Calendar className="h-3 w-3" />
                                          {new Date(task.dueDate).toLocaleDateString()}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {task.subtasks && task.subtasks.length > 0 && !task.completed && (
                                    <div className="mt-2 space-y-1">
                                      {task.subtasks.map(subtask => (
                                        <div key={subtask.id} className="flex items-center gap-2">
                                          <div className="w-3.5 h-3.5 border border-gray-300 rounded-sm flex items-center justify-center">
                                            {subtask.completed && (
                                              <Check className="h-2.5 w-2.5 text-purple-600" />
                                            )}
                                          </div>
                                          <span className={`text-xs ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                                            {subtask.title}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            <Button 
                              variant="outline" 
                              className="w-full text-xs mt-2"
                              onClick={() => {
                                setChatOpen(true);
                                setInput(`I want to add more tasks to my goal: "${goal.title}"`);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Add more tasks
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Completed tab */}
            <TabsContent value="completed" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800">Completed Tasks ✅</h2>
                </div>
                
                {isLoadingGoals ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {goals.flatMap(goal => 
                      goal.tasks
                        .filter(task => task.completed)
                        .map(task => (
                          <div 
                            key={task.id}
                            className="bg-white border rounded-lg p-3 flex items-start gap-3"
                          >
                            <div className="mt-0.5 h-5 w-5 rounded-full bg-green-500 text-white flex-shrink-0 flex items-center justify-center">
                              <Check className="h-3 w-3" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium text-gray-600 line-through">{task.title}</h3>
                                  <p className="text-xs text-gray-400">
                                    From: {goal.title}
                                  </p>
                                </div>
                                
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 text-xs text-gray-500"
                                  onClick={() => {
                                    toggleTaskCompletion.mutate({
                                      goalId: goal.id,
                                      taskId: task.id,
                                      completed: false
                                    });
                                  }}
                                >
                                  Reopen
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                    
                    {goals.flatMap(goal => 
                      goal.tasks.filter(task => task.completed)
                    ).length === 0 && (
                      <div className="bg-white border rounded-lg p-6 text-center">
                        <div className="text-4xl mb-3">📝</div>
                        <h3 className="text-lg font-medium text-gray-800 mb-1">No completed tasks yet</h3>
                        <p className="text-gray-600">
                          Check out your tasks and start completing them!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Chat dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 max-h-[80vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <DialogTitle>Chat with AI Coach</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setChatOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} items-end gap-2`}
              >
                {message.sender === "ai" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-purple-600">🤖</AvatarFallback>
                  </Avatar>
                )}
                
                <div 
                  className={`
                    max-w-[85%] rounded-lg px-4 py-3
                    ${message.sender === "user" 
                      ? "bg-purple-600 text-white" 
                      : "bg-gray-100 text-gray-800"
                    }
                  `}
                >
                  <div>
                    <div className="prose prose-sm">
                      {message.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < message.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                    
                    {/* If this message created a goal, show a special indicator */}
                    {message.isTaskCreation && message.goalId !== undefined && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                          <span className="text-xs font-medium text-gray-600">
                            Tasks created successfully!
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-1 text-right">
                    <span className="text-xs opacity-60">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
                
                {message.sender === "user" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={user?.profilePicture || undefined} alt={user?.username || "User"} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
                      {user?.username?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {/* AI typing indicator */}
            {isTyping && (
              <div className="flex justify-start items-end gap-2">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-purple-600">🤖</AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={newGoalMode 
                  ? "Describe your goal in detail..." 
                  : "Ask a question or discuss your tasks..."}
                className="pr-10 min-h-[80px] resize-none"
                autoFocus
              />
              <Button 
                type="submit" 
                size="icon" 
                className="absolute right-2 bottom-2 bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isTyping || input.trim() === ""}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            
            {newGoalMode && (
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                Be specific about what you want to achieve and any timeframes
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskFocusedApp;
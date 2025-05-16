import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Goal } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, Send, X, MoreHorizontal, Calendar, Clock, Tag, Users, PenLine, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  isTaskSuggestion?: boolean;
  tasks?: {
    title: string;
    id: string;
    subtasks?: { title: string; id: string }[];
  }[];
}

const ModernTaskApp: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hi there! 👋 I'm your AI assistant. Let me know what goal you'd like to work on, and I'll help you break it down into manageable tasks.",
      sender: "ai",
      timestamp: new Date()
    }
  ]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  
  // Fetch user's goals
  const { data: goals, isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    enabled: !!user
  });
  
  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Handle message submission
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/coach/chat", {
        message: content
      });
    },
    onMutate: (content) => {
      // Add user message to the UI immediately
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
          isTaskSuggestion: data.tasksCreated || data.type === 'task-suggestion',
          tasks: data.tasksCreated ? goals?.find(g => g.tasks.some(t => data.relatedTasks?.includes(t.id)))?.tasks : undefined
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // If new tasks were created, refresh goals data
        if (data.tasksCreated) {
          queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
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
    }
  });
  
  // Toggle subtask completion
  const toggleSubtaskCompletion = useMutation({
    mutationFn: async ({ goalId, taskId, subtaskId, completed }: { goalId: number, taskId: string, subtaskId: string, completed: boolean }) => {
      return await apiRequest("PATCH", "/api/subtasks", {
        goalId,
        taskId,
        subtaskId,
        completed
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
    }
  });
  
  // Calculate overall progress
  const getOverallProgress = () => {
    if (!goals || goals.length === 0) return 0;
    
    const totalTasks = goals.reduce((sum, goal) => sum + goal.tasks.length, 0);
    const completedTasks = goals.reduce(
      (sum, goal) => sum + goal.tasks.filter(t => t.completed).length, 
      0
    );
    
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };
  
  // Toggle task expanded state
  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };
  
  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === "") return;
    sendMessage.mutate(input);
  };
  
  // Flatten all tasks from all goals into a single array
  const getAllTasks = () => {
    if (!goals) return [];
    
    return goals.flatMap(goal => 
      goal.tasks.map(task => ({
        ...task,
        goalId: goal.id,
        goalTitle: goal.title
      }))
    );
  };
  
  // Get all tasks for the current date
  const getTodaysTasks = () => {
    const tasks = getAllTasks();
    const today = new Date().toISOString().split('T')[0];
    
    return tasks.filter(task => 
      !task.completed && 
      task.dueDate && 
      task.dueDate.startsWith(today)
    );
  };
  
  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Left sidebar with tasks */}
      <div className="w-80 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-lg font-semibold">TaskBreaker</h1>
        </div>
        
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-zinc-400">Progress</h2>
            <span className="text-xs font-medium">{getOverallProgress()}%</span>
          </div>
          <Progress value={getOverallProgress()} className="h-1.5 bg-zinc-800" />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-400">Goals & Tasks</h2>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {isLoadingGoals ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : !goals || goals.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-sm">
                <p>No goals or tasks yet.</p>
                <p>Start a conversation to create some!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {goals.map(goal => (
                  <div key={goal.id} className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <div 
                        className={`w-1.5 h-1.5 rounded-full ${
                          goal.progress >= 100 ? 'bg-emerald-500' : 'bg-violet-500'
                        }`}
                      />
                      {goal.title}
                    </div>
                    
                    <div className="pl-3 space-y-1 border-l border-zinc-800 ml-0.5">
                      {goal.tasks.map(task => (
                        <div key={task.id} className="pl-2">
                          <div 
                            className={`flex items-center text-xs py-1 px-2 rounded-md transition-colors cursor-pointer ${
                              selectedTask === task.id 
                                ? 'bg-zinc-800 text-white' 
                                : 'text-zinc-400 hover:text-zinc-300'
                            }`}
                            onClick={() => setSelectedTask(task.id)}
                          >
                            <button 
                              className="mr-2 rounded-sm border border-zinc-700 w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskCompletion.mutate({
                                  goalId: goal.id,
                                  taskId: task.id,
                                  completed: !task.completed
                                });
                              }}
                            >
                              {task.completed && (
                                <Check className="h-2.5 w-2.5 text-emerald-500" />
                              )}
                            </button>
                            
                            <span className={task.completed ? 'line-through text-zinc-600' : ''}>
                              {task.title}
                            </span>
                            
                            {task.subtasks?.length > 0 && (
                              <button 
                                className="ml-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskExpanded(task.id);
                                }}
                              >
                                {expandedTasks[task.id] ? (
                                  <ChevronDown className="h-3 w-3 text-zinc-500" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-zinc-500" />
                                )}
                              </button>
                            )}
                          </div>
                          
                          {/* Subtasks */}
                          {expandedTasks[task.id] && task.subtasks && (
                            <div className="pl-4 mt-1 space-y-1 border-l border-zinc-800">
                              {task.subtasks.map(subtask => (
                                <div 
                                  key={subtask.id}
                                  className="flex items-center text-xs py-0.5 text-zinc-400"
                                >
                                  <button 
                                    className="mr-2 rounded-sm border border-zinc-700 w-3 h-3 flex-shrink-0 flex items-center justify-center"
                                    onClick={() => {
                                      toggleSubtaskCompletion.mutate({
                                        goalId: goal.id,
                                        taskId: task.id,
                                        subtaskId: subtask.id,
                                        completed: !subtask.completed
                                      });
                                    }}
                                  >
                                    {subtask.completed && (
                                      <Check className="h-2 w-2 text-emerald-500" />
                                    )}
                                  </button>
                                  
                                  <span className={subtask.completed ? 'line-through text-zinc-600' : ''}>
                                    {subtask.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main content - chat area */}
      <div className="flex-1 flex flex-col bg-zinc-950">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} items-end`}
            >
              {message.sender === "ai" && (
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarImage src="/coach-avatar.png" alt="AI" />
                  <AvatarFallback className="bg-violet-600 text-white">AI</AvatarFallback>
                </Avatar>
              )}
              
              <div className={`max-w-[80%] ${message.sender === "user" ? "bg-violet-600" : "bg-zinc-800"} rounded-lg p-4`}>
                <div>
                  <div className="prose prose-invert prose-sm">
                    {message.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < message.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  
                  {/* Tasks suggestion UI */}
                  {message.isTaskSuggestion && message.tasks && (
                    <div className="mt-3 border-t border-zinc-700 pt-3">
                      <h4 className="text-xs font-medium text-zinc-400 mb-2">Suggested Tasks:</h4>
                      <div className="space-y-1.5">
                        {message.tasks.map(task => (
                          <div 
                            key={task.id}
                            className="flex items-center bg-zinc-900 rounded-md p-2 text-sm"
                          >
                            <button 
                              className="mr-2 rounded-sm border border-zinc-700 w-4 h-4 flex-shrink-0 flex items-center justify-center"
                              onClick={() => {
                                // Find the goal this task belongs to
                                const goal = goals?.find(g => g.tasks.some(t => t.id === task.id));
                                if (goal) {
                                  toggleTaskCompletion.mutate({
                                    goalId: goal.id,
                                    taskId: task.id,
                                    completed: !task.completed
                                  });
                                }
                              }}
                            >
                              {task.completed && (
                                <Check className="h-3 w-3 text-emerald-500" />
                              )}
                            </button>
                            <span>{task.title}</span>
                          </div>
                        ))}
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
                <Avatar className="h-8 w-8 ml-3">
                  <AvatarImage src={user?.profilePicture || undefined} alt={user?.username || "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600">
                    {user?.username?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {/* AI typing indicator */}
          {isTyping && (
            <div className="flex justify-start items-end">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarFallback className="bg-violet-600 text-white">AI</AvatarFallback>
              </Avatar>
              <div className="bg-zinc-800 rounded-lg p-4 max-w-[80%]">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Chat input */}
        <div className="border-t border-zinc-800 p-4">
          <form onSubmit={handleSubmit} className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your goal or question..."
              className="pr-12 py-6 bg-zinc-800 border-zinc-700 text-white"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-violet-600 hover:bg-violet-700 text-white"
              disabled={isTyping || input.trim() === ""}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
      
      {/* Right sidebar - task details (only shown when a task is selected) */}
      {selectedTask && (
        <div className="w-80 border-l border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-sm font-medium">Task Details</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0" 
              onClick={() => setSelectedTask(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {(() => {
            const tasks = getAllTasks();
            const task = tasks.find(t => t.id === selectedTask);
            
            if (!task) return (
              <div className="p-4 text-sm text-zinc-500">
                Task not found
              </div>
            );
            
            return (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">{task.title}</h3>
                    <p className="text-xs text-zinc-500">
                      From goal: {task.goalTitle}
                    </p>
                  </div>
                  
                  {/* Task tools */}
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'Add date'}
                    </Button>
                    
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {task.estimatedMinutes ? `${task.estimatedMinutes}m` : 'Estimate'}
                    </Button>
                    
                    <Button variant="outline" size="sm" className="h-8 text-xs px-1.5">
                      <Tag className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  
                  {/* Task notes */}
                  {task.context && (
                    <div>
                      <h4 className="text-xs font-medium text-zinc-400 mb-1">Notes</h4>
                      <div className="text-sm p-3 bg-zinc-900 rounded-md text-zinc-300">
                        {task.context}
                      </div>
                    </div>
                  )}
                  
                  {/* Subtasks */}
                  <div>
                    <h4 className="text-xs font-medium text-zinc-400 mb-2">Subtasks</h4>
                    {task.subtasks && task.subtasks.length > 0 ? (
                      <div className="space-y-1">
                        {task.subtasks.map(subtask => (
                          <div key={subtask.id} className="flex items-center text-sm">
                            <button 
                              className="mr-2 rounded-sm border border-zinc-700 w-4 h-4 flex-shrink-0 flex items-center justify-center"
                              onClick={() => {
                                toggleSubtaskCompletion.mutate({
                                  goalId: task.goalId,
                                  taskId: task.id,
                                  subtaskId: subtask.id,
                                  completed: !subtask.completed
                                });
                              }}
                            >
                              {subtask.completed && (
                                <Check className="h-3 w-3 text-emerald-500" />
                              )}
                            </button>
                            
                            <span className={subtask.completed ? 'line-through text-zinc-600' : ''}>
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-500">
                        No subtasks yet
                      </div>
                    )}
                    
                    <Button variant="ghost" size="sm" className="mt-2 text-xs text-zinc-500">
                      <Plus className="h-3 w-3 mr-1" />
                      Add subtask
                    </Button>
                  </div>
                  
                  {/* Discussion with AI */}
                  <div>
                    <h4 className="text-xs font-medium text-zinc-400 mb-2">Discuss with AI</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs justify-start"
                      onClick={() => {
                        setInput(`I need help with the task "${task.title}". Can you provide some guidance?`);
                      }}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-2" />
                      Ask AI for help with this task
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default ModernTaskApp;
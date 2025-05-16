import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Goal } from "@shared/schema";
import { motion } from "framer-motion";
import { 
  Calendar, Check, ChevronDown, ChevronRight, Loader2, Plus, Send, X 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  isTaskCreation?: boolean;
  goalId?: number;
}

const SimpleChatTaskApp: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hi! I'm your AI assistant. Tell me your goal, and I'll help break it down into manageable tasks. What would you like to achieve?",
      sender: "ai",
      timestamp: new Date()
    }
  ]);
  const [expandedGoals, setExpandedGoals] = useState<Record<number, boolean>>({});
  
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
          if (aiMessage.goalId) {
            setExpandedGoals(prev => ({
              ...prev,
              ...(aiMessage.goalId !== undefined ? { [aiMessage.goalId]: true } : {})
            }));
          }
          
          toast({
            title: "Tasks created",
            description: "Your goal has been broken down into manageable tasks",
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
  
  return (
    <div className="flex flex-col md:flex-row h-screen bg-black">
      {/* Chat area (main content) */}
      <div className="flex-1 flex flex-col">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} items-end gap-2`}
            >
              {message.sender === "ai" && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-purple-600">AI</AvatarFallback>
                </Avatar>
              )}
              
              <div 
                className={`
                  max-w-[85%] md:max-w-[70%] rounded-lg px-4 py-3
                  ${message.sender === "user" 
                    ? "bg-purple-600 bg-gradient-to-br from-purple-600 to-indigo-600" 
                    : "bg-zinc-800"
                  }
                `}
              >
                <div>
                  <div className="prose prose-invert prose-sm">
                    {message.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < message.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  
                  {/* If this message created a goal, show a special indicator */}
                  {message.isTaskCreation && message.goalId !== undefined && (
                    <div className="mt-2 pt-2 border-t border-zinc-700">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-400"></div>
                        <span className="text-xs font-medium text-zinc-300">Tasks created! Check your task list.</span>
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
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600">
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
                <AvatarFallback className="bg-purple-600">AI</AvatarFallback>
              </Avatar>
              <div className="bg-zinc-800 rounded-lg px-4 py-3">
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
        <div className="border-t border-zinc-800 p-3 md:p-4">
          <form onSubmit={handleSubmit} className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your goal or ask a question..."
              className="pr-12 py-5 md:py-6 bg-zinc-800 border-zinc-700 text-white"
              autoFocus
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isTyping || input.trim() === ""}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
      
      {/* Task sidebar (collapsible on mobile) */}
      <div className="md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900 md:flex md:flex-col md:h-full overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="font-medium">Your Tasks</h2>
          
          {goals.length > 0 && (
            <Badge variant="outline" className="text-xs font-normal">
              {goals.reduce((sum, goal) => {
                return sum + goal.tasks.filter(t => !t.completed).length;
              }, 0)} active
            </Badge>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          {isLoadingGoals ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm space-y-1">
              <p>No tasks yet</p>
              <p>Tell me about a goal to get started</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setInput("I want to ");
                  // Focus the input
                  setTimeout(() => {
                    document.querySelector('input')?.focus();
                  }, 100);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New goal
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map(goal => (
                <div key={goal.id} className="rounded-md overflow-hidden border border-zinc-800">
                  {/* Goal header */}
                  <div 
                    className="flex items-center justify-between p-2.5 bg-zinc-800 cursor-pointer"
                    onClick={() => toggleGoalExpanded(goal.id)}
                  >
                    <div className="flex items-center gap-2">
                      <button className="w-5 h-5 text-zinc-400">
                        {expandedGoals[goal.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <h3 className="font-medium text-sm truncate">{goal.title}</h3>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs">
                        {goal.tasks.filter(t => !t.completed).length} tasks
                      </Badge>
                      <span className="text-xs font-medium text-zinc-400">
                        {goal.progress || 0}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <Progress 
                    value={goal.progress || 0} 
                    className="h-1 rounded-none bg-zinc-800" 
                  />
                  
                  {/* Tasks */}
                  {expandedGoals[goal.id] && (
                    <div className="p-2 space-y-1">
                      {goal.tasks.map(task => (
                        <div 
                          key={task.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-zinc-800 transition-colors"
                        >
                          <button 
                            className="h-4 w-4 rounded-sm border border-zinc-600 flex items-center justify-center flex-shrink-0"
                            onClick={() => {
                              toggleTaskCompletion.mutate({
                                goalId: goal.id,
                                taskId: task.id,
                                completed: !task.completed
                              });
                            }}
                          >
                            {task.completed && (
                              <Check className="h-3 w-3 text-purple-400" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm truncate ${task.completed ? 'line-through text-zinc-500' : ''}`}>
                              {task.title}
                            </div>
                            
                            {task.dueDate && (
                              <div className="flex items-center mt-1 text-xs text-zinc-500">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          
                          {task.subtasks && task.subtasks.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => {
                  setInput("I want to ");
                  // Focus the input
                  setTimeout(() => {
                    document.querySelector('input')?.focus();
                  }, 100);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New goal
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleChatTaskApp;
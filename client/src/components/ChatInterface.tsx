import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender: "user" | "coach";
  timestamp: Date;
  type?: "task-suggestion" | "encouragement" | "question" | "task-creation" | "general";
  relatedTasks?: string[];
}

interface ChatInterfaceProps {
  goalId?: number; // Optional: specific goal this chat is about
  initialMessage?: string; // Optional: message to start the conversation
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  goalId, 
  initialMessage = "Hi there! I'm your AI coach. How can I help you achieve your goals today?"
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messageEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: initialMessage,
      sender: "coach",
      timestamp: new Date(),
      type: "general"
    }
  ]);
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to AI coach
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/coach/chat", {
        message: content,
        goalId,
        userId: user?.id
      });
    },
    onMutate: (content) => {
      // Optimistically add user message to UI
      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        sender: "user",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInput("");
      setIsTyping(true);
      
      return { userMessage };
    },
    onSuccess: async (response) => {
      const data = await response.json();
      
      // Add AI coach response to messages
      const coachMessage: Message = {
        id: Date.now().toString(),
        content: data.message,
        sender: "coach",
        timestamp: new Date(),
        type: data.type || "general",
        relatedTasks: data.relatedTasks
      };
      
      setMessages(prev => [...prev, coachMessage]);
      
      // If new tasks were created, refresh goals data
      if (data.tasksCreated) {
        queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
      
      // Add error message from coach
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Sorry, I'm having trouble responding right now. Please try again in a moment.",
        sender: "coach",
        timestamp: new Date(),
        type: "general"
      };
      
      setMessages(prev => [...prev, errorMessage]);
    },
    onSettled: () => {
      setIsTyping(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === "") return;
    
    sendMessageMutation.mutate(input);
  };

  return (
    <div className="flex flex-col h-[70vh] md:h-[80vh] max-w-3xl mx-auto rounded-lg overflow-hidden border">
      {/* Chat header */}
      <div className="bg-primary/10 p-3 flex items-center gap-3 border-b">
        <Avatar>
          <AvatarImage src="/ai-coach-avatar.png" />
          <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">AI Coach</h3>
          <p className="text-xs text-muted-foreground">Here to help you achieve your goals</p>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/20">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={`max-w-[80%] p-3 ${
                message.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card"
              }`}
            >
              <div className="space-y-1">
                <p className="text-sm">{message.content}</p>
                <p className="text-xs text-right opacity-70">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </Card>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-3 bg-card">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm">AI Coach is typing...</p>
              </div>
            </Card>
          </div>
        )}
        
        <div ref={messageEndRef} />
      </div>

      {/* Chat input */}
      <form onSubmit={handleSubmit} className="p-3 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[3rem] max-h-[12rem]"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={sendMessageMutation.isPending || input.trim() === ""}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
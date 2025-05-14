import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

interface TaskDiscussionProps {
  goalId: number;
  taskId: string;
  taskTitle: string;
}

export const TaskDiscussion: React.FC<TaskDiscussionProps> = ({ goalId, taskId, taskTitle }) => {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [discussionHistory, setDiscussionHistory] = useState<{message: string, response: string}[]>([]);
  
  const handleDiscuss = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message to discuss with the AI",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/coach/discuss-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goalId,
          taskId,
          message,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to discuss task with AI");
      }
      
      const data = await response.json();
      setResponse(data.response);
      
      // Add to history
      setDiscussionHistory(prev => [...prev, {
        message: message,
        response: data.response
      }]);
      
      // Clear message input
      setMessage("");
      
    } catch (error) {
      console.error("Error discussing task with AI:", error);
      toast({
        title: "Error",
        description: "Failed to discuss task with AI. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <span role="img" aria-label="Discussion" className="mr-2">💬</span>
          Discuss Task with AI Assistant
        </CardTitle>
        <CardDescription>
          Ask for help, suggestions, or advice about this task
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleDiscuss} className="space-y-4">
          <div>
            <Textarea
              placeholder="Ask a question or describe what you need help with..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>
          
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Thinking..." : "Ask AI Assistant"}
          </Button>
        </form>
        
        {discussionHistory.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Discussion History</h4>
            <Accordion type="single" collapsible className="w-full">
              {discussionHistory.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center">
                      <span role="img" aria-label="Question" className="mr-2">❓</span>
                      {item.message.length > 40 ? `${item.message.substring(0, 40)}...` : item.message}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md mb-3">
                      <p className="text-sm font-medium">You asked:</p>
                      <p className="text-sm mt-1">{item.message}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                      <p className="text-sm font-medium">AI Assistant:</p>
                      <p className="text-sm mt-1 whitespace-pre-line">{item.response}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
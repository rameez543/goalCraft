import React, { useState } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ListTodo, MessageCircle, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { GoalList } from "@/components/CoachGoalList";
import { Goal } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const CoachChatPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedGoalId, setSelectedGoalId] = useState<number | undefined>(undefined);
  
  // Fetch goals for the authenticated user
  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    enabled: !!user
  });

  // Initial message for the chat interface
  const getInitialMessage = () => {
    if (!user) return "Please log in to chat with your AI coach.";
    
    if (goals && goals.length === 0) {
      return "Hi there! I'm your ADHD-friendly AI coach. I'm here to help you break down your goals into manageable tasks and stay on track. What would you like to achieve? Tell me about a goal you're working on.";
    }
    
    if (selectedGoalId && goals) {
      const goal = goals.find(g => g.id === selectedGoalId);
      if (goal) {
        return `Let's talk about your goal "${goal.title}". How can I help you make progress on this today?`;
      }
    }
    
    return "Hi there! I'm your ADHD-friendly AI coach. I see you have some goals already. What would you like to focus on today?";
  };

  return (
    <div className="container mx-auto py-4 h-full">
      <h1 className="text-3xl font-bold tracking-tight mb-6 text-center bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text">
        TaskBreaker AI Coach
      </h1>
      
      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-12rem)]">
        {/* Left sidebar for goals list - only shown on medium screens and larger */}
        <div className="hidden md:block w-64 shrink-0 border rounded-lg overflow-auto">
          <div className="p-3 border-b bg-muted/30">
            <h2 className="font-semibold">Your Goals</h2>
          </div>
          
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-2">
              {goals && goals.length > 0 ? (
                <div className="space-y-2">
                  {goals.map(goal => (
                    <Button
                      key={goal.id}
                      variant={selectedGoalId === goal.id ? "default" : "outline"}
                      className="w-full justify-start text-sm font-normal h-auto py-2"
                      onClick={() => setSelectedGoalId(goal.id)}
                    >
                      <span className="truncate">{goal.title}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-2">
                  No goals yet. Chat with your AI coach to create some!
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Main content area */}
        <div className="flex-1">
          <Tabs defaultValue="chat" className="h-full flex flex-col">
            <div className="border-b px-4">
              <TabsList className="mb-2">
                <TabsTrigger value="chat" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>Chat</span>
                </TabsTrigger>
                <TabsTrigger value="goals" className="gap-2 md:hidden">
                  <ListTodo className="h-4 w-4" />
                  <span>Goals</span>
                </TabsTrigger>
                <TabsTrigger value="tips" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>ADHD Tips</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="chat" className="flex-1 pt-4">
              <ChatInterface 
                goalId={selectedGoalId} 
                initialMessage={getInitialMessage()}
              />
            </TabsContent>
            
            <TabsContent value="goals" className="p-2 overflow-auto md:hidden">
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <GoalList goals={goals || []} onSelectGoal={(goalId: number) => {
                  setSelectedGoalId(goalId);
                  document.querySelector('[data-value="chat"]')?.dispatchEvent(
                    new MouseEvent('click', { bubbles: true })
                  );
                }} />
              )}
            </TabsContent>
            
            <TabsContent value="tips" className="p-4 overflow-auto">
              <div className="max-w-2xl mx-auto space-y-4">
                <h2 className="text-xl font-semibold">ADHD-Friendly Strategies</h2>
                
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="font-medium text-lg">🔄 Body Doubling</h3>
                    <p>Work alongside someone else (in person or virtually) to stay focused on tasks.</p>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="font-medium text-lg">⏰ Time Blocking</h3>
                    <p>Schedule specific time blocks for tasks and set timers to maintain focus.</p>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="font-medium text-lg">📱 External Reminders</h3>
                    <p>Set up notifications, alarms, and visual cues to remember important tasks.</p>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="font-medium text-lg">🍅 Pomodoro Technique</h3>
                    <p>Work in short focused bursts (25 min) with small breaks (5 min) in between.</p>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="font-medium text-lg">✅ Task Prioritization</h3>
                    <p>Use the "Urgent-Important Matrix" to decide what to focus on first.</p>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="font-medium text-lg">🧠 Implementation Intentions</h3>
                    <p>Create "if-then" statements to automate decision making and reduce cognitive load.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CoachChatPage;
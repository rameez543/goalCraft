import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Goal } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

interface CoachAvatarProps {
  userName?: string;
  isTyping?: boolean;
  mood?: "happy" | "thinking" | "encouraging" | "concerned" | "proud";
  lastMessage?: string;
  selectedGoal?: Goal;
  currentStreak?: number;
}

export const CoachAvatar: React.FC<CoachAvatarProps> = ({
  userName,
  isTyping = false,
  mood = "happy",
  lastMessage,
  selectedGoal,
  currentStreak = 0
}) => {
  const [greeting, setGreeting] = useState<string>("");
  
  // Get appropriate greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    let timeGreeting = "";
    
    if (hour < 12) {
      timeGreeting = "Good morning";
    } else if (hour < 18) {
      timeGreeting = "Good afternoon";
    } else {
      timeGreeting = "Good evening";
    }
    
    setGreeting(userName ? `${timeGreeting}, ${userName}!` : timeGreeting);
  }, [userName]);
  
  // Different expressions based on mood
  const getMoodEmoji = () => {
    switch (mood) {
      case "happy": return "😊";
      case "thinking": return "🤔";
      case "encouraging": return "💪";
      case "concerned": return "😟";
      case "proud": return "🎉";
      default: return "😊";
    }
  };
  
  // Different background colors based on mood
  const getMoodBackground = () => {
    switch (mood) {
      case "happy": return "bg-green-100 dark:bg-green-900/20";
      case "thinking": return "bg-blue-100 dark:bg-blue-900/20";
      case "encouraging": return "bg-purple-100 dark:bg-purple-900/20";
      case "concerned": return "bg-amber-100 dark:bg-amber-900/20";
      case "proud": return "bg-pink-100 dark:bg-pink-900/20";
      default: return "bg-green-100 dark:bg-green-900/20";
    }
  };

  return (
    <Card className={`overflow-hidden border-2 ${getMoodBackground()}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage src="/coach-avatar.png" alt="AI Coach" />
              <AvatarFallback className="text-2xl">{getMoodEmoji()}</AvatarFallback>
            </Avatar>
            
            {currentStreak > 0 && (
              <Badge 
                className="absolute -bottom-2 -right-2 bg-gradient-to-r from-orange-500 to-amber-500"
                variant="secondary"
              >
                {currentStreak} day streak 🔥
              </Badge>
            )}
          </div>
          
          <div className="flex-1 space-y-1">
            <h3 className="font-medium text-lg">Coach Max</h3>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={lastMessage || greeting} 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                {isTyping ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                ) : (
                  <p className="text-sm">
                    {lastMessage || greeting}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
            
            {selectedGoal && (
              <Badge variant="outline" className="mt-2">
                Currently helping with: {selectedGoal.title}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
import OpenAI from 'openai';
import { Goal } from '@shared/schema';

// initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = 'gpt-4o';

interface CoachMessage {
  message: string;
  type: 'encouragement' | 'tip' | 'congratulation' | 'milestone';
}

/**
 * Generate a personalized coaching message based on the user's goals and progress
 */
export async function generateCoachingMessage(
  goals: Goal[], 
  userName: string = 'there'
): Promise<CoachMessage> {
  try {
    // Check if there's an API key available
    if (!process.env.OPENAI_API_KEY) {
      return {
        message: "Keep going! You're making great progress on your goals.",
        type: 'encouragement'
      };
    }

    // Calculate overall progress
    const overallProgress = goals.length > 0
      ? Math.round(goals.reduce((acc, goal) => acc + (goal.progress || 0), 0) / goals.length)
      : 0;
    
    // Get the goal with the most progress
    const mostProgressGoal = [...goals].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];
    
    // Get the goal with roadblocks
    const goalsWithRoadblocks = goals.filter(goal => goal.roadblocks);
    
    // Format the context for OpenAI
    const context = {
      userName,
      goals: goals.map(goal => ({
        title: goal.title,
        progress: goal.progress || 0,
        tasksCompleted: goal.tasks.filter(t => t.completed).length,
        totalTasks: goal.tasks.length,
        hasRoadblocks: !!goal.roadblocks,
        roadblockDescription: goal.roadblocks || "",
        timeConstraint: goal.timeConstraintMinutes || 0
      })),
      overallProgress,
      totalCompletedTasks: goals.reduce((acc, goal) => acc + goal.tasks.filter(t => t.completed).length, 0),
      totalTasks: goals.reduce((acc, goal) => acc + goal.tasks.length, 0),
      hasGoalsWithRoadblocks: goalsWithRoadblocks.length > 0
    };

    // Create a prompt for the AI
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an encouraging, positive AI coach for a task management app called TaskBreaker. 
          Your job is to provide personalized, motivational messages to users based on their goal progress. 
          Be specific, positive, and action-oriented.
          
          Rules:
          1. Keep messages concise (max 2-3 sentences)
          2. Be encouraging but realistic
          3. Recognize achievements and progress
          4. If the user has roadblocks, acknowledge them but be supportive
          5. Vary your message types based on the context
          
          Message types:
          - encouragement: General supportive messages for ongoing work
          - tip: Strategic advice for improving productivity
          - congratulation: Celebrate completed tasks or major progress
          - milestone: Acknowledge reaching a significant point in progress
          
          Respond with JSON in this format:
          {
            "message": "Your encouraging message here",
            "type": "encouragement"
          }`
        },
        {
          role: "user",
          content: JSON.stringify(context)
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const messageContent = response.choices[0].message.content || '{"message": "Keep up the good work!", "type": "encouragement"}';
    const result = JSON.parse(messageContent);
    
    return {
      message: result.message || "Keep up the good work!",
      type: (result.type as CoachMessage['type']) || "encouragement"
    };
    
  } catch (error) {
    console.error('Error generating coaching message:', error);
    
    // Fallback messages if the API fails
    return {
      message: "Keep pushing forward! Every small step counts toward your bigger goals.",
      type: 'encouragement'
    };
  }
}

/**
 * Generate tips for overcoming roadblocks
 */
export async function generateRoadblockTips(goal: Goal): Promise<string[]> {
  try {
    // Check if there's an API key and roadblock
    if (!process.env.OPENAI_API_KEY || !goal.roadblocks) {
      return [
        "Break down the challenge into smaller, more manageable tasks.",
        "Consider seeking help or advice from someone with expertise in this area.",
        "Take a short break and return with a fresh perspective."
      ];
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a helpful AI coach specializing in overcoming obstacles. 
          Given a goal and a described roadblock, provide 3-5 practical, actionable tips to help overcome this specific challenge.
          Format your response as a JSON array of strings, each containing one practical tip.`
        },
        {
          role: "user",
          content: `Goal: ${goal.title}\nRoadblock: ${goal.roadblocks || "Unknown roadblock"}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const messageContent = response.choices[0].message.content || '{"tips":["Break down the challenge into smaller steps.","Consider seeking help from someone with expertise.","Take a break and return with fresh perspective."]}';
    const result = JSON.parse(messageContent);
    
    // Ensure we're returning an array of strings
    if (Array.isArray(result.tips)) {
      return result.tips;
    } else {
      return [
        "Break down the challenge into smaller, more manageable tasks.",
        "Consider seeking help or advice from someone with expertise in this area.",
        "Take a short break and return with a fresh perspective."
      ];
    }
    
  } catch (error) {
    console.error('Error generating roadblock tips:', error);
    
    // Fallback tips if the API fails
    return [
      "Break down the challenge into smaller steps.",
      "Consider asking for help from someone with expertise.",
      "Take a break and revisit with fresh eyes."
    ];
  }
}
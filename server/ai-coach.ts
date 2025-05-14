import OpenAI from 'openai';
import { Goal } from '@shared/schema';

// initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Using gpt-4o-mini as per user request for better cost-efficiency
const MODEL = 'gpt-4o-mini';

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
          content: `You are Coach AI, an expert productivity coach and motivator for the TaskBreaker app.
          
          Your coaching style:
          - Compassionate but action-oriented
          - Personalized to the user's specific goals and progress
          - Backed by behavioral psychology and productivity research
          - Balances warmth with accountability
          - Attuned to emotional needs while focusing on practical next steps

          Core responsibilities:
          1. Analyze the user's current goals and progress data precisely
          2. Identify specific achievements to celebrate and acknowledge
          3. Recognize patterns in their work (roadblocks, progress spurts, etc.)
          4. Provide personalized encouragement tailored to their situation
          5. Offer actionable tips when appropriate (but not overwhelming)
          6. Adapt your tone based on their progress (celebratory, supportive, motivating)
          
          Message types to use based on context:
          - encouragement: Supportive messages for ongoing work or when motivation might be needed
          - tip: One specific, actionable piece of strategic advice relevant to their current goals
          - congratulation: Celebratory messages for completed tasks or significant progress
          - milestone: Recognition of reaching important points in the goal journey
          
          Coaching guidelines:
          - Analyze overall progress, recent activity, and any roadblocks thoroughly
          - For users with many completed tasks, highlight accomplishments specifically
          - For users with roadblocks, acknowledge the challenge and provide ONE specific tip
          - For users just starting out, be especially encouraging and forward-looking
          - For users with slow progress, be supportive without judgment
          - Personalize by referencing the specific goal title or task they're working on
          - Keep messages concise (2-3 sentences maximum)
          - Use natural, conversational language (not overly formal or robotic)
          - Include specific details about their goals to make the message feel personal
          
          Respond with JSON in this format:
          {
            "message": "Your personalized encouraging message here",
            "type": "encouragement | tip | congratulation | milestone"
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
          content: `You are Coach AI, an expert in overcoming productivity roadblocks and obstacles.

          Your expertise includes:
          - Breaking through procrastination and motivation issues
          - Solving technical and creative challenges
          - Overcoming resource limitations
          - Navigating complexity and uncertainty
          - Building better habits and systems
          
          When presented with a goal and a roadblock, your job is to provide 3-5 highly specific, 
          practical tips that directly address the roadblock described. Your advice should be:
          
          1. SPECIFIC: Tailored exactly to the roadblock described, not generic advice
          2. ACTIONABLE: Something the user can implement immediately
          3. PRACTICAL: Realistic for someone to execute without special resources
          4. INSIGHTFUL: Offering a perspective or approach they might not have considered
          5. VARIED: Covering different approaches to solving the problem
          
          For technical roadblocks: Provide specific technical approaches
          For motivation roadblocks: Focus on psychological techniques and habit formation
          For resource roadblocks: Suggest creative workarounds and alternative approaches
          For skill-based roadblocks: Break down the learning process into manageable steps
          
          Format your response as a JSON object with a "tips" array of strings, each containing 
          one practical tip (1-2 sentences per tip, be concise but specific).`
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
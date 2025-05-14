import { Goal } from '@shared/schema';
import { generateCompletion, getModel, isLLMAvailable } from './providers';

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
    // Check if there's an LLM available
    if (!isLLMAvailable()) {
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
    
    // Format the context for the LLM
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

    const systemPrompt = `You are Coach AI, an expert productivity coach and motivator for the TaskBreaker app.
    
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
    }`;

    // Create a prompt for the LLM
    const messageContent = await generateCompletion({
      systemPrompt,
      userPrompt: JSON.stringify(context),
      model: getModel('gpt-4o-mini'),
      responseFormat: 'json_object'
    });
    
    // Parse the response
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
    // Check if there's an LLM available and roadblock
    if (!isLLMAvailable() || !goal.roadblocks) {
      return [
        "Break down the challenge into smaller, more manageable tasks.",
        "Consider seeking help or advice from someone with expertise in this area.",
        "Take a short break and return with a fresh perspective."
      ];
    }

    const systemPrompt = `You are Coach AI, an expert in overcoming productivity roadblocks and obstacles.

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
    one practical tip (1-2 sentences per tip, be concise but specific).`;
    
    const userPrompt = `Goal: ${goal.title}\nRoadblock: ${goal.roadblocks || "Unknown roadblock"}`;

    // Get roadblock tips from the LLM
    const messageContent = await generateCompletion({
      systemPrompt,
      userPrompt,
      model: getModel('gpt-4o-mini'),
      responseFormat: 'json_object'
    });
    
    // Parse the response
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

/**
 * Discuss a task with AI
 * @param goal The related goal
 * @param task The task to discuss
 * @param message User's message or question about the task
 */
export async function discussTaskWithAI(goal: Goal, task: any, message: string): Promise<string> {
  try {
    // Check if there's an LLM available
    if (!isLLMAvailable()) {
      return "I'd suggest breaking this task into smaller steps and tackle them one by one. If you're unsure about how to proceed, consider researching specific aspects or asking someone with relevant experience for advice.";
    }

    const taskWithContext = {
      title: task.title,
      context: task.context || "",
      complexity: task.complexity || "medium",
      estimatedMinutes: task.estimatedMinutes || 0,
      completed: task.completed,
      actionItems: task.actionItems || [],
      subtasks: task.subtasks.map((s: any) => ({
        title: s.title,
        context: s.context || "",
        completed: s.completed
      })),
      goalTitle: goal.title
    };

    const systemPrompt = `You are a helpful AI task assistant in the TaskBreaker app. Your role is to help users with their tasks by:
    
    1. Answering specific questions about how to accomplish the task
    2. Suggesting approaches or methodologies for complex tasks
    3. Breaking down confusing aspects into clearer steps
    4. Providing relevant resources or techniques that might help
    5. Offering encouragement and practical advice for roadblocks
    
    You have access to the task details including its context, complexity, action items, and subtasks.
    
    Guidelines:
    - Keep responses practical, action-oriented, and specific to the task at hand
    - If the task is technical, provide technical guidance appropriate to the user's level
    - If the task is creative, help with brainstorming and structure
    - Avoid generic advice - tie everything back to the specific task details
    - Be conversational but efficient - focus on helping them move forward
    - Consider the overall goal the task belongs to for context
    - When appropriate, refer to specific subtasks or action items from the task data`;
    
    const userPrompt = `Task: ${JSON.stringify(taskWithContext)}\n\nMy question/comment: ${message}`;
    
    // Get discussion response from the LLM
    const response = await generateCompletion({
      systemPrompt,
      userPrompt,
      model: getModel('gpt-4o-mini')
    });
    
    // Return the AI's response
    return response || "I suggest breaking this task into smaller steps and tackling them one by one.";
    
  } catch (error) {
    console.error('Error discussing task with AI:', error);
    
    // Fallback message if the API fails
    return "I suggest breaking this task into smaller steps and tackling them one by one. If you're unsure about how to proceed, consider researching specific aspects or asking someone with relevant experience for advice.";
  }
}
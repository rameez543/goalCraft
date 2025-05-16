import { Task, Goal } from '@shared/schema';
import { generateCompletion, getModel } from './providers';
import { storage } from '../storage';
import { nanoid } from 'nanoid';

interface ChatInput {
  message: string;
  goalId?: number;
  userId: number;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface ChatResponse {
  message: string;
  type: 'task-suggestion' | 'encouragement' | 'question' | 'task-creation' | 'general';
  relatedTasks?: string[];
  tasksCreated?: boolean;
}

/**
 * Process a chat message and generate a response from the AI coach
 */
export async function processCoachChat(input: ChatInput): Promise<ChatResponse> {
  // Get conversation history or create new
  const conversationHistory = input.conversationHistory || [];
  
  // Add user message to history
  conversationHistory.push({
    role: 'user',
    content: input.message
  });
  
  // Get user's goals for context if any exist
  let goalsContext = '';
  let specificGoal: Goal | undefined;
  
  // If goalId is provided, fetch that specific goal
  if (input.goalId) {
    specificGoal = await storage.getGoal(input.goalId);
    if (specificGoal) {
      goalsContext = `
This conversation is specifically about the user's goal: "${specificGoal.title}".
Current progress: ${specificGoal.progress}%.
Tasks for this goal: ${specificGoal.tasks.map(t => 
  `- ${t.title} (${t.completed ? 'Completed' : 'Not completed'})`
).join(', ')}
`;
    }
  } else {
    // Otherwise fetch all goals for this user
    const goals = await storage.getGoals(String(input.userId));
    if (goals.length > 0) {
      goalsContext = `
The user has the following goals:
${goals.map((g, i) => `${i+1}. "${g.title}" (Progress: ${g.progress}%)`).join('\n')}
`;
    }
  }

  // Detect intent to create a new goal from the message
  const createGoalIntent = detectCreateGoalIntent(input.message);
  
  // Build system prompt with ADHD-specific coaching strategies
  const systemPrompt = `
You are an AI coach specializing in helping people with ADHD achieve their goals. Your communication style should be:
1. Clear and concise - avoid long paragraphs
2. Positive and encouraging - celebrate small wins
3. Structured - break information into bullets or numbered lists
4. Direct - avoid ambiguity that could cause decision paralysis
5. Supportive - understand executive function challenges

${goalsContext}

Your role is to:
- Help users break down goals into manageable, concrete tasks with clear next steps
- Provide specific, actionable advice for overcoming obstacles
- Ask clarifying questions to understand the user's specific situation
- Maintain focus by redirecting tangential conversations back to the goal
- Provide time estimates for tasks that are realistic for someone with ADHD (often 1.5x typical estimates)
- Suggest accommodations and strategies specific to ADHD challenges

${createGoalIntent ? "The user seems to be expressing a new goal. Help break this down into clear, manageable tasks." : ""}

Always respond in the first person as the AI coach.
`;

  // Generate AI response using the selected model
  const llmResponse = await generateCompletion({
    model: getModel(),
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ],
    temperature: 0.7,
    max_tokens: 500
  });

  // Add assistant response to history for future context
  conversationHistory.push({
    role: 'assistant',
    content: llmResponse
  });

  // Process response to determine type and any actions needed
  const responseType = determineResponseType(llmResponse, input.message);
  let tasksCreated = false;
  let relatedTasks: string[] = [];

  // If this is a task creation response, create the tasks in the system
  if (responseType === 'task-suggestion' || responseType === 'task-creation') {
    const extractedTasks = extractTasksFromResponse(llmResponse);
    
    if (extractedTasks.length > 0 && (createGoalIntent || specificGoal)) {
      // Create new goal or update existing one
      if (createGoalIntent && !specificGoal) {
        // Extract goal title from user message
        const goalTitle = extractGoalTitleFromMessage(input.message);
        
        // Create new goal with the extracted tasks
        const newGoal = await storage.createGoal({
          title: goalTitle,
          tasks: extractedTasks.map(taskTitle => ({
            id: nanoid(),
            title: taskTitle,
            completed: false,
            subtasks: []
          })),
          userId: String(input.userId),
          createdAt: new Date().toISOString(),
          progress: 0,
          totalEstimatedMinutes: extractedTasks.length * 30, // Rough estimate
          notificationChannels: []
        });
        
        tasksCreated = true;
        relatedTasks = newGoal.tasks.map(t => t.id);
        
      } else if (specificGoal) {
        // Add tasks to existing goal
        const updatedTasks = [
          ...specificGoal.tasks,
          ...extractedTasks.map(taskTitle => ({
            id: nanoid(),
            title: taskTitle,
            completed: false,
            subtasks: []
          }))
        ];
        
        // Update the goal with new tasks
        await storage.updateGoal(specificGoal.id, {
          tasks: updatedTasks
        });
        
        tasksCreated = true;
        relatedTasks = updatedTasks.map(t => t.id);
      }
    }
  }

  return {
    message: llmResponse,
    type: responseType,
    relatedTasks,
    tasksCreated
  };
}

/**
 * Determine if the user's message indicates they want to create a new goal
 */
function detectCreateGoalIntent(message: string): boolean {
  const createGoalPhrases = [
    'i want to', 'i would like to', 'i need to', 'i wish to',
    'help me', 'can you help me', 'i have a goal', 'my goal is',
    'i want', 'i would like', 'i need', 'i wish',
    'i want', 'i wanna'
  ];
  
  const lowercaseMessage = message.toLowerCase();
  return createGoalPhrases.some(phrase => lowercaseMessage.includes(phrase));
}

/**
 * Extract a goal title from the user's message
 */
function extractGoalTitleFromMessage(message: string): string {
  // Simple extraction - take the first sentence or up to 50 chars
  const firstSentence = message.split(/[.!?]/)[0].trim();
  return firstSentence.length > 50 
    ? firstSentence.substring(0, 47) + '...' 
    : firstSentence;
}

/**
 * Determine the type of response from the AI
 */
function determineResponseType(response: string, userMessage: string): ChatResponse['type'] {
  const lowercaseResponse = response.toLowerCase();
  
  // Check for specific patterns in the response
  if (lowercaseResponse.includes('task') && 
     (lowercaseResponse.includes('create') || lowercaseResponse.includes('add') || 
      lowercaseResponse.includes('suggest'))) {
    return 'task-suggestion';
  }
  
  if (lowercaseResponse.includes('created') && lowercaseResponse.includes('task')) {
    return 'task-creation';
  }
  
  if (lowercaseResponse.includes('?') && 
     (lowercaseResponse.includes('what') || lowercaseResponse.includes('how') || 
      lowercaseResponse.includes('when') || lowercaseResponse.includes('why'))) {
    return 'question';
  }
  
  if (lowercaseResponse.includes('great') || lowercaseResponse.includes('good job') || 
     lowercaseResponse.includes('well done') || lowercaseResponse.includes('proud')) {
    return 'encouragement';
  }
  
  return 'general';
}

/**
 * Extract task titles from the AI response
 */
function extractTasksFromResponse(response: string): string[] {
  const tasks: string[] = [];
  
  // Look for numbered lists (1. Task description)
  const numberedListPattern = /\d+\.\s+([^\n]+)/g;
  let match;
  while ((match = numberedListPattern.exec(response)) !== null) {
    tasks.push(match[1].trim());
  }
  
  // Also look for bullet points
  const bulletListPattern = /[-•*]\s+([^\n]+)/g;
  while ((match = bulletListPattern.exec(response)) !== null) {
    tasks.push(match[1].trim());
  }
  
  // Deduplicate tasks
  return [...new Set(tasks)];
}
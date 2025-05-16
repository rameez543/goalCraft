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
  const userPrompt = conversationHistory.map(msg => 
    `${msg.role}: ${msg.content || "No content"}`
  ).join('\n');
  
  const llmResponse = await generateCompletion({
    model: getModel(),
    systemPrompt,
    userPrompt
  });

  // Add assistant response to history for future context
  conversationHistory.push({
    role: 'assistant',
    content: llmResponse
  });

  // Process response to determine type and any actions needed
  const responseType = determineResponseType(llmResponse, input.message);
  let tasksCreated = false;
  let tasksModified = false;
  let relatedTasks: string[] = [];

  // Check for task removal intent
  const removeTaskIntent = detectRemoveTaskIntent(input.message);
  const editTaskIntent = detectEditTaskIntent(input.message);
  
  // Handle task removal or editing if needed
  if ((removeTaskIntent || editTaskIntent) && specificGoal) {
    // Try to find the task mentioned in the message
    const taskMentioned = findTaskInMessage(input.message, specificGoal.tasks);
    
    if (taskMentioned) {
      if (removeTaskIntent) {
        // Remove the task from the goal
        const updatedTasks = specificGoal.tasks.filter(t => t.id !== taskMentioned.id);
        
        await storage.updateGoal(specificGoal.id, {
          tasks: updatedTasks
        });
        
        tasksModified = true;
        relatedTasks = updatedTasks.map(t => t.id);
      } 
      else if (editTaskIntent) {
        // Modify the task (mark as complete if that's the intent)
        const completionIntent = input.message.toLowerCase().includes('complete') || 
                               input.message.toLowerCase().includes('finished') ||
                               input.message.toLowerCase().includes('done');
        
        const updatedTasks = specificGoal.tasks.map(t => {
          if (t.id === taskMentioned.id) {
            // Create updated task object
            let updatedTask = { ...t };
            
            // Handle completion flag
            if (completionIntent) {
              updatedTask.completed = true;
              return updatedTask;
            }
            
            // Check for priority/complexity related keywords
            const lowercaseMsg = input.message.toLowerCase();
            
            // Set complexity based on priority keywords
            if (lowercaseMsg.includes('high priority') || 
                lowercaseMsg.includes('urgent') || 
                lowercaseMsg.includes('important') || 
                lowercaseMsg.includes('critical')) {
              updatedTask.complexity = 'high';
            } else if (lowercaseMsg.includes('medium priority') || 
                       lowercaseMsg.includes('moderate priority')) {
              updatedTask.complexity = 'medium';
            } else if (lowercaseMsg.includes('low priority') || 
                       lowercaseMsg.includes('not urgent')) {
              updatedTask.complexity = 'low';
            }
            
            // Check for difficulty-related keywords
            if (lowercaseMsg.includes('hard') || 
                lowercaseMsg.includes('difficult') || 
                lowercaseMsg.includes('challenging')) {
              updatedTask.complexity = 'high';
            } else if (lowercaseMsg.includes('medium difficulty') || 
                       lowercaseMsg.includes('moderate')) {
              updatedTask.complexity = 'medium';
            } else if (lowercaseMsg.includes('easy') || 
                       lowercaseMsg.includes('simple') || 
                       lowercaseMsg.includes('basic')) {
              updatedTask.complexity = 'low';
            }
            
            // Check for time estimates in the message
            const timeMatches = lowercaseMsg.match(/(\d+)\s*(?:min|minute|minutes)/);
            if (timeMatches && timeMatches[1]) {
              const minutes = parseInt(timeMatches[1]);
              if (!isNaN(minutes) && minutes > 0) {
                updatedTask.estimatedMinutes = minutes;
              }
            }
            
            // Check for due date information
            const dateMatches = lowercaseMsg.match(/(today|tomorrow|next week|on|due)/i);
            if (dateMatches) {
              // Simple date handling for common phrases
              const today = new Date();
              
              if (lowercaseMsg.includes('today')) {
                updatedTask.dueDate = today.toISOString();
              } else if (lowercaseMsg.includes('tomorrow')) {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                updatedTask.dueDate = tomorrow.toISOString();
              } else if (lowercaseMsg.includes('next week')) {
                const nextWeek = new Date(today);
                nextWeek.setDate(nextWeek.getDate() + 7);
                updatedTask.dueDate = nextWeek.toISOString();
              }
            }
            
            // Update the title if a new one is provided
            const newTitle = extractNewTaskTitleFromMessage(input.message);
            if (newTitle) {
              updatedTask.title = newTitle;
            }
            
            return updatedTask;
          }
          return t;
        });
        
        await storage.updateGoal(specificGoal.id, {
          tasks: updatedTasks
        });
        
        tasksModified = true;
        relatedTasks = updatedTasks.map(t => t.id);
      }
    }
  }

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
            subtasks: [],
            addedToCalendar: false,
            reminderEnabled: false,
            enableWhatsapp: false
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
            subtasks: [],
            addedToCalendar: false,
            reminderEnabled: false,
            enableWhatsapp: false
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
    tasksCreated: tasksCreated || tasksModified
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
 * Detect if the user's message is about removing a task
 */
function detectRemoveTaskIntent(message: string): boolean {
  const removeKeywords = [
    'remove', 'delete', 'eliminate', 'get rid of', 'cancel', 
    'drop', 'trash', 'erase', 'take off', 'destroy', 'kill',
    'wipe', 'clear'
  ];
  
  const lowercaseMessage = message.toLowerCase();
  return removeKeywords.some(keyword => lowercaseMessage.includes(keyword)) && 
         (lowercaseMessage.includes('task') || 
          lowercaseMessage.includes('to-do') || 
          lowercaseMessage.includes('item') || 
          lowercaseMessage.includes('it') ||
          /task\s+(\d+)/i.test(lowercaseMessage) ||
          /#(\d+)/.test(lowercaseMessage));
}

/**
 * Detect if the user's message is about editing a task
 */
function detectEditTaskIntent(message: string): boolean {
  const editKeywords = [
    'edit', 'change', 'update', 'modify', 'alter', 'revise', 
    'rename', 'adjust', 'call', 'name', 'set'
  ];
  
  const completionKeywords = [
    'complete', 'finish', 'done', 'mark', 'check off', 'check', 
    'completed', 'finished', 'did', 'accomplish', 'achieved', 'success'
  ];
  
  const lowercaseMessage = message.toLowerCase();
  
  // Special handling for completion-related edits
  if (completionKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
    return (lowercaseMessage.includes('task') || 
            lowercaseMessage.includes('to-do') || 
            lowercaseMessage.includes('item') || 
            lowercaseMessage.includes('it') ||
            /task\s+(\d+)/i.test(lowercaseMessage) ||
            /#(\d+)/.test(lowercaseMessage));
  }
  
  return editKeywords.some(keyword => lowercaseMessage.includes(keyword)) && 
         (lowercaseMessage.includes('task') || 
          lowercaseMessage.includes('to-do') || 
          lowercaseMessage.includes('item') || 
          lowercaseMessage.includes('it') ||
          /task\s+(\d+)/i.test(lowercaseMessage) ||
          /#(\d+)/.test(lowercaseMessage));
}

/**
 * Find a task mentioned in the user's message
 */
function findTaskInMessage(message: string, tasks: any[]): any | undefined {
  const lowercaseMessage = message.toLowerCase();
  let foundTask: any = undefined;
  
  // First try to find exact match by task title
  for (const task of tasks) {
    if (lowercaseMessage.includes(task.title.toLowerCase())) {
      return task;
    }
    
    // Also check for partial matches with at least 3 words in common
    const taskTitleWords = task.title.toLowerCase().split(' ').filter((w: string) => w.length > 2);
    const messageWords = lowercaseMessage.split(' ').filter(w => w.length > 2);
    
    let commonWords = 0;
    for (const titleWord of taskTitleWords) {
      if (messageWords.some(messageWord => messageWord.includes(titleWord) || titleWord.includes(messageWord))) {
        commonWords++;
      }
    }
    
    // If there are at least 3 common words or 50% of the title words match, it's likely the same task
    if (commonWords >= 3 || (taskTitleWords.length > 0 && commonWords / taskTitleWords.length >= 0.5)) {
      foundTask = task;
    }
  }
  
  if (foundTask) return foundTask;
  
  // If no exact match, try to find by keywords or task number mention
  // e.g., "the first task", "task 2", etc.
  const taskNumberMatch = message.match(/task\s+(\d+)/i) || message.match(/item\s+(\d+)/i) || message.match(/#(\d+)/);
  if (taskNumberMatch && taskNumberMatch[1]) {
    const taskNumber = parseInt(taskNumberMatch[1]);
    if (taskNumber > 0 && taskNumber <= tasks.length) {
      return tasks[taskNumber - 1];
    }
  }
  
  // Look for "the first/second/third task" mentions
  const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'last'];
  for (let i = 0; i < ordinals.length; i++) {
    const ordinal = ordinals[i];
    if (lowercaseMessage.includes(`${ordinal} task`) || 
        lowercaseMessage.includes(`${ordinal} item`) || 
        lowercaseMessage.includes(`${ordinal} one`)) {
      // Handle "last task" special case
      if (ordinal === 'last' && tasks.length > 0) {
        return tasks[tasks.length - 1];
      }
      // Otherwise return the corresponding task
      if (i < tasks.length) {
        return tasks[i];
      }
    }
  }
  
  // If there's only one task and it's unambiguously about modifying a task, return that
  if (tasks.length === 1 && (
    detectRemoveTaskIntent(message) || 
    detectEditTaskIntent(message) || 
    lowercaseMessage.includes('task')
  )) {
    return tasks[0];
  }
  
  return undefined;
}

/**
 * Extract a new task title from the user's message
 */
function extractNewTaskTitleFromMessage(message: string): string | null {
  // Try to find patterns with quotes first for more precise extraction
  const quotedMatch = message.match(/to\s+["']([^"']+)["']/i) || 
                     message.match(/as\s+["']([^"']+)["']/i);
  
  if (quotedMatch && quotedMatch[1]) {
    return quotedMatch[1].trim();
  }
  
  // Try to find "to X" pattern where X is the new task title
  const toMatch = message.match(/(?:change|rename|update|modify|edit|set)\s+(?:it|task|this|that)\s+to\s+([^,.!?]+)/i) || 
                 message.match(/to\s+([^,.!?]+)/i);
  
  if (toMatch && toMatch[1]) {
    return toMatch[1].trim();
  }
  
  // Try to find patterns like "rename task to X"
  const renameMatch = message.match(/rename\s+(?:the\s+)?(?:task\s+)?to\s+([^,.!?]+)/i) ||
                     message.match(/change\s+(?:the\s+)?(?:task\s+)?to\s+([^,.!?]+)/i);
  
  if (renameMatch && renameMatch[1]) {
    return renameMatch[1].trim();
  }
  
  // Look for "make it X" pattern
  const makeItMatch = message.match(/make\s+(?:it|this|that|the\s+task)\s+([^,.!?]+)/i);
  
  if (makeItMatch && makeItMatch[1]) {
    return makeItMatch[1].trim();
  }
  
  // Look for patterns where the task name comes after words like "call it" or "name it"
  const callItMatch = message.match(/(?:call|name)\s+(?:it|this|that|the\s+task)\s+([^,.!?]+)/i);
  
  if (callItMatch && callItMatch[1]) {
    return callItMatch[1].trim();
  }
  
  return null;
}

/**
 * Try to find a goal based on the user's message
 */
function findGoalFromMessage(message: string, goals: Goal[]): Goal | undefined {
  const lowercaseMessage = message.toLowerCase();
  
  // Look for goals mentioned by title
  for (const goal of goals) {
    if (lowercaseMessage.includes(goal.title.toLowerCase())) {
      return goal;
    }
    
    // Also check for partial matches with at least 3 words in common
    const goalTitleWords = goal.title.toLowerCase().split(' ').filter((w: string) => w.length > 2);
    const messageWords = lowercaseMessage.split(' ').filter(w => w.length > 2);
    
    let commonWords = 0;
    for (const titleWord of goalTitleWords) {
      if (messageWords.some(messageWord => messageWord.includes(titleWord) || titleWord.includes(messageWord))) {
        commonWords++;
      }
    }
    
    // If there are at least 3 common words or 50% of the title words match, it's likely the same goal
    if (commonWords >= 3 || (goalTitleWords.length > 0 && commonWords / goalTitleWords.length >= 0.5)) {
      return goal;
    }
  }
  
  // If not found by title, try to find by looking at goal number mentions
  // e.g. "goal 1", "first goal", etc.
  const goalNumberMatch = message.match(/goal\s+(\d+)/i) || message.match(/#(\d+)/);
  if (goalNumberMatch && goalNumberMatch[1]) {
    const goalNumber = parseInt(goalNumberMatch[1]);
    if (goalNumber > 0 && goalNumber <= goals.length) {
      return goals[goalNumber - 1];
    }
  }
  
  // Check for ordinals
  const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'last'];
  for (let i = 0; i < ordinals.length; i++) {
    const ordinal = ordinals[i];
    if (lowercaseMessage.includes(`${ordinal} goal`) || 
        lowercaseMessage.includes(`${ordinal} project`)) {
      if (ordinal === 'last' && goals.length > 0) {
        return goals[goals.length - 1];
      } else if (i < goals.length) {
        return goals[i];
      }
    }
  }
  
  // If we couldn't find a specific goal but there's only one goal, return that
  if (goals.length === 1) {
    return goals[0];
  }
  
  return undefined;
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
  return Array.from(new Set(tasks));
}
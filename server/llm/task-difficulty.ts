import { generateCompletion, getModel } from './providers';

/**
 * Analyzes a task description to determine its complexity level
 * @param taskTitle The title or description of the task
 * @param context Additional context about the task (optional)
 * @returns The complexity level: 'high', 'medium', or 'low'
 */
export async function analyzeTaskDifficulty(
  taskTitle: string,
  context?: string
): Promise<'high' | 'medium' | 'low'> {
  const systemPrompt = `
You are an assistant that helps analyze tasks to determine their complexity level.
Analyze the task provided and categorize it as:
- 'high': Complex, time-consuming tasks requiring significant effort or expertise
- 'medium': Moderate difficulty tasks requiring some thought but not overwhelming
- 'low': Simple, straightforward tasks that can be completed quickly

Provide ONLY the complexity level in your response, nothing else.
`;

  const taskContext = context ? `\nAdditional context: ${context}` : '';
  const userPrompt = `Task: ${taskTitle}${taskContext}`;
  
  try {
    const response = await generateCompletion({
      model: getModel('gpt-4o-mini'),
      systemPrompt,
      userPrompt
    });
    
    const complexity = response.trim().toLowerCase();
    
    // Normalize the response
    if (complexity.includes('high')) return 'high';
    if (complexity.includes('medium')) return 'medium';
    if (complexity.includes('low')) return 'low';
    
    // Default to medium if the response doesn't match expected values
    return 'medium';
  } catch (error) {
    console.error('Error analyzing task difficulty:', error);
    // Default to medium difficulty if analysis fails
    return 'medium';
  }
}
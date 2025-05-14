import OpenAI from "openai";
import { Task } from "@shared/schema";
import { nanoid } from "nanoid";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TaskBreakdownResponse {
  tasks: {
    title: string;
    estimatedMinutes: number;
    complexity: 'low' | 'medium' | 'high';
    context?: string; // Additional context about the task for AI
    actionItems?: string[]; // Specific action items for this task
    subtasks?: {
      title: string;
      estimatedMinutes: number;
      context?: string; // Additional context about the subtask
    }[];
  }[];
  totalEstimatedMinutes: number;
  overallSuggestions?: string; // General suggestions for approaching the goal
}

export async function breakdownGoal(
  goalTitle: string, 
  timeConstraintMinutes?: number,
  additionalInfo?: string
): Promise<{ tasks: Task[], totalEstimatedMinutes: number, overallSuggestions?: string }> {
  try {
    let timeConstraintText = "";
    if (timeConstraintMinutes) {
      timeConstraintText = `
      IMPORTANT: The user has specified that they need to complete this goal within ${timeConstraintMinutes} minutes.
      Please optimize your task breakdown to fit within this timeframe and prioritize accordingly.
      `;
    }
    
    let additionalInfoText = "";
    if (additionalInfo && additionalInfo.trim()) {
      additionalInfoText = `
      The user has provided additional context about this goal:
      "${additionalInfo}"
      
      Use this information to create a more accurate and relevant task breakdown.
      `;
    }
    
    const prompt = `
      Break down the following goal into manageable tasks and subtasks with detailed time estimates and rich contextual information:
      
      Goal: "${goalTitle}"
      
      ${timeConstraintText}
      ${additionalInfoText}
      
      IMPORTANT TASK BREAKDOWN GUIDELINES:
      - Analyze this goal deeply and provide a comprehensive breakdown into 5-10 specific, actionable tasks.
      - For every task, include 2-5 detailed subtasks that are specific, measurable, and achievable.
      - Make sure each task and subtask has a clear outcome that can be marked as completed.
      - Use active verbs at the beginning of task titles (e.g., "Create", "Implement", "Research", "Design").
      - Ensure tasks are sequenced in a logical order of execution.
      - Break down complex operations into smaller, manageable pieces.
      - If the goal involves learning something new, include research and practice tasks with specific outcomes.
      
      FOR EACH TASK, PROVIDE:
      1. A clear, specific title (10 words or less)
      2. Realistic time estimates in minutes (be generous for complex tasks)
      3. Complexity assessment (low, medium, high) based on skill required and cognitive load
      4. Detailed context explaining WHY this task matters and HOW to approach it effectively (3-5 sentences)
      5. 2-4 specific action items that provide step-by-step guidance
      
      FOR EACH SUBTASK, PROVIDE:
      1. A specific, actionable title (8 words or less)
      2. Accurate time estimates in minutes
      3. Rich contextual information explaining exactly how to complete this subtask (2-3 sentences)
      
      TIME ESTIMATION GUIDELINES:
      - For unfamiliar activities, add 50% more time than you think is needed
      - Consider setup time, learning curves, and potential roadblocks
      - Break down estimates to specific minutes (not rounded hours)
      - If the user provided a time constraint, ensure tasks are prioritized to fit within it
      
      Return your response as a JSON object with the following structure:
      {
        "tasks": [
          {
            "title": "Clear, specific task title with action verb",
            "estimatedMinutes": 45,
            "complexity": "medium",
            "context": "Detailed explanation of this task's importance and approach. Include specific guidance on methodology, tools to use, and expected outcome. Offer insights that would help someone unfamiliar with this type of task.",
            "actionItems": [
              "Specific step 1 with exact details on what to do",
              "Specific step 2 with guidance on potential challenges",
              "Specific step 3 with clear success criteria"
            ],
            "subtasks": [
              { 
                "title": "Clear subtask title with action verb", 
                "estimatedMinutes": 20,
                "context": "Precise instructions for this subtask including specific approach, potential challenges, and how to verify completion." 
              },
              { 
                "title": "Another specific subtask", 
                "estimatedMinutes": 25,
                "context": "Detailed context explaining exactly how to complete this specific component, including any resources needed and verification steps." 
              }
            ]
          }
        ],
        "totalEstimatedMinutes": 200,
        "overallSuggestions": "Provide 3-5 strategic recommendations for approaching this goal effectively. Include potential roadblocks to anticipate, efficiency tips, resources that might help, and success criteria for the overall goal. Offer encouragement and highlight the most critical aspects to focus on."
      }
      
      FINAL REQUIREMENTS:
      - Make every task and subtask title specific, actionable, and measurable
      - Ensure the total time is the sum of all task estimated times (double-check your math)
      - Provide DETAILED context for ALL tasks and subtasks that gives meaningful guidance
      - Focus on practical advice that someone could follow without additional research
      - If the goal is technical, include specific technical guidance in the context
      - If the goal is creative, provide specific creative approaches and examples
      - If the goal is learning-oriented, break down the learning process into concrete steps
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are TaskBreaker AI, a world-class productivity expert and project manager specializing in breaking down goals into manageable, actionable tasks.

Your expertise includes:
- Analyzing complex goals and creating structured, logical task breakdowns
- Providing accurate time estimates based on task complexity and dependencies
- Creating clear, actionable task descriptions with specific guidance
- Identifying potential roadblocks and suggesting effective strategies
- Adapting task breakdowns to fit time constraints when specified
- Breaking learning processes into concrete, measurable steps
- Organizing tasks in optimal sequence for efficient execution

Your task breakdown is exceptional because you:
1. Use active verbs and clear language
2. Create specific, measurable outcomes for each task
3. Provide detailed context that explains WHY each task matters
4. Include step-by-step guidance on HOW to complete each task
5. Consider skill levels and learning curves in time estimates
6. Highlight dependencies between tasks
7. Balance thoroughness with practicality

Always maintain a helpful, encouraging tone while providing highly detailed, actionable advice tailored to the specific goal.`
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsedResponse = JSON.parse(content) as TaskBreakdownResponse;
    
    // Transform to our data model with IDs, time estimates, and context
    const tasks: Task[] = parsedResponse.tasks.map(task => ({
      id: nanoid(),
      title: task.title,
      completed: false,
      estimatedMinutes: task.estimatedMinutes,
      complexity: task.complexity,
      context: task.context,
      actionItems: task.actionItems,
      subtasks: task.subtasks 
        ? task.subtasks.map(subtask => ({
            id: nanoid(),
            title: subtask.title,
            completed: false,
            estimatedMinutes: subtask.estimatedMinutes,
            context: subtask.context
          }))
        : []
    }));

    return {
      tasks,
      totalEstimatedMinutes: parsedResponse.totalEstimatedMinutes,
      overallSuggestions: parsedResponse.overallSuggestions
    };
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error(`Failed to break down goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

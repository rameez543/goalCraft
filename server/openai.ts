import OpenAI from "openai";
import { Task } from "@shared/schema";
import { nanoid } from "nanoid";

// Using gpt-4o-mini as per user request for better cost-efficiency
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TaskBreakdownResponse {
  tasks: {
    title: string;
    estimatedMinutes: number;
    complexity: 'low' | 'medium' | 'high';
    context?: string; // Additional context about the task for AI
    actionItems?: string[]; // Specific action items for this task
    dueDate?: string; // Due date for the task (ISO string)
    subtasks?: {
      title: string;
      estimatedMinutes: number;
      context?: string; // Additional context about the subtask
      dueDate?: string; // Due date for the subtask (ISO string)
    }[];
  }[];
  totalEstimatedMinutes: number;
  overallSuggestions?: string; // General suggestions for approaching the goal
}

/**
 * Performs a chain-of-thought analysis on the goal to gather more context
 * before performing the actual breakdown
 */
async function analyzeGoalWithChainOfThought(
  goalTitle: string,
  timeConstraintMinutes?: number,
  additionalInfo?: string
): Promise<string> {
  console.log(`Starting chain-of-thought analysis for goal: "${goalTitle}"`);
  try {
    const prompt = `
    I need to break down this goal into actionable tasks:
    
    Goal: "${goalTitle}"
    ${timeConstraintMinutes ? `Time Constraint: ${timeConstraintMinutes} minutes` : ''}
    ${additionalInfo ? `Additional Information: ${additionalInfo}` : ''}
    
    Before creating a structured task breakdown, I'll think through what this goal might involve and what context I should consider:
    
    1. What domain knowledge is required for this goal?
    2. What might be the implicit steps or prerequisites not stated directly?
    3. Are there potential bottlenecks or challenging aspects to consider?
    4. What technical, creative, or logistical components might be involved?
    5. What resources or skills might be needed?
    6. If there's a time constraint, how should priorities be adjusted?
    7. What common pitfalls or roadblocks might occur?
    8. What would make for a successful outcome?
    
    Provide a detailed chain-of-thought analysis (5-10 paragraphs) about this goal before breaking it down.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing goals and projects. You excel at identifying unstated requirements, 
          potential challenges, and important context that would help in breaking down a goal into tasks. 
          Your analysis should be thorough, insightful, and cover multiple perspectives on the goal.`
        },
        { role: "user", content: prompt }
      ]
    });
    
    const analysis = response.choices[0].message.content || '';
    console.log(`Completed chain-of-thought analysis for goal: "${goalTitle}"`);
    console.log(`Analysis length: ${analysis.length} characters`);
    return analysis;
  } catch (error) {
    console.error("Error in goal analysis:", error);
    // Log the error but continue with task breakdown without the analysis
    console.log(`Chain-of-thought analysis failed for goal: "${goalTitle}", proceeding without analysis`);
    return ""; // Return empty string on error
  }
}

export async function breakdownGoal(
  goalTitle: string, 
  timeConstraintMinutes?: number,
  additionalInfo?: string
): Promise<{ tasks: Task[], totalEstimatedMinutes: number, overallSuggestions?: string }> {
  try {
    // First, perform chain-of-thought analysis to gather more context
    const goalAnalysis = await analyzeGoalWithChainOfThought(goalTitle, timeConstraintMinutes, additionalInfo);
    
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
    
    let analysisText = "";
    if (goalAnalysis && goalAnalysis.trim()) {
      analysisText = `
      CHAIN-OF-THOUGHT ANALYSIS:
      ${goalAnalysis}
      
      Use this detailed analysis to inform your task breakdown, considering all the aspects, potential challenges, 
      and context identified above.
      `;
    }
    
    const prompt = `
      Break down the following goal into manageable tasks and subtasks with detailed time estimates and rich contextual information:
      
      Goal: "${goalTitle}"
      
      ${timeConstraintText}
      ${additionalInfoText}
      ${analysisText}
      
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
      6. A suggested due date in ISO format (YYYY-MM-DD) based on task complexity and dependencies
      
      FOR EACH SUBTASK, PROVIDE:
      1. A specific, actionable title (8 words or less)
      2. Accurate time estimates in minutes
      3. Rich contextual information explaining exactly how to complete this subtask (2-3 sentences)
      4. A suggested due date in ISO format (YYYY-MM-DD) that falls before the parent task due date
      
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
      model: "gpt-4o-mini",
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
      dueDate: task.dueDate,
      addedToCalendar: false,
      reminderEnabled: false,
      reminderTime: undefined,
      enableWhatsapp: false,
      whatsappNumber: undefined,
      reminderFrequency: 'task-only',
      subtasks: task.subtasks 
        ? task.subtasks.map(subtask => ({
            id: nanoid(),
            title: subtask.title,
            completed: false,
            estimatedMinutes: subtask.estimatedMinutes,
            context: subtask.context,
            dueDate: subtask.dueDate,
            addedToCalendar: false
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

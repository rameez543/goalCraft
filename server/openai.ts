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
      Break down the following goal into manageable tasks and subtasks with time estimates and contextual information:
      
      Goal: "${goalTitle}"
      
      ${timeConstraintText}
      ${additionalInfoText}
      
      Please analyze this goal and provide a comprehensive breakdown into 5-10 specific, actionable tasks.
      For every task, include 2-5 subtasks with detailed breakdown.
      
      For each task and subtask:
      1. Estimate the time needed in minutes
      2. Assess the complexity (low, medium, high)
      3. Provide useful context and recommendations
      4. Include specific action items for major tasks
      
      Return your response as a JSON object with the following structure:
      {
        "tasks": [
          {
            "title": "Task title",
            "estimatedMinutes": 30,
            "complexity": "medium",
            "context": "Detailed information about this task, including why it's important and any considerations",
            "actionItems": [
              "Specific action 1 to complete this task",
              "Specific action 2 to complete this task"
            ],
            "subtasks": [
              { 
                "title": "Subtask 1 title", 
                "estimatedMinutes": 15,
                "context": "Specific context about this subtask" 
              },
              { 
                "title": "Subtask 2 title", 
                "estimatedMinutes": 15,
                "context": "Specific context about this subtask" 
              }
            ]
          },
          {
            "title": "Another task",
            "estimatedMinutes": 20,
            "complexity": "low",
            "context": "Contextual information for this task",
            "actionItems": ["Specific action for this task"],
            "subtasks": [
              { 
                "title": "Subtask for the second task", 
                "estimatedMinutes": 10,
                "context": "Context for this subtask" 
              },
              { 
                "title": "Another subtask", 
                "estimatedMinutes": 10,
                "context": "Context for this subtask" 
              }
            ]
          }
        ],
        "totalEstimatedMinutes": 50,
        "overallSuggestions": "General recommendations for approaching this goal effectively, including potential roadblocks to watch for and strategies for success."
      }
      
      Make all tasks and subtasks specific, actionable, and measurable. Be detailed and practical.
      The total time should be the sum of all task estimated times.
      Include DETAILED context for ALL tasks and subtasks to help the user understand how to approach them.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a productivity expert specializing in breaking down goals into manageable, actionable tasks with accurate time estimates."
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

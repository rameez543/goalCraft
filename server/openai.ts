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
    subtasks?: {
      title: string;
      estimatedMinutes: number;
    }[];
  }[];
  totalEstimatedMinutes: number;
}

export async function breakdownGoal(
  goalTitle: string, 
  timeConstraintMinutes?: number,
  additionalInfo?: string
): Promise<{ tasks: Task[], totalEstimatedMinutes: number }> {
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
      Break down the following goal into manageable tasks and subtasks with time estimates:
      
      Goal: "${goalTitle}"
      
      ${timeConstraintText}
      ${additionalInfoText}
      
      Please analyze this goal and provide a comprehensive breakdown into 5-10 specific, actionable tasks.
      For tasks that need further breakdown, include 1-3 subtasks.
      
      For each task and subtask, estimate the time needed in minutes and assess the complexity (low, medium, high).
      
      Return your response as a JSON object with the following structure:
      {
        "tasks": [
          {
            "title": "Task title",
            "estimatedMinutes": 30,
            "complexity": "medium",
            "subtasks": [
              { "title": "Subtask 1 title", "estimatedMinutes": 15 },
              { "title": "Subtask 2 title", "estimatedMinutes": 15 }
            ]
          },
          {
            "title": "Another task with no subtasks",
            "estimatedMinutes": 20,
            "complexity": "low"
          }
        ],
        "totalEstimatedMinutes": 50
      }
      
      Make all tasks and subtasks specific, actionable, and measurable. Don't be generic.
      The total time should be the sum of all task estimated times.
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
    
    // Transform to our data model with IDs and time estimates
    const tasks: Task[] = parsedResponse.tasks.map(task => ({
      id: nanoid(),
      title: task.title,
      completed: false,
      estimatedMinutes: task.estimatedMinutes,
      complexity: task.complexity,
      subtasks: task.subtasks 
        ? task.subtasks.map(subtask => ({
            id: nanoid(),
            title: subtask.title,
            completed: false,
            estimatedMinutes: subtask.estimatedMinutes
          }))
        : []
    }));

    return {
      tasks,
      totalEstimatedMinutes: parsedResponse.totalEstimatedMinutes
    };
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error(`Failed to break down goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

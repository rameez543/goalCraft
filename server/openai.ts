import OpenAI from "openai";
import { Task } from "@shared/schema";
import { nanoid } from "nanoid";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TaskBreakdownResponse {
  tasks: {
    title: string;
    subtasks?: {
      title: string;
    }[];
  }[];
}

export async function breakdownGoal(goalTitle: string): Promise<Task[]> {
  try {
    const prompt = `
      Break down the following goal into manageable tasks and subtasks:
      
      Goal: "${goalTitle}"
      
      Please analyze this goal and provide a comprehensive breakdown into 5-10 specific, actionable tasks.
      For tasks that need further breakdown, include 1-3 subtasks.
      
      Return your response as a JSON object with the following structure:
      {
        "tasks": [
          {
            "title": "Task title",
            "subtasks": [
              { "title": "Subtask 1 title" },
              { "title": "Subtask 2 title" }
            ]
          },
          {
            "title": "Another task with no subtasks"
          }
        ]
      }
      
      Make all tasks and subtasks specific, actionable, and measurable. Don't be generic.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a productivity expert specializing in breaking down goals into manageable, actionable tasks."
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
    
    // Transform to our data model with IDs
    const tasks: Task[] = parsedResponse.tasks.map(task => ({
      id: nanoid(),
      title: task.title,
      completed: false,
      subtasks: task.subtasks 
        ? task.subtasks.map(subtask => ({
            id: nanoid(),
            title: subtask.title,
            completed: false
          }))
        : []
    }));

    return tasks;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error(`Failed to break down goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

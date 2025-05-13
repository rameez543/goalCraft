import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { breakdownGoal } from "./openai";
import { createGoalSchema, updateTaskSchema, updateSubtaskSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new goal
  app.post("/api/goals", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = createGoalSchema.parse(req.body);
      
      // Use OpenAI to break down the goal into tasks
      const tasks = await breakdownGoal(validatedData.title);
      
      // Create and store the goal
      const goal = await storage.createGoal({
        title: validatedData.title,
        tasks,
        userId: "anonymous", // Default user ID until we implement authentication
        createdAt: new Date().toISOString(),
        progress: 0
      });
      
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
        return;
      }
      
      console.error("Error creating goal:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create goal" 
      });
    }
  });

  // Get all goals
  app.get("/api/goals", async (_req: Request, res: Response) => {
    try {
      const goals = await storage.getGoals();
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch goals" 
      });
    }
  });

  // Get a specific goal
  app.get("/api/goals/:id", async (req: Request, res: Response) => {
    try {
      const goalId = parseInt(req.params.id);
      if (isNaN(goalId)) {
        res.status(400).json({ message: "Invalid goal ID" });
        return;
      }

      const goal = await storage.getGoal(goalId);
      if (!goal) {
        res.status(404).json({ message: "Goal not found" });
        return;
      }

      res.json(goal);
    } catch (error) {
      console.error("Error fetching goal:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch goal" 
      });
    }
  });

  // Delete a goal
  app.delete("/api/goals/:id", async (req: Request, res: Response) => {
    try {
      const goalId = parseInt(req.params.id);
      if (isNaN(goalId)) {
        res.status(400).json({ message: "Invalid goal ID" });
        return;
      }

      const success = await storage.deleteGoal(goalId);
      if (!success) {
        res.status(404).json({ message: "Goal not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete goal" 
      });
    }
  });

  // Update task completion status
  app.patch("/api/tasks", async (req: Request, res: Response) => {
    try {
      const validatedData = updateTaskSchema.parse(req.body);
      
      const updatedGoal = await storage.updateTaskCompletion(
        validatedData.goalId,
        validatedData.taskId,
        validatedData.completed
      );
      
      if (!updatedGoal) {
        res.status(404).json({ message: "Goal or task not found" });
        return;
      }
      
      res.json(updatedGoal);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
        return;
      }
      
      console.error("Error updating task:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update task" 
      });
    }
  });

  // Update subtask completion status
  app.patch("/api/subtasks", async (req: Request, res: Response) => {
    try {
      const validatedData = updateSubtaskSchema.parse(req.body);
      
      const updatedGoal = await storage.updateSubtaskCompletion(
        validatedData.goalId,
        validatedData.taskId,
        validatedData.subtaskId,
        validatedData.completed
      );
      
      if (!updatedGoal) {
        res.status(404).json({ message: "Goal, task, or subtask not found" });
        return;
      }
      
      res.json(updatedGoal);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
        return;
      }
      
      console.error("Error updating subtask:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update subtask" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

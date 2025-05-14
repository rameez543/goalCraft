import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { breakdownGoal } from "./openai";
import { generateCoachingMessage, generateRoadblockTips, discussTaskWithAI } from "./ai-coach";
import { 
  createGoalSchema, 
  updateTaskSchema, 
  updateSubtaskSchema, 
  progressUpdateSchema, 
  roadblockSchema 
} from "@shared/schema";
import { 
  notifyGoalCreated, 
  notifyTaskCompleted, 
  notifyProgressUpdate, 
  notifyRoadblock, 
  NotificationChannel 
} from "./notifications";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new goal
  app.post("/api/goals", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = createGoalSchema.parse(req.body);
      
      // Use OpenAI to break down the goal into tasks with time estimates and context
      const { tasks, totalEstimatedMinutes, overallSuggestions } = await breakdownGoal(
        validatedData.title,
        validatedData.timeConstraintMinutes,
        validatedData.additionalInfo
      );
      
      // Authentication temporarily disabled
      // const userId = req.isAuthenticated() && req.user 
      //   ? (req.user as any).username || "anonymous"
      //   : "anonymous";
      
      // Use anonymous user ID for all users temporarily
      const userId = "anonymous";
      
      // Parse notification channels from request if provided
      let notificationChannels: string[] = [];
      if (req.body.notificationChannels && Array.isArray(req.body.notificationChannels)) {
        notificationChannels = req.body.notificationChannels;
      }
      
      const goal = await storage.createGoal({
        title: validatedData.title,
        tasks,
        userId,
        createdAt: new Date().toISOString(),
        progress: 0,
        totalEstimatedMinutes,
        timeConstraintMinutes: validatedData.timeConstraintMinutes,
        additionalInfo: validatedData.additionalInfo,
        overallSuggestions: overallSuggestions,
        notificationChannels: notificationChannels,
        lastProgressUpdate: null,
        roadblocks: null
      });
      
      // Send notification asynchronously (don't await)
      notifyGoalCreated(goal, notificationChannels as NotificationChannel[])
        .catch(err => console.error("Failed to send goal creation notification:", err));
      
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
  app.get("/api/goals", async (req: Request, res: Response) => {
    try {
      // Authentication temporarily disabled - always return all goals
      let goals;
      
      // if (req.isAuthenticated() && req.user) {
      //   const userId = (req.user as any).username || "anonymous";
      //   goals = await storage.getGoals(userId);
      // } else {
      //   // Return empty array if not authenticated
      //   goals = [];
      // }
      
      // Temporarily get all goals without authentication
      goals = await storage.getGoals();
      
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
  
  // Edit task details
  app.patch("/api/tasks/edit", async (req: Request, res: Response) => {
    try {
      const { goalId, taskId, title, context, actionItems } = req.body;
      
      if (!goalId || !taskId) {
        res.status(400).json({ message: "Goal ID and task ID are required" });
        return;
      }
      
      // Get the goal
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        res.status(404).json({ message: "Goal not found" });
        return;
      }
      
      // Find the task in the goal
      const taskIndex = goal.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        res.status(404).json({ message: "Task not found" });
        return;
      }
      
      // Update the task
      const updatedTasks = [...goal.tasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        ...(title !== undefined ? { title } : {}),
        ...(context !== undefined ? { context } : {}),
        ...(actionItems !== undefined ? { actionItems } : {})
      };
      
      // Save the updated goal
      const updatedGoal = await storage.updateGoal(goalId, { tasks: updatedTasks });
      
      if (!updatedGoal) {
        res.status(500).json({ message: "Failed to update task" });
        return;
      }
      
      res.json(updatedGoal);
    } catch (error) {
      console.error("Error editing task:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to edit task" 
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
  
  // Edit subtask details
  app.patch("/api/subtasks/edit", async (req: Request, res: Response) => {
    try {
      const { goalId, taskId, subtaskId, title, context } = req.body;
      
      if (!goalId || !taskId || !subtaskId) {
        res.status(400).json({ message: "Goal ID, task ID, and subtask ID are required" });
        return;
      }
      
      // Get the goal
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        res.status(404).json({ message: "Goal not found" });
        return;
      }
      
      // Find the task in the goal
      const taskIndex = goal.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        res.status(404).json({ message: "Task not found" });
        return;
      }
      
      // Find the subtask in the task
      const subtaskIndex = goal.tasks[taskIndex].subtasks.findIndex(s => s.id === subtaskId);
      if (subtaskIndex === -1) {
        res.status(404).json({ message: "Subtask not found" });
        return;
      }
      
      // Update the subtask
      const updatedTasks = [...goal.tasks];
      const updatedSubtasks = [...updatedTasks[taskIndex].subtasks];
      updatedSubtasks[subtaskIndex] = {
        ...updatedSubtasks[subtaskIndex],
        ...(title !== undefined ? { title } : {}),
        ...(context !== undefined ? { context } : {})
      };
      
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        subtasks: updatedSubtasks
      };
      
      // Save the updated goal
      const updatedGoal = await storage.updateGoal(goalId, { tasks: updatedTasks });
      
      if (!updatedGoal) {
        res.status(500).json({ message: "Failed to update subtask" });
        return;
      }
      
      res.json(updatedGoal);
    } catch (error) {
      console.error("Error editing subtask:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to edit subtask" 
      });
    }
  });
  
  // Add progress update for a goal
  app.post("/api/goals/:id/progress", async (req: Request, res: Response) => {
    try {
      const goalId = parseInt(req.params.id);
      if (isNaN(goalId)) {
        res.status(400).json({ message: "Invalid goal ID" });
        return;
      }
      
      const validatedData = progressUpdateSchema.parse({
        ...req.body,
        goalId
      });
      
      // Get the goal
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        res.status(404).json({ message: "Goal not found" });
        return;
      }
      
      // Save progress update to goal
      const updatedGoal = await storage.updateGoal(goalId, {
        lastProgressUpdate: validatedData.updateMessage
      });
      
      if (!updatedGoal) {
        res.status(404).json({ message: "Failed to update goal" });
        return;
      }
      
      // Send notifications (async)
      const contactEmail = req.body.contactEmail;
      const contactPhone = req.body.contactPhone;
      const notifyChannels = validatedData.notifyChannels || [];
      
      notifyProgressUpdate(
        updatedGoal, 
        validatedData.updateMessage,
        notifyChannels as NotificationChannel[],
        contactEmail,
        contactPhone
      ).catch(err => console.error("Failed to send progress update notification:", err));
      
      res.json(updatedGoal);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
        return;
      }
      
      console.error("Error adding progress update:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to add progress update" 
      });
    }
  });
  
  // Report roadblock for a goal
  app.post("/api/goals/:id/roadblock", async (req: Request, res: Response) => {
    try {
      const goalId = parseInt(req.params.id);
      if (isNaN(goalId)) {
        res.status(400).json({ message: "Invalid goal ID" });
        return;
      }
      
      const validatedData = roadblockSchema.parse({
        ...req.body,
        goalId
      });
      
      // Get the goal
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        res.status(404).json({ message: "Goal not found" });
        return;
      }
      
      // Save roadblock to goal
      const updatedGoal = await storage.updateGoal(goalId, {
        roadblocks: validatedData.description
      });
      
      if (!updatedGoal) {
        res.status(404).json({ message: "Failed to update goal" });
        return;
      }
      
      // Send notifications (async)
      const contactEmail = req.body.contactEmail;
      const contactPhone = req.body.contactPhone;
      const notifyChannels = validatedData.notifyChannels || [];
      
      notifyRoadblock(
        updatedGoal, 
        validatedData.description,
        notifyChannels as NotificationChannel[],
        contactEmail,
        contactPhone
      ).catch(err => console.error("Failed to send roadblock notification:", err));
      
      res.json(updatedGoal);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
        return;
      }
      
      console.error("Error reporting roadblock:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to report roadblock" 
      });
    }
  });

  // Get an AI coaching message
  app.get("/api/coach/message", async (req: Request, res: Response) => {
    try {
      // Get all goals to analyze
      const goals = await storage.getGoals();
      
      // Get user name if authenticated (currently anonymous)
      const userName = "there"; // Use "there" as default
      
      // Generate the coaching message
      const coachMessage = await generateCoachingMessage(goals, userName);
      
      res.json(coachMessage);
    } catch (error) {
      console.error("Error generating coaching message:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate coaching message",
        type: "encouragement" 
      });
    }
  });
  
  // Get AI tips for overcoming a roadblock
  app.get("/api/coach/roadblock-tips/:goalId", async (req: Request, res: Response) => {
    try {
      const goalId = parseInt(req.params.goalId);
      if (isNaN(goalId)) {
        res.status(400).json({ message: "Invalid goal ID" });
        return;
      }
      
      // Get the goal
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        res.status(404).json({ message: "Goal not found" });
        return;
      }
      
      // Check if the goal has a roadblock
      if (!goal.roadblocks) {
        res.status(400).json({ message: "No roadblock reported for this goal" });
        return;
      }
      
      // Generate tips for overcoming the roadblock
      const tips = await generateRoadblockTips(goal);
      
      res.json({ tips });
    } catch (error) {
      console.error("Error generating roadblock tips:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate roadblock tips" 
      });
    }
  });
  
  // Update task scheduling (due date, calendar, reminders)
  app.patch("/api/tasks/schedule", async (req: Request, res: Response) => {
    try {
      const { goalId, taskId, updates } = req.body;
      
      if (!goalId || !taskId || !updates) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }
      
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        res.status(404).json({ message: "Goal not found" });
        return;
      }
      
      // Find the task to update
      const taskIndex = goal.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        res.status(404).json({ message: "Task not found" });
        return;
      }
      
      // Create updated task with scheduling information
      const updatedTask = {
        ...goal.tasks[taskIndex],
        ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
        ...(updates.addedToCalendar !== undefined && { addedToCalendar: updates.addedToCalendar }),
        ...(updates.reminderEnabled !== undefined && { reminderEnabled: updates.reminderEnabled }),
        ...(updates.reminderTime !== undefined && { reminderTime: updates.reminderTime })
      };
      
      // Update the task in the goal
      const updatedTasks = [...goal.tasks];
      updatedTasks[taskIndex] = updatedTask;
      
      // Save the updated goal
      const updatedGoal = await storage.updateGoal(goalId, {
        tasks: updatedTasks
      });
      
      if (!updatedGoal) {
        res.status(500).json({ message: "Failed to update task schedule" });
        return;
      }
      
      res.json(updatedGoal);
    } catch (error) {
      console.error("Error updating task schedule:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update task schedule" 
      });
    }
  });
  
  // Update subtask scheduling (due date, calendar)
  app.patch("/api/subtasks/schedule", async (req: Request, res: Response) => {
    try {
      const { goalId, taskId, subtaskId, updates } = req.body;
      
      if (!goalId || !taskId || !subtaskId || !updates) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }
      
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        res.status(404).json({ message: "Goal not found" });
        return;
      }
      
      // Find the task containing the subtask
      const taskIndex = goal.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        res.status(404).json({ message: "Task not found" });
        return;
      }
      
      // Find the subtask to update
      const task = goal.tasks[taskIndex];
      const subtaskIndex = task.subtasks.findIndex(s => s.id === subtaskId);
      if (subtaskIndex === -1) {
        res.status(404).json({ message: "Subtask not found" });
        return;
      }
      
      // Create updated subtask with scheduling information
      const updatedSubtask = {
        ...task.subtasks[subtaskIndex],
        ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
        ...(updates.addedToCalendar !== undefined && { addedToCalendar: updates.addedToCalendar })
      };
      
      // Update the subtask in the task
      const updatedSubtasks = [...task.subtasks];
      updatedSubtasks[subtaskIndex] = updatedSubtask;
      
      // Update the task with the updated subtasks
      const updatedTask = {
        ...task,
        subtasks: updatedSubtasks
      };
      
      // Update the task in the goal
      const updatedTasks = [...goal.tasks];
      updatedTasks[taskIndex] = updatedTask;
      
      // Save the updated goal
      const updatedGoal = await storage.updateGoal(goalId, {
        tasks: updatedTasks
      });
      
      if (!updatedGoal) {
        res.status(500).json({ message: "Failed to update subtask schedule" });
        return;
      }
      
      res.json(updatedGoal);
    } catch (error) {
      console.error("Error updating subtask schedule:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update subtask schedule" 
      });
    }
  });
  
  // User settings update endpoint
  app.patch("/api/user/settings", async (req: Request, res: Response) => {
    try {
      // In a real app, this would save to user's profile in the database
      // For now, we'll just return success since settings are stored in localStorage
      
      const settings = req.body;
      
      // Validate settings
      if (settings.enableWhatsappNotifications && !settings.whatsappNumber) {
        res.status(400).json({ message: "WhatsApp number is required when notifications are enabled" });
        return;
      }
      
      // Return success response
      res.json({ 
        success: true, 
        message: "Settings updated successfully",
        settings
      });
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update user settings" 
      });
    }
  });
  
  // WhatsApp test message endpoint
  app.post("/api/whatsapp/test", async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        res.status(400).json({ message: "Phone number is required" });
        return;
      }
      
      // Import the WhatsApp service
      const whatsappService = await import('./notifications/whatsapp');
      
      // Send a test message
      const message = `🧪 *Test Message from TaskBreaker*\n\nThis is a test message to verify your WhatsApp notifications are working properly. Notification system is in development mode - this message is being logged to the console rather than sent via WhatsApp.`;
      
      const result = await whatsappService.sendWhatsAppMessage(phoneNumber, message);
      
      if (result) {
        res.json({ 
          success: true, 
          message: "Test message sent successfully (logged to console in development mode)"
        });
      } else {
        res.status(500).json({ message: "Failed to send test message" });
      }
    } catch (error) {
      console.error("Error sending test WhatsApp message:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to send test message" 
      });
    }
  });
  
  // Discuss task with AI
  app.post("/api/coach/discuss-task", async (req: Request, res: Response) => {
    try {
      const { goalId, taskId, message } = req.body;
      
      if (!goalId || !taskId || !message) {
        res.status(400).json({ message: "Goal ID, task ID, and message are required" });
        return;
      }
      
      // Get the goal
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        res.status(404).json({ message: "Goal not found" });
        return;
      }
      
      // Find the task in the goal
      const task = goal.tasks.find(t => t.id === taskId);
      if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
      }
      
      // Use OpenAI to discuss the task
      const response = await discussTaskWithAI(goal, task, message);
      
      res.json({ response });
    } catch (error) {
      console.error("Error discussing task with AI:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate AI response" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

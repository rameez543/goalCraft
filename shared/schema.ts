import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const subtasks = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean().default(false),
  estimatedMinutes: z.number().optional(),
  context: z.string().optional(), // Additional context about the subtask
});

export type Subtask = z.infer<typeof subtasks>;

export const tasks = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean().default(false),
  subtasks: z.array(subtasks).default([]),
  estimatedMinutes: z.number().optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  context: z.string().optional(), // Additional context about the task
  actionItems: z.array(z.string()).optional(), // Specific action items for this task
});

export type Task = z.infer<typeof tasks>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  googleId: text("google_id").unique(),
  displayName: text("display_name"),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  googleId: true,
  displayName: true,
  profilePicture: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Goals table
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("user_id").default("anonymous"),
  progress: integer("progress").default(0),
  tasks: jsonb("tasks").notNull().$type<Task[]>(),
  createdAt: text("created_at").notNull(),  // Changed to text for compatibility
  totalEstimatedMinutes: integer("total_estimated_minutes"),
  timeConstraintMinutes: integer("time_constraint_minutes"),
  additionalInfo: text("additional_info"),
  overallSuggestions: text("overall_suggestions"), // Overall suggestions from AI
  notificationChannels: jsonb("notification_channels").$type<string[]>(), // Email, Slack, WhatsApp, etc.
  lastProgressUpdate: text("last_progress_update"), // Latest progress update from user
  roadblocks: text("roadblocks"), // Any blockers or challenges reported by user
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
});

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

// API schema for goal creation
export const createGoalSchema = z.object({
  title: z.string().min(3, "Goal must be at least 3 characters"),
  timeConstraintMinutes: z.number().optional(),
  additionalInfo: z.string().optional(),
});

export type CreateGoalRequest = z.infer<typeof createGoalSchema>;

// API schema for task completion
export const updateTaskSchema = z.object({
  goalId: z.number(),
  taskId: z.string(),
  completed: z.boolean(),
});

export type UpdateTaskRequest = z.infer<typeof updateTaskSchema>;

// API schema for subtask completion
export const updateSubtaskSchema = z.object({
  goalId: z.number(),
  taskId: z.string(),
  subtaskId: z.string(),
  completed: z.boolean(),
});

export type UpdateSubtaskRequest = z.infer<typeof updateSubtaskSchema>;

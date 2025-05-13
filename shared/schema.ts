import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const subtasks = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean().default(false),
});

export type Subtask = z.infer<typeof subtasks>;

export const tasks = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean().default(false),
  subtasks: z.array(subtasks).default([]),
});

export type Task = z.infer<typeof tasks>;

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("user_id").default("anonymous"),
  progress: integer("progress").default(0),
  tasks: jsonb("tasks").notNull().$type<Task[]>(),
  createdAt: text("created_at").notNull(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
});

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// API schema for goal creation
export const createGoalSchema = z.object({
  title: z.string().min(3, "Goal must be at least 3 characters"),
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

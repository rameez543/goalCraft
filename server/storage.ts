import { goals, type Goal, type InsertGoal, type Task, type Subtask, users, type User, type InsertUser } from "@shared/schema";
import { nanoid } from "nanoid";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: Partial<InsertUser>): Promise<User>;
  
  getGoals(userId?: string): Promise<Goal[]>;
  getGoal(id: number): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<Goal>): Promise<Goal | undefined>;
  deleteGoal(id: number): Promise<boolean>;
  
  updateTaskCompletion(goalId: number, taskId: string, completed: boolean): Promise<Goal | undefined>;
  updateSubtaskCompletion(goalId: number, taskId: string, subtaskId: string, completed: boolean): Promise<Goal | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(userData: Partial<InsertUser>): Promise<User> {
    // Make sure we have a username at minimum
    if (!userData.username) {
      throw new Error('Username is required');
    }

    // If email is missing but we have a googleId, generate an email
    if (!userData.email && userData.googleId) {
      userData.email = `${userData.username}@taskbreaker.app`;
    }

    const [user] = await db
      .insert(users)
      .values(userData as any)
      .returning();
    return user;
  }

  async getGoals(userId?: string): Promise<Goal[]> {
    if (userId) {
      return await db.select().from(goals).where(eq(goals.userId, userId));
    }
    return await db.select().from(goals);
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || undefined;
  }

  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    // Remove any existing createdAt field to avoid conflicts
    const { createdAt, ...insertData } = insertGoal as any;
    
    const [goal] = await db
      .insert(goals)
      .values({
        ...insertData,
        createdAt: new Date().toISOString() // Ensure we have a date
      })
      .returning();
    return goal;
  }

  async updateGoal(id: number, updates: Partial<Goal>): Promise<Goal | undefined> {
    const [updatedGoal] = await db
      .update(goals)
      .set(updates)
      .where(eq(goals.id, id))
      .returning();
    return updatedGoal || undefined;
  }

  async deleteGoal(id: number): Promise<boolean> {
    const [deletedGoal] = await db
      .delete(goals)
      .where(eq(goals.id, id))
      .returning({ id: goals.id });
    return !!deletedGoal;
  }

  async updateTaskCompletion(goalId: number, taskId: string, completed: boolean): Promise<Goal | undefined> {
    // First get the goal
    const goal = await this.getGoal(goalId);
    if (!goal) return undefined;

    // Update the tasks array
    const updatedTasks = goal.tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, completed };
      }
      return task;
    });

    // Calculate new progress percentage
    const totalTasks = updatedTasks.length;
    const completedTasks = updatedTasks.filter(task => task.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Update the goal in the database
    const [updatedGoal] = await db
      .update(goals)
      .set({
        tasks: updatedTasks,
        progress
      })
      .where(eq(goals.id, goalId))
      .returning();

    return updatedGoal || undefined;
  }

  async updateSubtaskCompletion(goalId: number, taskId: string, subtaskId: string, completed: boolean): Promise<Goal | undefined> {
    // First get the goal
    const goal = await this.getGoal(goalId);
    if (!goal) return undefined;

    // Update the tasks and subtasks
    const updatedTasks = goal.tasks.map(task => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map(subtask => {
          if (subtask.id === subtaskId) {
            return { ...subtask, completed };
          }
          return subtask;
        });

        // If all subtasks are completed, mark the parent task as completed too
        const allSubtasksCompleted = updatedSubtasks.every(subtask => subtask.completed);
        
        return { 
          ...task, 
          subtasks: updatedSubtasks,
          completed: allSubtasksCompleted 
        };
      }
      return task;
    });

    // Calculate new progress percentage
    const totalTasks = updatedTasks.length;
    const completedTasks = updatedTasks.filter(task => task.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Update the goal in the database
    const [updatedGoal] = await db
      .update(goals)
      .set({
        tasks: updatedTasks,
        progress
      })
      .where(eq(goals.id, goalId))
      .returning();

    return updatedGoal || undefined;
  }
}

export const storage = new DatabaseStorage();

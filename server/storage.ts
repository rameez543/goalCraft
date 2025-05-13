import { goals, type Goal, type InsertGoal, type Task, type Subtask, users, type User, type InsertUser } from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getGoals(): Promise<Goal[]>;
  getGoal(id: number): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<Goal>): Promise<Goal | undefined>;
  deleteGoal(id: number): Promise<boolean>;
  
  updateTaskCompletion(goalId: number, taskId: string, completed: boolean): Promise<Goal | undefined>;
  updateSubtaskCompletion(goalId: number, taskId: string, subtaskId: string, completed: boolean): Promise<Goal | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private goalsData: Map<number, Goal>;
  private userCurrentId: number;
  private goalCurrentId: number;

  constructor() {
    this.users = new Map();
    this.goalsData = new Map();
    this.userCurrentId = 1;
    this.goalCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getGoals(): Promise<Goal[]> {
    return Array.from(this.goalsData.values());
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    return this.goalsData.get(id);
  }

  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const id = this.goalCurrentId++;
    const goal: Goal = { ...insertGoal, id };
    this.goalsData.set(id, goal);
    return goal;
  }

  async updateGoal(id: number, updates: Partial<Goal>): Promise<Goal | undefined> {
    const goal = this.goalsData.get(id);
    if (!goal) return undefined;

    const updatedGoal = { ...goal, ...updates };
    this.goalsData.set(id, updatedGoal);
    return updatedGoal;
  }

  async deleteGoal(id: number): Promise<boolean> {
    return this.goalsData.delete(id);
  }

  async updateTaskCompletion(goalId: number, taskId: string, completed: boolean): Promise<Goal | undefined> {
    const goal = this.goalsData.get(goalId);
    if (!goal) return undefined;

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

    const updatedGoal = { 
      ...goal, 
      tasks: updatedTasks,
      progress 
    };
    
    this.goalsData.set(goalId, updatedGoal);
    return updatedGoal;
  }

  async updateSubtaskCompletion(goalId: number, taskId: string, subtaskId: string, completed: boolean): Promise<Goal | undefined> {
    const goal = this.goalsData.get(goalId);
    if (!goal) return undefined;

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

    const updatedGoal = { 
      ...goal, 
      tasks: updatedTasks,
      progress
    };
    
    this.goalsData.set(goalId, updatedGoal);
    return updatedGoal;
  }
}

export const storage = new MemStorage();

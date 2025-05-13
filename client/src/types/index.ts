export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes?: number;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  subtasks: Subtask[];
  estimatedMinutes?: number;
  complexity?: 'low' | 'medium' | 'high';
}

export interface Goal {
  id: number;
  title: string;
  tasks: Task[];
  progress: number;
  userId: string;
  createdAt: string;
  totalEstimatedMinutes?: number;
  timeConstraintMinutes?: number;
  additionalInfo?: string;
}

export type GoalContextType = {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  createGoal: (title: string, timeConstraintMinutes?: number, additionalInfo?: string) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  toggleTaskCompletion: (goalId: number, taskId: string, completed: boolean) => Promise<void>;
  toggleSubtaskCompletion: (goalId: number, taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
};

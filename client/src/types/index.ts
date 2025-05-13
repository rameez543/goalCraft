export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  subtasks: Subtask[];
}

export interface Goal {
  id: number;
  title: string;
  tasks: Task[];
  progress: number;
  userId: string;
  createdAt: string;
}

export type GoalContextType = {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  createGoal: (title: string) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  toggleTaskCompletion: (goalId: number, taskId: string, completed: boolean) => Promise<void>;
  toggleSubtaskCompletion: (goalId: number, taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
};

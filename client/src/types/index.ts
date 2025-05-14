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

export type NotificationChannel = 'email' | 'slack' | 'whatsapp';

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
  notificationChannels?: NotificationChannel[];
  lastProgressUpdate?: string;
  roadblocks?: string;
}

export interface ProgressUpdateOptions {
  goalId: number;
  updateMessage: string;
  notifyChannels?: NotificationChannel[];
  contactEmail?: string;
  contactPhone?: string;
}

export interface RoadblockOptions {
  goalId: number;
  description: string;
  needsHelp?: boolean;
  notifyChannels?: NotificationChannel[];
  contactEmail?: string;
  contactPhone?: string;
}

export type GoalContextType = {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  createGoal: (
    title: string, 
    timeConstraintMinutes?: number, 
    additionalInfo?: string,
    notificationChannels?: NotificationChannel[],
    contactEmail?: string, 
    contactPhone?: string
  ) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  toggleTaskCompletion: (goalId: number, taskId: string, completed: boolean) => Promise<void>;
  toggleSubtaskCompletion: (goalId: number, taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
  addProgressUpdate: (options: ProgressUpdateOptions) => Promise<void>;
  reportRoadblock: (options: RoadblockOptions) => Promise<void>;
};

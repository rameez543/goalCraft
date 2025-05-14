export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes?: number;
  context?: string;
  dueDate?: string;
  addedToCalendar?: boolean;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  subtasks: Subtask[];
  estimatedMinutes?: number;
  complexity?: 'low' | 'medium' | 'high';
  context?: string;
  actionItems?: string[];
  dueDate?: string;
  addedToCalendar?: boolean;
  reminderEnabled?: boolean;
  reminderTime?: string;
  enableWhatsapp?: boolean;
  whatsappNumber?: string;
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

export type ReminderFrequency = 'daily' | 'weekly' | 'task-only';

export interface UserSettings {
  whatsappNumber?: string;
  enableWhatsappNotifications?: boolean;
  defaultNotificationChannels?: NotificationChannel[];
  contactEmail?: string;
  contactPhone?: string;
  reminderFrequency?: ReminderFrequency;
  reminderTime?: string;
  reminderDays?: string[]; // For weekly reminders, which days of the week
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
  updateTaskSchedule: (
    goalId: number, 
    taskId: string, 
    updates: { 
      dueDate?: string; 
      addedToCalendar?: boolean;
      reminderEnabled?: boolean;
      reminderTime?: string;
      enableWhatsapp?: boolean;
      whatsappNumber?: string;
    }
  ) => Promise<void>;
  updateSubtaskSchedule: (
    goalId: number, 
    taskId: string, 
    subtaskId: string,
    updates: { 
      dueDate?: string; 
      addedToCalendar?: boolean;
    }
  ) => Promise<void>;
  updateGlobalSettings: (settings: UserSettings) => Promise<void>;
};

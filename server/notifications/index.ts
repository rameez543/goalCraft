import { Goal, Task } from '@shared/schema';
import * as slackService from './slack';
import * as emailService from './email';

/**
 * Notification channels enum
 */
export enum NotificationChannel {
  SLACK = 'slack',
  EMAIL = 'email'
}

/**
 * Send goal creation notification to all enabled channels
 */
export async function notifyGoalCreated(
  goal: Goal, 
  channels: NotificationChannel[] = [],
  email?: string
): Promise<void> {
  // If no channels specified, check goal's notification channels
  if (channels.length === 0 && goal.notificationChannels) {
    channels = goal.notificationChannels as NotificationChannel[];
  }
  
  // Skip if no channels
  if (!channels || channels.length === 0) return;
  
  // Send to each enabled channel
  const promises: Promise<any>[] = [];
  
  if (channels.includes(NotificationChannel.SLACK)) {
    promises.push(slackService.notifyGoalCreated(goal));
  }
  
  if (channels.includes(NotificationChannel.EMAIL) && email) {
    promises.push(emailService.emailGoalCreated(goal, email));
  }
  
  // Wait for all notifications to complete
  await Promise.allSettled(promises);
}

/**
 * Send task completion notification to all enabled channels
 */
export async function notifyTaskCompleted(
  goal: Goal,
  task: Task,
  channels: NotificationChannel[] = [],
  email?: string
): Promise<void> {
  // If no channels specified, check goal's notification channels
  if (channels.length === 0 && goal.notificationChannels) {
    channels = goal.notificationChannels as NotificationChannel[];
  }
  
  // Skip if no channels
  if (!channels || channels.length === 0) return;
  
  // Send to each enabled channel
  const promises: Promise<any>[] = [];
  
  if (channels.includes(NotificationChannel.SLACK)) {
    promises.push(slackService.notifyTaskCompleted(goal, task));
  }
  
  if (channels.includes(NotificationChannel.EMAIL) && email) {
    promises.push(emailService.emailTaskCompleted(goal, task, email));
  }
  
  // Wait for all notifications to complete
  await Promise.allSettled(promises);
}

/**
 * Send progress update notification to all enabled channels
 */
export async function notifyProgressUpdate(
  goal: Goal,
  progressUpdate: string,
  channels: NotificationChannel[] = [],
  email?: string
): Promise<void> {
  // If no channels specified, check goal's notification channels
  if (channels.length === 0 && goal.notificationChannels) {
    channels = goal.notificationChannels as NotificationChannel[];
  }
  
  // Skip if no channels
  if (!channels || channels.length === 0) return;
  
  // Send to each enabled channel
  const promises: Promise<any>[] = [];
  
  if (channels.includes(NotificationChannel.SLACK)) {
    promises.push(slackService.notifyProgressUpdate(goal, progressUpdate));
  }
  
  if (channels.includes(NotificationChannel.EMAIL) && email) {
    // Email doesn't have a direct progress update method
    // Could implement one in the future
  }
  
  // Wait for all notifications to complete
  await Promise.allSettled(promises);
}

/**
 * Send roadblock notification to all enabled channels
 */
export async function notifyRoadblock(
  goal: Goal,
  roadblockDescription: string,
  channels: NotificationChannel[] = [],
  email?: string
): Promise<void> {
  // If no channels specified, check goal's notification channels
  if (channels.length === 0 && goal.notificationChannels) {
    channels = goal.notificationChannels as NotificationChannel[];
  }
  
  // Skip if no channels
  if (!channels || channels.length === 0) return;
  
  // Send to each enabled channel
  const promises: Promise<any>[] = [];
  
  if (channels.includes(NotificationChannel.SLACK)) {
    promises.push(slackService.notifyRoadblock(goal, roadblockDescription));
  }
  
  if (channels.includes(NotificationChannel.EMAIL) && email) {
    promises.push(emailService.emailRoadblockReported(goal, roadblockDescription, email));
  }
  
  // Wait for all notifications to complete
  await Promise.allSettled(promises);
}
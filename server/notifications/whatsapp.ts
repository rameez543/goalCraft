import { Goal, Task } from "@shared/schema";
import axios from "axios";

/**
 * WhatsApp message sending via Twilio or similar service
 * This can be replaced with any WhatsApp business API provider
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<boolean> {
  try {
    // This would typically use Twilio or similar API
    // For now, we'll just log the message for development
    console.log(`[WhatsApp] To: ${to}, Message: ${message}`);
    
    // TODO: Replace with actual WhatsApp API implementation
    // Example with Twilio:
    // const response = await axios.post(
    //   `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    //   new URLSearchParams({
    //     To: `whatsapp:${to}`,
    //     From: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
    //     Body: message
    //   }),
    //   {
    //     auth: {
    //       username: process.env.TWILIO_ACCOUNT_SID || '',
    //       password: process.env.TWILIO_AUTH_TOKEN || ''
    //     }
    //   }
    // );
    
    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return false;
  }
}

/**
 * Send goal creation notification via WhatsApp
 */
export async function notifyGoalCreatedWhatsApp(
  goal: Goal,
  phoneNumber: string
): Promise<boolean> {
  // Format task list
  const tasksSummary = goal.tasks
    .slice(0, 3)
    .map(task => `• ${task.title} (${task.estimatedMinutes || 0} mins)`)
    .join("\n");
  
  const remainingTasksCount = goal.tasks.length - 3;
  const remainingTasksText = remainingTasksCount > 0 
    ? `\n... and ${remainingTasksCount} more tasks` 
    : '';
  
  // Create message
  const message = `
📋 *New Goal Created*
*${goal.title}*

${goal.additionalInfo ? goal.additionalInfo + "\n" : ""}
⏱️ Total Time: ${goal.totalEstimatedMinutes} minutes
${goal.timeConstraintMinutes ? `⏳ Time Constraint: ${goal.timeConstraintMinutes} minutes\n` : ''}

*Key Tasks:*
${tasksSummary}${remainingTasksText}

Track your progress at: taskbreaker-app.example.com/goals/${goal.id}
  `;
  
  return await sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Send task completion notification via WhatsApp
 */
export async function notifyTaskCompletedWhatsApp(
  goal: Goal,
  task: Task,
  phoneNumber: string
): Promise<boolean> {
  // Calculate progress
  const totalTasks = goal.tasks.length;
  const completedTasks = goal.tasks.filter(t => t.completed).length;
  const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
  
  // Create message
  const message = `
✅ *Task Completed*
You completed: "${task.title}"

*Goal:* ${goal.title}
*Progress:* ${progressPercentage}% (${completedTasks}/${totalTasks} tasks)

Keep going! 💪
  `;
  
  return await sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Send daily reminder via WhatsApp
 */
export async function sendDailyReminderWhatsApp(
  goals: Goal[],
  phoneNumber: string
): Promise<boolean> {
  // Filter goals with incomplete tasks
  const incompleteGoals = goals.filter(goal => 
    goal.tasks.some(task => !task.completed)
  );
  
  if (incompleteGoals.length === 0) return true; // Nothing to remind about
  
  // Format goals list (max 3)
  const goalsList = incompleteGoals
    .slice(0, 3)
    .map(goal => {
      const taskCount = goal.tasks.filter(t => !t.completed).length;
      return `• *${goal.title}* - ${taskCount} tasks remaining`;
    })
    .join('\n');
  
  const remainingGoalsCount = incompleteGoals.length - 3;
  const remainingGoalsText = remainingGoalsCount > 0 
    ? `\n... and ${remainingGoalsCount} more goals` 
    : '';
  
  // Create message
  const message = `
⏰ *Daily TaskBreaker Reminder*

You have incomplete tasks in these goals:
${goalsList}${remainingGoalsText}

Stay focused and keep making progress!
  `;
  
  return await sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Send roadblock notification via WhatsApp
 */
export async function notifyRoadblockWhatsApp(
  goal: Goal,
  roadblockDescription: string,
  phoneNumber: string
): Promise<boolean> {
  // Create message
  const message = `
🚧 *Roadblock Reported*
Goal: "${goal.title}"

*Issue:*
${roadblockDescription}

Need help? Reply to this message.
  `;
  
  return await sendWhatsAppMessage(phoneNumber, message);
}
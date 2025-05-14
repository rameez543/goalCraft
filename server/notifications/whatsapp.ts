import { Goal, Task } from "@shared/schema";
import axios from "axios";

// Initialize WhatsApp provider
const initWhatsAppProvider = (): { provider: string | null, ready: boolean } => {
  // Check which provider we should use based on available credentials
  if (process.env.MESSAGEBIRD_API_KEY) {
    return { provider: 'messagebird', ready: true };
  }
  
  if (process.env.INFOBIP_API_KEY) {
    return { provider: 'infobip', ready: true };
  }
  
  if (process.env.META_WHATSAPP_API_TOKEN && process.env.META_WHATSAPP_PHONE_ID) {
    return { provider: 'meta', ready: true };
  }
  
  // No provider configured - development mode only
  console.warn("No WhatsApp Business API provider configured. Messages will be logged to console but not sent.");
  return { provider: null, ready: false };
};

// Provider info
const whatsappProvider = initWhatsAppProvider();

/**
 * WhatsApp message sending using a WhatsApp Business API provider
 * Multiple providers are available for integration:
 * 1. MessageBird - https://messagebird.com/products/whatsapp-api
 * 2. Infobip - https://www.infobip.com/whatsapp-business
 * 3. Meta's WhatsApp Business API - https://developers.facebook.com/docs/whatsapp/api/reference
 * 4. MessengerPeople by Sinch - https://www.sinch.com/products/messaging/whatsapp
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<boolean> {
  try {
    // Always log the message in any environment for debugging
    console.log(`[WhatsApp] To: ${to}, Message: ${message}`);
    
    // If no provider is configured, just return success after logging
    if (!whatsappProvider.ready) {
      return true;
    }
    
    // Send based on configured provider
    switch (whatsappProvider.provider) {
      case 'messagebird':
        return await sendWhatsAppViaMessageBird(to, message);
        
      case 'infobip':
        return await sendWhatsAppViaInfobip(to, message);
        
      case 'meta':
        return await sendWhatsAppViaMeta(to, message);
        
      default:
        // No provider configured but we already logged the message
        return true;
    }
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return false;
  }
}

/**
 * MessageBird implementation for WhatsApp messaging
 */
async function sendWhatsAppViaMessageBird(to: string, message: string): Promise<boolean> {
  try {
    const response = await axios.post(
      'https://conversations.messagebird.com/v1/send',
      {
        to: to,
        from: process.env.WHATSAPP_CHANNEL_ID,
        type: 'text',
        content: { text: message }
      },
      {
        headers: {
          'Authorization': `AccessKey ${process.env.MESSAGEBIRD_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error("MessageBird WhatsApp error:", error);
    return false;
  }
}

/**
 * Infobip implementation for WhatsApp messaging
 */
async function sendWhatsAppViaInfobip(to: string, message: string): Promise<boolean> {
  try {
    const response = await axios.post(
      `https://api.infobip.com/whatsapp/1/message/text`,
      {
        from: process.env.WHATSAPP_PHONE_NUMBER,
        to: to,
        messageText: message
      },
      {
        headers: {
          'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error("Infobip WhatsApp error:", error);
    return false;
  }
}

/**
 * Meta (Facebook) Graph API implementation for WhatsApp messaging
 */
async function sendWhatsAppViaMeta(to: string, message: string): Promise<boolean> {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${process.env.META_WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { 
          body: message 
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.META_WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error("Meta WhatsApp API error:", error);
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
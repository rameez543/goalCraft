import { WebClient } from "@slack/web-api";
import { Goal, Task, Subtask } from "@shared/schema";

// Slack client initialization
const initSlackClient = (): WebClient | null => {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn("SLACK_BOT_TOKEN not set. Slack notifications are disabled.");
    return null;
  }
  
  return new WebClient(token);
};

// Slack client instance
const slack = initSlackClient();

/**
 * Send goal creation notification to Slack
 */
export async function notifyGoalCreated(goal: Goal): Promise<boolean> {
  if (!slack) return false;
  
  try {
    const channelId = process.env.SLACK_CHANNEL_ID;
    if (!channelId) {
      console.warn("SLACK_CHANNEL_ID not set. Slack notifications are disabled.");
      return false;
    }
    
    // Format tasks overview
    const taskList = goal.tasks.map(task => 
      `• ${task.title} (${task.estimatedMinutes || 0} mins, ${task.complexity || 'medium'} complexity)`
    ).join('\n');
    
    // Create a rich message with Slack blocks
    await slack.chat.postMessage({
      channel: channelId,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🎯 New Goal Created",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${goal.title}*\n${goal.additionalInfo || ''}`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Estimated Time:*\n${goal.totalEstimatedMinutes || 0} minutes`
            },
            {
              type: "mrkdwn",
              text: `*Time Constraint:*\n${goal.timeConstraintMinutes ? `${goal.timeConstraintMinutes} minutes` : 'None'}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Tasks Overview:*\n${taskList}`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Update Progress",
                emoji: true
              },
              value: `update_progress_${goal.id}`,
              action_id: "update_progress"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Report Roadblock",
                emoji: true
              },
              value: `report_roadblock_${goal.id}`,
              action_id: "report_roadblock"
            }
          ]
        }
      ]
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    return false;
  }
}

/**
 * Send task completion notification to Slack
 */
export async function notifyTaskCompleted(goal: Goal, task: Task): Promise<boolean> {
  if (!slack) return false;
  
  try {
    const channelId = process.env.SLACK_CHANNEL_ID;
    if (!channelId) return false;
    
    // Calculate overall progress
    const totalTasks = goal.tasks.length;
    const completedTasks = goal.tasks.filter(t => t.completed).length;
    const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
    
    await slack.chat.postMessage({
      channel: channelId,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `✅ *Task Completed*: "${task.title}"`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Goal*: ${goal.title}`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Progress*: ${progressPercentage}% (${completedTasks}/${totalTasks} tasks)`
            }
          ]
        }
      ]
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    return false;
  }
}

/**
 * Send progress update notification to Slack
 */
export async function notifyProgressUpdate(
  goal: Goal, 
  progressUpdate: string
): Promise<boolean> {
  if (!slack) return false;
  
  try {
    const channelId = process.env.SLACK_CHANNEL_ID;
    if (!channelId) return false;
    
    await slack.chat.postMessage({
      channel: channelId,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📝 Progress Update*: Goal - "${goal.title}"`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: progressUpdate
          }
        }
      ]
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    return false;
  }
}

/**
 * Send roadblock notification to Slack
 */
export async function notifyRoadblock(
  goal: Goal,
  roadblockDescription: string
): Promise<boolean> {
  if (!slack) return false;
  
  try {
    const channelId = process.env.SLACK_CHANNEL_ID;
    if (!channelId) return false;
    
    await slack.chat.postMessage({
      channel: channelId,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🚧 Roadblock Reported*: Goal - "${goal.title}"`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: roadblockDescription
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Offer Help",
                emoji: true
              },
              value: `offer_help_${goal.id}`,
              action_id: "offer_help"
            }
          ]
        }
      ]
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    return false;
  }
}
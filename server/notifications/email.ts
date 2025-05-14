import { Goal, Task } from "@shared/schema";

// For development, we'll just log emails instead of sending them
console.log("Email notifications will be logged to console (not actually sent).");

// Default from email
const DEFAULT_FROM_EMAIL = "taskbreaker@example.com";

// Helper function to log mock emails
function logMockEmail(to: string, subject: string, body: string): boolean {
  console.log(`
==== MOCK EMAIL ====
To: ${to}
From: ${DEFAULT_FROM_EMAIL}
Subject: ${subject}
Body:
${body}
==================
`);
  return true;
}

/**
 * Send goal creation notification email
 */
export async function emailGoalCreated(goal: Goal, toEmail: string): Promise<boolean> {
  try {
    // Format tasks list
    const tasksText = goal.tasks.map(task => 
      `- ${task.title} (${task.estimatedMinutes || 0} mins, ${task.complexity || 'medium'} complexity)`
    ).join('\n');
    
    // Construct email text
    const body = `
New Goal Created: ${goal.title}
You've taken the first step toward achieving your goal with TaskBreaker!

Your Goal Plan:
${tasksText}

Total estimated time: ${goal.totalEstimatedMinutes || 0} minutes

Log in to your TaskBreaker account to start making progress on your goal.
    `;
    
    // Log mock email
    return logMockEmail(
      toEmail,
      `TaskBreaker: Goal Created - ${goal.title}`,
      body
    );
  } catch (error) {
    console.error('Error logging goal creation email:', error);
    return false;
  }
}

/**
 * Send task completion notification email
 */
export async function emailTaskCompleted(goal: Goal, task: Task, toEmail: string): Promise<boolean> {
  try {
    // Calculate progress percentage
    const totalTasks = goal.tasks.length;
    const completedTasks = goal.tasks.filter(t => t.completed).length;
    const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
    
    // Construct email text
    const body = `
Task Completed in ${goal.title}!

You've completed: "${task.title}"

Current progress: ${progressPercentage}% (${completedTasks}/${totalTasks} tasks complete)

Keep up the great work!
    `;
    
    // Log mock email
    return logMockEmail(
      toEmail,
      `TaskBreaker: Task Completed - ${task.title}`,
      body
    );
  } catch (error) {
    console.error('Error logging task completion email:', error);
    return false;
  }
}

/**
 * Send daily reminder email
 */
export async function emailDailyReminder(goals: Goal[], toEmail: string): Promise<boolean> {
  try {
    // Format goals summary
    const goalsSummary = goals.map(goal => {
      const totalTasks = goal.tasks.length;
      const completedTasks = goal.tasks.filter(t => t.completed).length;
      const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
      
      return `
- ${goal.title} (${progressPercentage}% complete)
  Next tasks:
${goal.tasks
  .filter(task => !task.completed)
  .slice(0, 3)
  .map(task => `  * ${task.title}`)
  .join('\n')}`;
    }).join('\n');
    
    // Construct email text
    const body = `
Daily TaskBreaker Reminder

Here's your daily summary of goals in progress:

${goalsSummary}

Log in to TaskBreaker to continue making progress!
    `;
    
    // Log mock email
    return logMockEmail(
      toEmail,
      'TaskBreaker: Your Daily Goal Summary',
      body
    );
  } catch (error) {
    console.error('Error logging daily reminder email:', error);
    return false;
  }
}

/**
 * Send roadblock notification email
 */
export async function emailRoadblockReported(
  goal: Goal, 
  roadblockDescription: string,
  toEmail: string
): Promise<boolean> {
  try {
    // Construct email text
    const body = `
Roadblock Reported for "${goal.title}"

The following roadblock has been reported:

${roadblockDescription}

This has been recorded in your goal progress. If you need help, consider reaching out to a friend or mentor.
    `;
    
    // Log mock email
    return logMockEmail(
      toEmail,
      `TaskBreaker: Roadblock Reported - ${goal.title}`,
      body
    );
  } catch (error) {
    console.error('Error logging roadblock email:', error);
    return false;
  }
}
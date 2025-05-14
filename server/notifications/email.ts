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
  if (!mailService) return false;
  
  try {
    // Format tasks list for email
    const tasksList = goal.tasks.map(task => {
      const subtasksList = task.subtasks.length > 0 
        ? `<ul>${task.subtasks.map(subtask => `<li>${subtask.title} (${subtask.estimatedMinutes || 0} mins)</li>`).join('')}</ul>` 
        : '';
      
      return `
        <li>
          <strong>${task.title}</strong> (${task.estimatedMinutes || 0} mins, ${task.complexity || 'medium'} complexity)
          ${subtasksList}
        </li>
      `;
    }).join('');
    
    // Format overall suggestions if available
    const suggestionsSection = goal.overallSuggestions 
      ? `<h3>Suggestions for Success</h3><p>${goal.overallSuggestions}</p>` 
      : '';
    
    // Construct email HTML
    const html = `
      <h1>New Goal Created: ${goal.title}</h1>
      ${goal.additionalInfo ? `<p>${goal.additionalInfo}</p>` : ''}
      
      <h3>Goal Details</h3>
      <ul>
        <li><strong>Total Estimated Time:</strong> ${goal.totalEstimatedMinutes || 0} minutes</li>
        <li><strong>Time Constraint:</strong> ${goal.timeConstraintMinutes ? `${goal.timeConstraintMinutes} minutes` : 'None'}</li>
      </ul>
      
      <h3>Tasks Breakdown</h3>
      <ul>
        ${tasksList}
      </ul>
      
      ${suggestionsSection}
      
      <p>
        <a href="https://taskbreaker-app.example.com/goals/${goal.id}">View Goal Details</a>
        | <a href="https://taskbreaker-app.example.com/goals/${goal.id}/update">Update Progress</a>
      </p>
    `;
    
    await mailService.send({
      to: toEmail,
      from: DEFAULT_FROM_EMAIL,
      subject: `TaskBreaker: New Goal - ${goal.title}`,
      html
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send email notification:", error);
    return false;
  }
}

/**
 * Send task completion notification email
 */
export async function emailTaskCompleted(goal: Goal, task: Task, toEmail: string): Promise<boolean> {
  if (!mailService) return false;
  
  try {
    // Calculate overall progress
    const totalTasks = goal.tasks.length;
    const completedTasks = goal.tasks.filter(t => t.completed).length;
    const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
    
    // Format remaining tasks
    const remainingTasks = goal.tasks.filter(t => !t.completed).map(t => 
      `<li>${t.title} (${t.estimatedMinutes || 0} mins)</li>`
    ).join('');
    
    const html = `
      <h1>Task Completed</h1>
      <p>You've completed the task "${task.title}" for your goal "${goal.title}".</p>
      
      <h3>Progress Update</h3>
      <p>${progressPercentage}% complete (${completedTasks}/${totalTasks} tasks)</p>
      
      ${remainingTasks.length > 0 ? `
        <h3>Remaining Tasks</h3>
        <ul>${remainingTasks}</ul>
      ` : '<p>All tasks completed! Congratulations! 🎉</p>'}
      
      <p>
        <a href="https://taskbreaker-app.example.com/goals/${goal.id}">View Goal Details</a>
        | <a href="https://taskbreaker-app.example.com/goals/${goal.id}/update">Update Progress</a>
      </p>
    `;
    
    await mailService.send({
      to: toEmail,
      from: DEFAULT_FROM_EMAIL,
      subject: `TaskBreaker: Task Completed - ${task.title}`,
      html
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send email notification:", error);
    return false;
  }
}

/**
 * Send daily reminder email
 */
export async function emailDailyReminder(goals: Goal[], toEmail: string): Promise<boolean> {
  if (!mailService) return false;
  
  try {
    // Filter goals with incomplete tasks
    const incompleteGoals = goals.filter(goal => 
      goal.tasks.some(task => !task.completed)
    );
    
    if (incompleteGoals.length === 0) return true; // No incomplete goals to remind about
    
    // Format goals list
    const goalsList = incompleteGoals.map(goal => {
      const incompleteTasks = goal.tasks.filter(t => !t.completed);
      const tasksList = incompleteTasks.slice(0, 3).map(task => 
        `<li>${task.title} (${task.estimatedMinutes || 0} mins)</li>`
      ).join('');
      
      const additionalTasksCount = incompleteTasks.length - 3;
      const additionalTasksNote = additionalTasksCount > 0 
        ? `<li>+ ${additionalTasksCount} more tasks</li>` 
        : '';
      
      return `
        <li>
          <strong>${goal.title}</strong> (${goal.progress}% complete)
          <ul>
            ${tasksList}
            ${additionalTasksNote}
          </ul>
          <p><a href="https://taskbreaker-app.example.com/goals/${goal.id}">View Details</a></p>
        </li>
      `;
    }).join('');
    
    const html = `
      <h1>Daily TaskBreaker Reminder</h1>
      <p>Here are your goals that need attention:</p>
      
      <ul>
        ${goalsList}
      </ul>
      
      <p>Stay focused and keep making progress!</p>
    `;
    
    await mailService.send({
      to: toEmail,
      from: DEFAULT_FROM_EMAIL,
      subject: `TaskBreaker: Your Daily Goal Reminders`,
      html
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send email notification:", error);
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
  if (!mailService) return false;
  
  try {
    const html = `
      <h1>Roadblock Reported</h1>
      <p>A roadblock has been reported for your goal "${goal.title}".</p>
      
      <h3>Roadblock Description</h3>
      <p>${roadblockDescription}</p>
      
      <p>
        <a href="https://taskbreaker-app.example.com/goals/${goal.id}">View Goal Details</a>
        | <a href="https://taskbreaker-app.example.com/goals/${goal.id}/roadblock">Manage Roadblock</a>
      </p>
    `;
    
    await mailService.send({
      to: toEmail,
      from: DEFAULT_FROM_EMAIL,
      subject: `TaskBreaker: Roadblock Reported - ${goal.title}`,
      html
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send email notification:", error);
    return false;
  }
}
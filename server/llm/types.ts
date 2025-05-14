/**
 * Response format for task breakdown
 */
export interface TaskBreakdownResponse {
  tasks: {
    title: string;
    estimatedMinutes: number;
    complexity: 'low' | 'medium' | 'high';
    context?: string; // Additional context about the task for AI
    actionItems?: string[]; // Specific action items for this task
    dueDate?: string; // Due date for the task (ISO string)
    subtasks?: {
      title: string;
      estimatedMinutes: number;
      context?: string; // Additional context about the subtask
      dueDate?: string; // Due date for the subtask (ISO string)
    }[];
  }[];
  totalEstimatedMinutes: number;
  overallSuggestions?: string; // General suggestions for approaching the goal
}

/**
 * Coach message format
 */
export interface CoachMessage {
  message: string;
  type: 'encouragement' | 'tip' | 'congratulation' | 'milestone';
}

/**
 * Context for coaching messages
 */
export interface CoachingContext {
  userName: string;
  goals: {
    title: string;
    progress: number;
    tasksCompleted: number;
    totalTasks: number;
    hasRoadblocks: boolean;
    roadblockDescription: string;
    timeConstraint: number;
  }[];
  overallProgress: number;
  totalCompletedTasks: number;
  totalTasks: number;
  hasGoalsWithRoadblocks: boolean;
}

/**
 * Context for task discussion
 */
export interface TaskDiscussionContext {
  title: string;
  context: string;
  complexity: string;
  estimatedMinutes: number;
  completed: boolean;
  actionItems: string[];
  subtasks: {
    title: string;
    context: string;
    completed: boolean;
  }[];
  goalTitle: string;
}

/**
 * Interface for all LLM providers
 */
export interface LLMProvider {
  /**
   * Provider name
   */
  name: string;

  /**
   * Check if this provider is available (API key set, etc.)
   */
  isAvailable(): boolean;

  /**
   * Analyze a goal with chain-of-thought to gather more context
   * @param goalTitle The title of the goal
   * @param timeConstraintMinutes Optional time constraint in minutes
   * @param additionalInfo Optional additional information
   * @returns Detailed analysis of the goal
   */
  analyzeGoalWithChainOfThought(
    goalTitle: string,
    timeConstraintMinutes?: number,
    additionalInfo?: string
  ): Promise<string>;

  /**
   * Break down a goal into manageable tasks
   * @param goalTitle The title of the goal
   * @param goalAnalysis Chain-of-thought analysis of the goal
   * @param timeConstraintMinutes Optional time constraint in minutes
   * @param additionalInfo Optional additional information
   * @returns Task breakdown response
   */
  breakdownGoalIntoTasks(
    goalTitle: string,
    goalAnalysis: string,
    timeConstraintMinutes?: number,
    additionalInfo?: string
  ): Promise<TaskBreakdownResponse>;

  /**
   * Generate a coaching message
   * @param contextData Context data about the goals and progress
   * @returns Coaching message response
   */
  generateCoachingMessage(contextData: CoachingContext): Promise<CoachMessage>;

  /**
   * Generate tips for overcoming roadblocks
   * @param goalTitle Goal title
   * @param roadblock Roadblock description
   * @returns Array of tips as strings
   */
  generateRoadblockTips(goalTitle: string, roadblock: string): Promise<string[]>;

  /**
   * Discuss a task with the AI
   * @param taskContext Task context data
   * @param message User's message
   * @returns AI's response as a string
   */
  discussTask(taskContext: TaskDiscussionContext, message: string): Promise<string>;
}
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Goal, GoalContextType, ProgressUpdateOptions, RoadblockOptions, NotificationChannel, UserSettings } from '../types';
import { saveGoalsToLocalStorage, getGoalsFromLocalStorage } from '../lib/localStorage';
import { useAuth } from './AuthContext';

const GoalContext = createContext<GoalContextType | undefined>(undefined);

export const GoalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Fetch goals on initial load or when authentication state changes
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to get from API first
        try {
          const response = await fetch('/api/goals', { credentials: 'include' });
          if (response.ok) {
            const data = await response.json();
            setGoals(data);
            saveGoalsToLocalStorage(data);
            return;
          }
        } catch (apiError) {
          console.warn('Failed to fetch from API, falling back to localStorage');
        }
        
        // Fall back to localStorage if API fails
        const localGoals = getGoalsFromLocalStorage();
        setGoals(localGoals);
        
      } catch (err) {
        setError('Failed to load goals. Please try again.');
        console.error('Error fetching goals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [isAuthenticated, user]);

  // Save goals to localStorage whenever they change
  useEffect(() => {
    if (goals.length > 0) {
      saveGoalsToLocalStorage(goals);
    }
  }, [goals]);

  const createGoal = async (
    title: string,
    timeConstraintMinutes?: number,
    additionalInfo?: string,
    notificationChannels?: NotificationChannel[],
    contactEmail?: string,
    contactPhone?: string
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Authentication check temporarily disabled
      // if (!isAuthenticated) {
      //   toast({
      //     variant: 'destructive',
      //     title: 'Authentication Required',
      //     description: 'Please sign in to create a goal.',
      //   });
      //   setLoading(false);
      //   return;
      // }
      
      const response = await apiRequest('POST', '/api/goals', {
        title,
        timeConstraintMinutes,
        additionalInfo,
        notificationChannels,
        contactEmail,
        contactPhone
      });
      
      const newGoal = await response.json();
      
      setGoals(prevGoals => [...prevGoals, newGoal]);
      toast({
        title: 'Goal created',
        description: 'Your goal has been broken down into tasks with time estimates.',
      });
    } catch (err) {
      setError('Failed to create goal. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create goal. Please try again.',
      });
      console.error('Error creating goal:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteGoal = async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await apiRequest('DELETE', `/api/goals/${id}`);
      setGoals(prevGoals => prevGoals.filter(goal => goal.id !== id));
      
      toast({
        title: 'Goal deleted',
        description: 'Your goal has been removed.',
      });
    } catch (err) {
      setError('Failed to delete goal. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete goal. Please try again.',
      });
      console.error('Error deleting goal:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (goalId: number, taskId: string, completed: boolean): Promise<void> => {
    try {
      // Optimistically update the UI
      setGoals(prevGoals => 
        prevGoals.map(goal => {
          if (goal.id === goalId) {
            const updatedTasks = goal.tasks.map(task => 
              task.id === taskId ? { ...task, completed } : task
            );
            
            // Calculate new progress
            const totalTasks = updatedTasks.length;
            const completedTasks = updatedTasks.filter(task => task.completed).length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            return { ...goal, tasks: updatedTasks, progress };
          }
          return goal;
        })
      );
      
      // Send update to API
      await apiRequest('PATCH', '/api/tasks', { goalId, taskId, completed });
      
      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      
    } catch (err) {
      // Revert the optimistic update on error
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update task. Please try again.',
      });
      console.error('Error updating task:', err);
      
      // Refetch to get the correct state
      try {
        const response = await fetch(`/api/goals/${goalId}`, { credentials: 'include' });
        if (response.ok) {
          const updatedGoal = await response.json();
          setGoals(prevGoals => 
            prevGoals.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal)
          );
        }
      } catch (refetchError) {
        console.error('Error refetching goal:', refetchError);
      }
    }
  };

  const toggleSubtaskCompletion = async (goalId: number, taskId: string, subtaskId: string, completed: boolean): Promise<void> => {
    try {
      // Optimistically update the UI
      setGoals(prevGoals => 
        prevGoals.map(goal => {
          if (goal.id === goalId) {
            const updatedTasks = goal.tasks.map(task => {
              if (task.id === taskId) {
                const updatedSubtasks = task.subtasks.map(subtask => 
                  subtask.id === subtaskId ? { ...subtask, completed } : subtask
                );
                
                // If all subtasks are completed, mark parent task as completed too
                const allSubtasksCompleted = updatedSubtasks.every(subtask => subtask.completed);
                
                return { 
                  ...task, 
                  subtasks: updatedSubtasks,
                  completed: allSubtasksCompleted
                };
              }
              return task;
            });
            
            // Calculate new progress
            const totalTasks = updatedTasks.length;
            const completedTasks = updatedTasks.filter(task => task.completed).length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            return { ...goal, tasks: updatedTasks, progress };
          }
          return goal;
        })
      );
      
      // Send update to API
      await apiRequest('PATCH', '/api/subtasks', { goalId, taskId, subtaskId, completed });
      
      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      
    } catch (err) {
      // Revert the optimistic update on error
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update subtask. Please try again.',
      });
      console.error('Error updating subtask:', err);
      
      // Refetch to get the correct state
      try {
        const response = await fetch(`/api/goals/${goalId}`, { credentials: 'include' });
        if (response.ok) {
          const updatedGoal = await response.json();
          setGoals(prevGoals => 
            prevGoals.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal)
          );
        }
      } catch (refetchError) {
        console.error('Error refetching goal:', refetchError);
      }
    }
  };

  const addProgressUpdate = async (options: ProgressUpdateOptions): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const { goalId, updateMessage, notifyChannels, contactEmail, contactPhone } = options;
      
      const response = await apiRequest('POST', `/api/goals/${goalId}/progress`, {
        updateMessage,
        notifyChannels,
        contactEmail,
        contactPhone
      });
      
      const updatedGoal = await response.json();
      
      // Update goals with the new state
      setGoals(prevGoals => 
        prevGoals.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal)
      );
      
      toast({
        title: 'Progress updated',
        description: 'Your progress update has been recorded and notifications sent.',
      });
    } catch (err) {
      setError('Failed to update progress. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update progress. Please try again.',
      });
      console.error('Error updating progress:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const reportRoadblock = async (options: RoadblockOptions): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const { goalId, description, needsHelp, notifyChannels, contactEmail, contactPhone } = options;
      
      const response = await apiRequest('POST', `/api/goals/${goalId}/roadblock`, {
        description,
        needsHelp,
        notifyChannels,
        contactEmail,
        contactPhone
      });
      
      const updatedGoal = await response.json();
      
      // Update goals with the new state
      setGoals(prevGoals => 
        prevGoals.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal)
      );
      
      toast({
        title: 'Roadblock reported',
        description: 'Your roadblock has been recorded and notifications sent.',
      });
    } catch (err) {
      setError('Failed to report roadblock. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to report roadblock. Please try again.',
      });
      console.error('Error reporting roadblock:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update task scheduling (due date, calendar, reminders)
  const updateTaskSchedule = async (
    goalId: number, 
    taskId: string, 
    updates: { 
      dueDate?: string; 
      addedToCalendar?: boolean;
      reminderEnabled?: boolean;
      reminderTime?: string;
      enableWhatsapp?: boolean;
      whatsappNumber?: string;
      reminderFrequency?: ReminderFrequency;
    }
  ): Promise<void> => {
    try {
      // Optimistically update the UI
      setGoals(prevGoals => 
        prevGoals.map(goal => {
          if (goal.id === goalId) {
            const updatedTasks = goal.tasks.map(task => {
              if (task.id === taskId) {
                return {
                  ...task,
                  ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
                  ...(updates.addedToCalendar !== undefined && { addedToCalendar: updates.addedToCalendar }),
                  ...(updates.reminderEnabled !== undefined && { reminderEnabled: updates.reminderEnabled }),
                  ...(updates.reminderTime !== undefined && { reminderTime: updates.reminderTime })
                };
              }
              return task;
            });
            
            return { ...goal, tasks: updatedTasks };
          }
          return goal;
        })
      );
      
      // Send update to API
      await apiRequest('PATCH', '/api/tasks/schedule', { goalId, taskId, updates });
      
      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      
      toast({
        title: 'Task scheduled',
        description: updates.dueDate 
          ? `Task scheduled for ${new Date(updates.dueDate).toLocaleDateString()}.` 
          : 'Task schedule updated.',
      });
    } catch (err) {
      // Revert the optimistic update on error
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update task schedule. Please try again.',
      });
      console.error('Error updating task schedule:', err);
      
      // Refetch to get the correct state
      try {
        const response = await fetch(`/api/goals/${goalId}`, { credentials: 'include' });
        if (response.ok) {
          const updatedGoal = await response.json();
          setGoals(prevGoals => 
            prevGoals.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal)
          );
        }
      } catch (refetchError) {
        console.error('Error refetching goal:', refetchError);
      }
    }
  };
  
  // Update subtask scheduling (due date, calendar)
  const updateSubtaskSchedule = async (
    goalId: number, 
    taskId: string, 
    subtaskId: string,
    updates: { 
      dueDate?: string; 
      addedToCalendar?: boolean;
    }
  ): Promise<void> => {
    try {
      // Optimistically update the UI
      setGoals(prevGoals => 
        prevGoals.map(goal => {
          if (goal.id === goalId) {
            const updatedTasks = goal.tasks.map(task => {
              if (task.id === taskId) {
                const updatedSubtasks = task.subtasks.map(subtask => {
                  if (subtask.id === subtaskId) {
                    return {
                      ...subtask,
                      ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
                      ...(updates.addedToCalendar !== undefined && { addedToCalendar: updates.addedToCalendar })
                    };
                  }
                  return subtask;
                });
                
                return { ...task, subtasks: updatedSubtasks };
              }
              return task;
            });
            
            return { ...goal, tasks: updatedTasks };
          }
          return goal;
        })
      );
      
      // Send update to API
      await apiRequest('PATCH', '/api/subtasks/schedule', { goalId, taskId, subtaskId, updates });
      
      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      
      toast({
        title: 'Subtask scheduled',
        description: updates.dueDate 
          ? `Subtask scheduled for ${new Date(updates.dueDate).toLocaleDateString()}.` 
          : 'Subtask schedule updated.',
      });
    } catch (err) {
      // Revert the optimistic update on error
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update subtask schedule. Please try again.',
      });
      console.error('Error updating subtask schedule:', err);
      
      // Refetch to get the correct state
      try {
        const response = await fetch(`/api/goals/${goalId}`, { credentials: 'include' });
        if (response.ok) {
          const updatedGoal = await response.json();
          setGoals(prevGoals => 
            prevGoals.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal)
          );
        }
      } catch (refetchError) {
        console.error('Error refetching goal:', refetchError);
      }
    }
  };

  // Update global user settings (e.g., WhatsApp preferences)
  const updateGlobalSettings = async (settings: UserSettings): Promise<void> => {
    try {
      // Store settings in localStorage for now
      // In a real app, these would be saved to the server
      const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      const updatedSettings = { ...userSettings, ...settings };
      localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      
      // For whatsapp notification specifically, update each task with the new settings
      if (settings.whatsappNumber && settings.enableWhatsappNotifications) {
        // Apply WhatsApp settings to all tasks that have reminders enabled but no WhatsApp config
        const updatedGoals = goals.map(goal => {
          const updatedTasks = goal.tasks.map(task => {
            if (task.reminderEnabled && !task.enableWhatsapp) {
              return {
                ...task,
                enableWhatsapp: true,
                whatsappNumber: settings.whatsappNumber
              };
            }
            return task;
          });
          
          return { ...goal, tasks: updatedTasks };
        });
        
        setGoals(updatedGoals);
        
        // Sync changes with the server
        // This would be an API call in a real implementation
        saveGoalsToLocalStorage(updatedGoals);
      }
      
      toast({
        title: 'Settings updated',
        description: 'Your notification preferences have been saved.',
      });
      
      return;
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
      });
      console.error('Error updating settings:', err);
      throw err;
    }
  };

  return (
    <GoalContext.Provider value={{ 
      goals, 
      loading, 
      error, 
      createGoal, 
      deleteGoal, 
      toggleTaskCompletion,
      toggleSubtaskCompletion,
      addProgressUpdate,
      reportRoadblock,
      updateTaskSchedule,
      updateSubtaskSchedule,
      updateGlobalSettings
    }}>
      {children}
    </GoalContext.Provider>
  );
};

export const useGoals = () => {
  const context = useContext(GoalContext);
  if (context === undefined) {
    throw new Error('useGoals must be used within a GoalProvider');
  }
  return context;
};

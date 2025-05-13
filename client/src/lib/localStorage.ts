import { Goal } from "../types";

const GOALS_STORAGE_KEY = 'taskbreaker_goals';

export const saveGoalsToLocalStorage = (goals: Goal[]): void => {
  try {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error('Failed to save goals to localStorage:', error);
  }
};

export const getGoalsFromLocalStorage = (): Goal[] => {
  try {
    const storedGoals = localStorage.getItem(GOALS_STORAGE_KEY);
    return storedGoals ? JSON.parse(storedGoals) : [];
  } catch (error) {
    console.error('Failed to get goals from localStorage:', error);
    return [];
  }
};

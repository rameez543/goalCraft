import React, { createContext, useState, useContext, ReactNode } from 'react';

interface TabContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  viewGoalDetails: (goalId: number) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  const viewGoalDetails = (goalId: number) => {
    setActiveTab('goals');
    setSelectedGoalId(goalId);
    // We'll use setTimeout to give the tab change time to complete
    // before attempting to scroll to the goal
    setTimeout(() => {
      const element = document.getElementById(`goal-${goalId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab, viewGoalDetails }}>
      {children}
    </TabContext.Provider>
  );
};

export const useTab = (): TabContextType => {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTab must be used within a TabProvider');
  }
  return context;
};
import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';

interface TabContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  viewGoalDetails: (goalId: number) => void;
  lockTab: () => void;
  unlockTab: () => void;
  preserveCurrentTab: <T>(callback: () => Promise<T>) => Promise<T>;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [tabLocked, setTabLocked] = useState(false);
  const previousTabRef = useRef<string>('dashboard');
  
  // Keep track of the previous tab for recovery if needed
  useEffect(() => {
    if (!tabLocked) {
      previousTabRef.current = activeTab;
    }
  }, [activeTab, tabLocked]);

  // Lock the current tab to prevent navigation
  const lockTab = () => setTabLocked(true);
  
  // Unlock tab navigation
  const unlockTab = () => setTabLocked(false);
  
  // Wrapper for async operations that should preserve the current tab
  const preserveCurrentTab = async <T,>(callback: () => Promise<T>): Promise<T> => {
    const currentTab = activeTab;
    lockTab();
    
    try {
      const result = await callback();
      return result;
    } finally {
      // If tab has changed during the operation, restore it
      if (activeTab !== currentTab) {
        setActiveTab(currentTab);
      }
      unlockTab();
    }
  };

  // A safer setActiveTab function that respects the lock
  const safeSetActiveTab = (tab: string) => {
    if (!tabLocked) {
      setActiveTab(tab);
    }
  };

  const viewGoalDetails = (goalId: number) => {
    if (tabLocked) return;
    
    safeSetActiveTab('goals');
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
    <TabContext.Provider value={{ 
      activeTab, 
      setActiveTab: safeSetActiveTab, 
      viewGoalDetails, 
      lockTab,
      unlockTab,
      preserveCurrentTab
    }}>
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
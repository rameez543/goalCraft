import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TaskInputForm from '../components/TaskInputForm';
import TaskResults from '../components/TaskResults';
import Dashboard from '../components/Dashboard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoals } from '../contexts/GoalContext';
import { useTab } from '../contexts/TabContext';

const Home: React.FC = () => {
  const { goals, loading, error, deleteGoal, toggleTaskCompletion, toggleSubtaskCompletion } = useGoals();
  const { activeTab, setActiveTab } = useTab();

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <TaskInputForm />

        <LoadingState isVisible={loading} />

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {!loading && goals.length > 0 && (
          <div className="animate-fadeIn mt-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6" id="mainTabsList">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="goals" id="goalsTab">Goal Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="dashboard" className="space-y-6">
                <Dashboard />
              </TabsContent>
              
              <TabsContent value="goals">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Your Goal Breakdown</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {goals.reduce((acc, goal) => acc + goal.tasks.filter(task => task.completed).length, 0)}/
                        {goals.reduce((acc, goal) => acc + goal.tasks.length, 0)} tasks completed
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ 
                            width: `${
                              goals.reduce((total, goal) => total + goal.progress, 0) / goals.length
                            }%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {goals.map((goal) => (
                    <TaskResults
                      key={goal.id}
                      goal={goal}
                      onDeleteGoal={deleteGoal}
                      onToggleTaskComplete={toggleTaskCompletion}
                      onToggleSubtaskComplete={toggleSubtaskCompletion}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <EmptyState isVisible={!loading && goals.length === 0} />
      </main>

      <Footer />
    </div>
  );
};

export default Home;

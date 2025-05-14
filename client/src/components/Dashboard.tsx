import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useGoals } from '../contexts/GoalContext';
import { Goal, ReminderFrequency } from '../types';
import AICoach, { RoadblockTips } from './AICoach';
import { WhatsAppNudge } from './WhatsAppNudge';
import { NotificationSettings } from './NotificationSettings';
import { useTab } from '../contexts/TabContext';

const Dashboard: React.FC = () => {
  const { goals, loading, updateGlobalSettings } = useGoals();
  
  // State for WhatsApp notification nudge
  const [showWhatsAppNudge, setShowWhatsAppNudge] = useState(false);
  const [whatsAppContactSaved, setWhatsAppContactSaved] = useState(false);
  
  // Removed the automatic WhatsApp notification popup as per user's request
  // User can now access it through settings

  // Handle enabling WhatsApp notifications
  const handleEnableWhatsApp = async (phoneNumber: string, frequency: ReminderFrequency = 'task-only'): Promise<void> => {
    try {
      // Default reminder time is 9 AM
      const defaultReminderTime = '09:00';
      
      // Save the WhatsApp number and frequency settings to user's settings
      await updateGlobalSettings({
        whatsappNumber: phoneNumber,
        enableWhatsappNotifications: true,
        reminderFrequency: frequency,
        reminderTime: defaultReminderTime
      });
      
      setWhatsAppContactSaved(true);
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
      throw error;
    }
  };

  // Filter goals with roadblocks
  const goalsWithRoadblocks = goals.filter(goal => goal.roadblocks);
  
  // Calculate overall progress across all goals
  const overallProgress = goals.length > 0
    ? Math.round(goals.reduce((acc, goal) => acc + goal.progress, 0) / goals.length)
    : 0;
  
  // Sort goals by progress (ascending)
  const sortedGoals = [...goals].sort((a, b) => a.progress - b.progress);
  
  // Get goals that need attention (less than 20% progress or have roadblocks)
  const needAttentionGoals = goals.filter(goal => goal.progress < 20 || goal.roadblocks);
  
  // Get most productive goals (highest progress)
  const topProgressGoals = [...goals].sort((a, b) => b.progress - a.progress).slice(0, 3);
  
  // Prepare progress data for visualization
  const progressBreakdown = [
    { label: '0-25%', count: goals.filter(g => g.progress <= 25).length, color: 'bg-red-400' },
    { label: '26-50%', count: goals.filter(g => g.progress > 25 && g.progress <= 50).length, color: 'bg-yellow-400' },
    { label: '51-75%', count: goals.filter(g => g.progress > 50 && g.progress <= 75).length, color: 'bg-blue-400' },
    { label: '76-100%', count: goals.filter(g => g.progress > 75).length, color: 'bg-green-400' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp Notification Nudge */}
      <WhatsAppNudge 
        isOpen={showWhatsAppNudge}
        onOpenChange={setShowWhatsAppNudge}
        onEnableWhatsApp={handleEnableWhatsApp}
        onSkip={() => setShowWhatsAppNudge(false)}
      />
      
      {/* Header with AI Coach + Quick Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 shadow-sm border border-blue-100">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* AI Coach Section */}
          <div className="w-full md:w-2/3 p-1">
            <AICoach />
          </div>
          
          {/* Quick Stats */}
          <div className="w-full md:w-1/3 flex flex-col gap-3">
            {/* Overall Progress */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700">Overall Progress</h3>
                <span className="text-xl font-bold text-blue-600">{overallProgress}%</span>
              </div>
              <Progress 
                value={overallProgress} 
                className="h-3 overflow-hidden" 
                style={{
                  background: 'linear-gradient(to right, #f0f9ff, #e0f2fe)',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
                }}
              />
              <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                <span>✨ {goals.length} goal{goals.length !== 1 ? 's' : ''}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs px-2 py-1 h-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => setShowWhatsAppNudge(true)}
                >
                  <span className="mr-1">💬</span> WhatsApp Settings
                </Button>
              </div>
            </div>
            
            {/* Roadblocks & Time Tracking */}
            <div className="flex gap-3">
              <div className="w-1/2 bg-white p-3 rounded-lg shadow-sm border border-red-100">
                <div className="flex items-center justify-between">
                  <span className="text-xl">🚧</span>
                  <span className="text-lg font-bold text-red-500">{goalsWithRoadblocks.length}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">Roadblocks</p>
              </div>
              
              <div className="w-1/2 bg-white p-3 rounded-lg shadow-sm border border-purple-100">
                <div className="flex items-center justify-between">
                  <span className="text-xl">⏱️</span>
                  <span className="text-lg font-bold text-purple-600">
                    {goals.reduce((acc, goal) => acc + (goal.totalEstimatedMinutes || 0), 0)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">Total Minutes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Goal Filter Tabs */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="all" className="rounded-lg text-sm">
              <span className="mr-1 text-lg">📋</span> All
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg text-sm">
              <span className="mr-1 text-lg">⚡</span> Active
            </TabsTrigger>
            <TabsTrigger value="needs-attention" className="rounded-lg text-sm">
              <span className="mr-1 text-lg">❗</span> Needs Help
              {needAttentionGoals.length > 0 && <span className="ml-1 text-xs bg-red-100 text-red-700 rounded-full px-1.5">{needAttentionGoals.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg text-sm">
              <span className="mr-1 text-lg">⚙️</span> Settings
            </TabsTrigger>
          </TabsList>
          
          {/* All Goals */}
          <TabsContent value="all" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-4">
              {goals.length === 0 ? (
                <div className="text-center p-10 bg-gray-50 rounded-lg">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="text-lg font-medium text-gray-700">No goals yet</h3>
                  <p className="text-sm text-gray-500 mt-2">Create your first goal to get started!</p>
                </div>
              ) : (
                goals.map(goal => <GoalSummaryCard key={goal.id} goal={goal} />)
              )}
            </div>
          </TabsContent>
          
          {/* Active Goals */}
          <TabsContent value="active" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-4">
              {topProgressGoals.length === 0 ? (
                <div className="text-center p-10 bg-gray-50 rounded-lg">
                  <div className="text-5xl mb-4">🚀</div>
                  <h3 className="text-lg font-medium text-gray-700">No active goals</h3>
                  <p className="text-sm text-gray-500 mt-2">Create a goal to see your progress!</p>
                </div>
              ) : (
                topProgressGoals.map(goal => <GoalSummaryCard key={goal.id} goal={goal} />)
              )}
            </div>
          </TabsContent>
          
          {/* Needs Attention */}
          <TabsContent value="needs-attention" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-4">
              {needAttentionGoals.length === 0 ? (
                <div className="text-center p-10 bg-gray-50 rounded-lg">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-lg font-medium text-gray-700">All goals are on track!</h3>
                  <p className="text-sm text-gray-500 mt-2">You're making good progress.</p>
                </div>
              ) : (
                <>
                  {/* Roadblocks */}
                  {goalsWithRoadblocks.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-md font-medium mb-3 flex items-center text-red-700">
                        <span className="mr-2">🚧</span> Roadblocks
                      </h3>
                      <div className="space-y-4">
                        {goalsWithRoadblocks.map(goal => (
                          <GoalSummaryCard key={goal.id} goal={goal} showRoadblock />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Low Progress */}
                  {needAttentionGoals.filter(goal => !goal.roadblocks).length > 0 && (
                    <div>
                      <h3 className="text-md font-medium mb-3 flex items-center text-yellow-700">
                        <span className="mr-2">⚠️</span> Low Progress
                      </h3>
                      <div className="space-y-4">
                        {needAttentionGoals
                          .filter(goal => !goal.roadblocks)
                          .map(goal => (
                            <GoalSummaryCard key={goal.id} goal={goal} />
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
          
          {/* Settings */}
          <TabsContent value="settings" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-4">
              <NotificationSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Goal Summary Card Component
const GoalSummaryCard: React.FC<{ goal: Goal; showRoadblock?: boolean }> = ({ goal, showRoadblock = false }) => {
  // Use tab context for navigation
  const { viewGoalDetails } = useTab();
  
  // Calculate task completion
  const totalTasks = goal.tasks.length;
  const completedTasks = goal.tasks.filter(task => task.completed).length;
  
  // State for expanded/collapsed view
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determine card background color based on progress
  const getBgGradient = () => {
    if (goal.progress >= 75) return 'from-green-50 to-emerald-50 border-green-100';
    if (goal.progress >= 50) return 'from-blue-50 to-indigo-50 border-blue-100';
    if (goal.progress >= 25) return 'from-yellow-50 to-amber-50 border-yellow-100';
    return 'from-red-50 to-rose-50 border-red-100';
  };
  
  // Get emoji based on progress
  const getEmoji = () => {
    if (goal.progress >= 75) return '🎯';
    if (goal.progress >= 50) return '🚀';
    if (goal.progress >= 25) return '🔄';
    return '🏁';
  };
  
  return (
    <Card 
      className={`overflow-hidden transition-all duration-300 ease-in-out border shadow-sm bg-gradient-to-br ${getBgGradient()}`}
    >
      <div 
        className="p-4 cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl mr-2">{getEmoji()}</span>
            <h3 className="font-medium text-lg">{goal.title}</h3>
          </div>
          <div className="flex items-center">
            <div className="px-3 py-1 rounded-full bg-white bg-opacity-70 shadow-sm mr-3">
              <span className="font-bold text-sm">{goal.progress}%</span>
            </div>
            <span className="text-gray-500">
              {isExpanded ? '↑' : '↓'}
            </span>
          </div>
        </div>
        
        <div className="mt-3">
          <Progress 
            value={goal.progress} 
            className="h-2"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
            }}
          />
        </div>
      </div>
      
      {/* Expandable Content */}
      {isExpanded && (
        <div className="bg-white p-4 border-t">
          {/* Summary Stats */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[130px] p-3 rounded-lg bg-blue-50 text-center">
              <div className="text-xs text-blue-500 uppercase font-medium">Tasks</div>
              <div className="text-lg font-bold text-blue-700">{completedTasks}/{totalTasks}</div>
            </div>
            
            {goal.timeConstraintMinutes && (
              <div className="flex-1 min-w-[130px] p-3 rounded-lg bg-purple-50 text-center">
                <div className="text-xs text-purple-500 uppercase font-medium">Time Constraint</div>
                <div className="text-lg font-bold text-purple-700">{goal.timeConstraintMinutes} min</div>
              </div>
            )}
            
            {goal.roadblocks && (
              <div className="flex-1 min-w-[130px] p-3 rounded-lg bg-red-50 text-center">
                <div className="text-xs text-red-500 uppercase font-medium">Roadblock</div>
                <div className="text-sm font-medium text-red-700 truncate">Active</div>
              </div>
            )}
          </div>
          
          {/* Roadblock Section */}
          {showRoadblock && goal.roadblocks && (
            <div className="mb-4">
              <h4 className="font-medium text-red-600 mb-2 flex items-center">
                <span className="mr-1">🚧</span> Reported Roadblock:
              </h4>
              <div className="p-3 bg-red-50 rounded-md text-sm border border-red-100">
                {goal.roadblocks}
              </div>
            </div>
          )}
          
          {/* Tasks Section */}
          {(!showRoadblock || !goal.roadblocks) && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 flex items-center">
                <span className="mr-1">📋</span> Next Tasks:
              </h4>
              <ul className="space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
                {goal.tasks
                  .filter(task => !task.completed)
                  .slice(0, 3)
                  .map(task => (
                    <li key={task.id} className="flex items-start bg-white p-2 rounded-md shadow-sm">
                      <div className="h-5 w-5 rounded-full border border-gray-300 mt-0.5 mr-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium">{task.title}</div>
                        {task.estimatedMinutes && (
                          <div className="text-xs text-gray-500">{task.estimatedMinutes} min · {task.complexity || 'medium'} complexity</div>
                        )}
                      </div>
                    </li>
                  ))}
                {goal.tasks.filter(task => !task.completed).length === 0 && (
                  <li className="text-green-600 bg-white p-2 rounded-md shadow-sm flex items-center">
                    <span className="mr-1">🎉</span> All tasks completed!
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {/* Last Progress Update */}
          {goal.lastProgressUpdate && (
            <div>
              <h4 className="font-medium text-blue-600 text-sm mb-1 flex items-center">
                <span className="mr-1">📝</span> Latest Update:
              </h4>
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">{goal.lastProgressUpdate}</p>
            </div>
          )}
          
          {/* View Details Button */}
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              className="text-sm gap-1"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card collapse when clicking button
                // Use tab context to navigate to goal details
                viewGoalDetails(goal.id);
              }}
            >
              <span>View Full Details</span>
              <span>→</span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default Dashboard;
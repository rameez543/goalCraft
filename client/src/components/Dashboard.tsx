import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoals } from '../contexts/GoalContext';
import { Goal } from '../types';

const Dashboard: React.FC = () => {
  const { goals, loading } = useGoals();

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Progress Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Progress value={overallProgress} className="h-2 flex-1 mr-4" />
              <span className="text-2xl font-bold">{overallProgress}%</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {goals.length} active goal{goals.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Roadblocks Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Roadblocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold text-red-500">{goalsWithRoadblocks.length}</div>
              <div className="ml-4 text-sm text-gray-500">
                {goalsWithRoadblocks.length === 0 
                  ? 'No roadblocks reported' 
                  : `Goal${goalsWithRoadblocks.length !== 1 ? 's' : ''} with roadblocks`}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Tracking Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Time Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {goals.reduce((acc, goal) => acc + (goal.totalEstimatedMinutes || 0), 0)} min
              </div>
              <div className="ml-4 text-sm text-gray-500">
                Total estimated time
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Goals</TabsTrigger>
          <TabsTrigger value="needs-attention">
            Needs Attention {needAttentionGoals.length > 0 && `(${needAttentionGoals.length})`}
          </TabsTrigger>
          <TabsTrigger value="roadblocks">
            Roadblocks {goalsWithRoadblocks.length > 0 && `(${goalsWithRoadblocks.length})`}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <div className="space-y-4">
            {goals.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-700">No goals yet</h3>
                    <p className="text-sm text-gray-500 mt-2">Create your first goal to get started!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              goals.map(goal => <GoalSummaryCard key={goal.id} goal={goal} />)
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="needs-attention" className="mt-4">
          <div className="space-y-4">
            {needAttentionGoals.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-700">All goals are on track!</h3>
                    <p className="text-sm text-gray-500 mt-2">You're making good progress.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              needAttentionGoals.map(goal => <GoalSummaryCard key={goal.id} goal={goal} />)
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="roadblocks" className="mt-4">
          <div className="space-y-4">
            {goalsWithRoadblocks.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-700">No roadblocks reported</h3>
                    <p className="text-sm text-gray-500 mt-2">You're making smooth progress!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              goalsWithRoadblocks.map(goal => <GoalSummaryCard key={goal.id} goal={goal} showRoadblock />)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Goal Summary Card Component
const GoalSummaryCard: React.FC<{ goal: Goal; showRoadblock?: boolean }> = ({ goal, showRoadblock = false }) => {
  // Calculate task completion
  const totalTasks = goal.tasks.length;
  const completedTasks = goal.tasks.filter(task => task.completed).length;
  
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Progress Section */}
        <div className="p-4 w-full md:w-1/3 border-r border-gray-100 bg-gray-50">
          <h3 className="font-medium text-lg truncate">
            <a href={`#goal-${goal.id}`} className="text-blue-600 hover:underline">{goal.title}</a>
          </h3>
          
          <div className="mt-3 flex items-center">
            <Progress value={goal.progress} className="h-2 flex-1 mr-4" />
            <span className="text-lg font-semibold">{goal.progress}%</span>
          </div>
          
          <div className="mt-2 text-sm text-gray-500">
            {completedTasks} of {totalTasks} tasks completed
          </div>
          
          {goal.timeConstraintMinutes && (
            <div className="mt-2 text-xs text-purple-600 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {goal.timeConstraintMinutes} min time constraint
            </div>
          )}
        </div>
        
        {/* Tasks/Roadblocks Section */}
        <div className="p-4 w-full md:w-2/3">
          {showRoadblock && goal.roadblocks ? (
            <div>
              <h4 className="font-medium text-red-600 mb-2">Reported Roadblock:</h4>
              <div className="p-3 bg-red-50 rounded-md text-sm">
                {goal.roadblocks}
              </div>
            </div>
          ) : (
            <>
              <h4 className="font-medium mb-2">Next Tasks:</h4>
              <ul className="text-sm space-y-2">
                {goal.tasks
                  .filter(task => !task.completed)
                  .slice(0, 3)
                  .map(task => (
                    <li key={task.id} className="flex items-start">
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
                  <li className="text-green-600">All tasks completed!</li>
                )}
              </ul>
            </>
          )}
          
          {/* Last Progress Update */}
          {goal.lastProgressUpdate && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h4 className="font-medium text-blue-600 text-sm mb-1">Latest Update:</h4>
              <p className="text-sm text-gray-600">{goal.lastProgressUpdate}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default Dashboard;
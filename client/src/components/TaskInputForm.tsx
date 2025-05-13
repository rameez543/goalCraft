import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useGoals } from '../contexts/GoalContext';
import { useToast } from '@/hooks/use-toast';

const TaskInputForm: React.FC = () => {
  const [goalInput, setGoalInput] = useState('');
  const { createGoal, loading } = useGoals();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!goalInput.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a goal to break down.',
      });
      return;
    }

    try {
      await createGoal(goalInput);
      setGoalInput(''); // Clear the input after successful submission
    } catch (error) {
      console.error('Error submitting goal:', error);
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-md mb-8 transition-all duration-300 hover:shadow-lg">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Enter Your Goal</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">
                What would you like to accomplish?
              </Label>
              <Textarea
                id="goal"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="e.g., Learn to play the guitar, Launch a small business website, Prepare for a marathon..."
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-blue-600 transition duration-200 flex items-center justify-center"
                disabled={loading}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v16.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h12.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V8.5L15.5 2z" />
                  <path d="M3 7.6v16.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h12.8" />
                  <path d="M15 2v6.5H21" />
                </svg>
                Break It Down
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Our AI will analyze your goal and break it down into manageable tasks.
              </p>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskInputForm;

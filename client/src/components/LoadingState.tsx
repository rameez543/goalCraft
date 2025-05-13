import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface LoadingStateProps {
  isVisible: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <Card className="bg-white rounded-xl shadow-md p-6 mb-8 text-center animate-fadeIn">
      <CardContent className="py-8 px-4">
        <div className="animate-spin-slow h-12 w-12 text-primary mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <p className="mt-4 text-gray-600">Breaking down your goal into actionable tasks...</p>
        <div className="mt-6 w-full">
          <Progress value={75} className="h-2 w-full bg-gray-200" />
        </div>
      </CardContent>
    </Card>
  );
};

export default LoadingState;

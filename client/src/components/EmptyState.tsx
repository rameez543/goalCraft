import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  isVisible: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <Card className="bg-white rounded-xl shadow-md p-6 mb-8 text-center">
      <CardContent className="py-6 px-4">
        <div className="text-primary text-5xl mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Start by entering a goal</h3>
        <p className="text-gray-600">
          Enter any goal or task, and our AI will break it down into smaller, manageable steps.
        </p>
      </CardContent>
    </Card>
  );
};

export default EmptyState;

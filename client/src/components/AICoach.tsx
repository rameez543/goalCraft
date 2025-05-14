import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CoachMessage {
  message: string;
  type: 'encouragement' | 'tip' | 'congratulation' | 'milestone';
}

interface RoadblockTipsResponse {
  tips: string[];
}

const AICoach: React.FC = () => {
  // Fetch coach message from server
  const { 
    data: coachData, 
    isLoading: isCoachLoading, 
    isError: isCoachError 
  } = useQuery<CoachMessage>({
    queryKey: ['/api/coach/message'],
    staleTime: 5 * 60 * 1000,  // Cache for 5 minutes
    refetchOnWindowFocus: false
  });

  // Get the correct icon based on message type
  const getMessageIcon = (type: CoachMessage['type']) => {
    switch (type) {
      case 'encouragement':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'tip':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-yellow-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        );
      case 'congratulation':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case 'milestone':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-purple-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
            />
          </svg>
        );
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  // Get background color based on message type
  const getMessageBgColor = (type: CoachMessage['type']) => {
    switch (type) {
      case 'encouragement':
        return 'bg-blue-50';
      case 'tip':
        return 'bg-yellow-50';
      case 'congratulation':
        return 'bg-green-50';
      case 'milestone':
        return 'bg-purple-50';
      default:
        return 'bg-blue-50';
    }
  };

  // Get border color based on message type
  const getMessageBorderColor = (type: CoachMessage['type']) => {
    switch (type) {
      case 'encouragement':
        return 'border-blue-200';
      case 'tip':
        return 'border-yellow-200';
      case 'congratulation':
        return 'border-green-200';
      case 'milestone':
        return 'border-purple-200';
      default:
        return 'border-blue-200';
    }
  };

  if (isCoachLoading) {
    return (
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
            <div className="ml-3 flex-1">
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isCoachError || !coachData) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">
                Keep going! You're doing great with your tasks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${getMessageBgColor(coachData.type)} border ${getMessageBorderColor(coachData.type)}`}>
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 border ${getMessageBorderColor(coachData.type)}`}>
            {getMessageIcon(coachData.type)}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-800">
              {coachData.message}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Your TaskBreaker AI Coach
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface RoadblockTipsProps {
  goalId: number;
}

export const RoadblockTips: React.FC<RoadblockTipsProps> = ({ goalId }) => {
  const { 
    data: tipsData, 
    isLoading, 
    isError
  } = useQuery<RoadblockTipsResponse>({
    queryKey: [`/api/coach/roadblock-tips/${goalId}`],
    enabled: !!goalId,
    staleTime: 10 * 60 * 1000,  // Cache for 10 minutes
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-md animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-4/5"></div>
      </div>
    );
  }

  if (isError || !tipsData || !tipsData.tips.length) {
    return (
      <div className="p-4 bg-red-50 rounded-md">
        <h4 className="text-sm font-medium text-red-800 mb-2">Tips for overcoming roadblocks:</h4>
        <ul className="text-sm text-red-700 space-y-2 pl-5 list-disc">
          <li>Break down the roadblock into smaller, more manageable steps.</li>
          <li>Consider asking for help or advice from someone with expertise.</li>
          <li>Take a short break and return with a fresh perspective.</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="p-4 bg-orange-50 rounded-md border border-orange-100">
      <h4 className="text-sm font-medium text-orange-800 mb-2">AI Coach Tips:</h4>
      <ul className="text-sm text-orange-700 space-y-2 pl-5 list-disc">
        {tipsData.tips.map((tip, index) => (
          <li key={index}>{tip}</li>
        ))}
      </ul>
    </div>
  );
};

export default AICoach;
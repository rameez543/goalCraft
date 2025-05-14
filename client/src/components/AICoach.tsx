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

  // Get the correct emoji icon based on message type
  const getMessageIcon = (type: CoachMessage['type']) => {
    switch (type) {
      case 'encouragement':
        return <span className="text-2xl">🌟</span>;
      case 'tip':
        return <span className="text-2xl">💡</span>;
      case 'congratulation':
        return <span className="text-2xl">🎉</span>;
      case 'milestone':
        return <span className="text-2xl">🏆</span>;
      default:
        return <span className="text-2xl">🤖</span>;
    }
  };

  // Get background color based on message type
  const getMessageBgColor = (type: CoachMessage['type']) => {
    switch (type) {
      case 'encouragement':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50';
      case 'tip':
        return 'bg-gradient-to-r from-yellow-50 to-amber-50';
      case 'congratulation':
        return 'bg-gradient-to-r from-green-50 to-emerald-50';
      case 'milestone':
        return 'bg-gradient-to-r from-purple-50 to-fuchsia-50';
      default:
        return 'bg-gradient-to-r from-blue-50 to-indigo-50';
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
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center animate-pulse">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
              <span className="text-gray-300 text-xl sm:text-2xl">🤖</span>
            </div>
            <div className="ml-3 sm:ml-4 flex-1">
              <div className="h-3 sm:h-4 bg-gray-200 rounded-full w-3/4 mb-2 sm:mb-3"></div>
              <div className="h-2 sm:h-3 bg-gray-200 rounded-full w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isCoachError || !coachData) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">🤖</span>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-blue-800">
                Keep going! You're doing great with your tasks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${getMessageBgColor(coachData.type)} border ${getMessageBorderColor(coachData.type)} shadow-sm`}>
      <CardContent className="p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center flex-shrink-0 border-2 ${getMessageBorderColor(coachData.type)} shadow-sm mx-auto sm:mx-0`}>
            {getMessageIcon(coachData.type)}
          </div>
          <div className="sm:ml-2 text-center sm:text-left">
            <p className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed">
              {coachData.message}
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-gray-500 mt-1 sm:mt-2 flex items-center justify-center sm:justify-start">
              <span className="text-base sm:text-lg mr-1">🧠</span> Your TaskBreaker AI Coach
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
      <div className="p-3 sm:p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow-sm animate-pulse border border-gray-200">
        <div className="flex items-center mb-2 sm:mb-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-full mr-2 sm:mr-3"></div>
          <div className="h-3 sm:h-4 bg-gray-200 rounded-full w-3/4"></div>
        </div>
        <div className="h-2 sm:h-3 bg-gray-200 rounded-full w-full mb-2 sm:mb-3"></div>
        <div className="h-2 sm:h-3 bg-gray-200 rounded-full w-5/6 mb-2 sm:mb-3"></div>
        <div className="h-2 sm:h-3 bg-gray-200 rounded-full w-4/5"></div>
      </div>
    );
  }

  if (isError || !tipsData || !tipsData.tips.length) {
    return (
      <div className="p-3 sm:p-5 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg shadow-sm border border-red-100">
        <h4 className="text-xs sm:text-sm font-medium text-red-800 mb-2 sm:mb-3 flex items-center">
          <span className="text-lg sm:text-xl mr-1.5 sm:mr-2">🛠️</span> Tips for overcoming roadblocks:
        </h4>
        <ul className="text-xs sm:text-sm text-red-700 space-y-2 sm:space-y-3">
          <li className="flex items-start">
            <span className="text-red-500 mr-1.5 sm:mr-2 flex-shrink-0">•</span>
            <span>Break down the roadblock into smaller, more manageable steps.</span>
          </li>
          <li className="flex items-start">
            <span className="text-red-500 mr-1.5 sm:mr-2 flex-shrink-0">•</span>
            <span>Consider asking for help or advice from someone with expertise.</span>
          </li>
          <li className="flex items-start">
            <span className="text-red-500 mr-1.5 sm:mr-2 flex-shrink-0">•</span>
            <span>Take a short break and return with a fresh perspective.</span>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg shadow-sm border border-orange-100">
      <h4 className="text-xs sm:text-sm font-medium text-orange-800 mb-2 sm:mb-3 flex items-center">
        <span className="text-lg sm:text-xl mr-1.5 sm:mr-2">💡</span> AI Coach Tips:
      </h4>
      <ul className="text-xs sm:text-sm text-orange-700 space-y-2 sm:space-y-3">
        {tipsData.tips.map((tip, index) => (
          <li key={index} className="flex items-start">
            <span className="text-orange-500 mr-1.5 sm:mr-2 flex-shrink-0">•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AICoach;
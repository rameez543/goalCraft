import React, { useState } from 'react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ReminderFrequency } from '../types';

interface WhatsAppNudgeProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEnableWhatsApp: (phoneNumber: string, frequency?: ReminderFrequency) => Promise<void>;
  onSkip: () => void;
}

export const WhatsAppNudge: React.FC<WhatsAppNudgeProps> = ({
  isOpen,
  onOpenChange,
  onEnableWhatsApp,
  onSkip
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [reminderFrequency, setReminderFrequency] = useState<'daily' | 'weekly' | 'task-only'>('task-only');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnableWhatsApp = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your WhatsApp number');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to receive WhatsApp notifications');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Pass the phone number and frequency settings
      await onEnableWhatsApp(phoneNumber, reminderFrequency);
      onOpenChange(false);
    } catch (err) {
      setError('Failed to save your WhatsApp preferences. Please try again.');
      console.error('Error enabling WhatsApp:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">Boost Your Task Completion</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Research shows that people who receive task reminders are 3x more likely to complete their goals on time.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium text-blue-800 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Get WhatsApp notifications
            </h3>
            <p className="text-sm text-blue-700">
              Receive friendly reminders for upcoming tasks directly via WhatsApp. No app downloads required!
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-number" className="text-sm font-medium">
                  Your WhatsApp Number
                </Label>
                <input
                  id="whatsapp-number"
                  type="tel"
                  inputMode="tel"
                  placeholder="+1 (555) 555-5555"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500">
                  Enter your number in international format (e.g., +1 for US)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reminder-frequency" className="text-sm font-medium">
                  Reminder Frequency
                </Label>
                <Select 
                  value={reminderFrequency}
                  onValueChange={(value) => setReminderFrequency(value as ReminderFrequency)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Summary</SelectItem>
                    <SelectItem value="weekly">Weekly Summary</SelectItem>
                    <SelectItem value="task-only">Task Due Dates Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Choose how often you'll receive WhatsApp reminders
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="agree-terms"
                checked={agreedToTerms}
                onCheckedChange={setAgreedToTerms}
              />
              <Label htmlFor="agree-terms" className="text-sm">
                I agree to receive WhatsApp notifications about my tasks
              </Label>
            </div>

            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={onSkip}
            className="mt-2 sm:mt-0"
          >
            Not Now
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleEnableWhatsApp}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Enable WhatsApp Reminders'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
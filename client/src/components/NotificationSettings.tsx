import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useGoals } from '../contexts/GoalContext';
import { UserSettings, NotificationChannel } from '../types';

export const NotificationSettings: React.FC = () => {
  const { updateGlobalSettings } = useGoals();
  const { toast } = useToast();
  
  // State for settings
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState<'daily' | 'weekly' | 'task-only'>('task-only');
  const [customTime, setCustomTime] = useState('09:00');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load existing settings on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings) as UserSettings;
          
          if (settings.whatsappNumber) {
            setWhatsappNumber(settings.whatsappNumber);
          }
          
          if (settings.enableWhatsappNotifications !== undefined) {
            setWhatsappEnabled(settings.enableWhatsappNotifications);
          }
          
          if (settings.reminderFrequency) {
            setReminderFrequency(settings.reminderFrequency as 'daily' | 'weekly' | 'task-only');
          }
          
          if (settings.reminderTime) {
            setCustomTime(settings.reminderTime);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate WhatsApp number format if enabled
      if (whatsappEnabled && !whatsappNumber.trim()) {
        toast({
          variant: 'destructive',
          title: 'Invalid WhatsApp number',
          description: 'Please enter a valid WhatsApp number to enable notifications.',
        });
        setIsSubmitting(false);
        return;
      }
      
      // Build settings object
      const settings: UserSettings = {
        enableWhatsappNotifications: whatsappEnabled,
        whatsappNumber: whatsappNumber.trim(),
        reminderFrequency,
        reminderTime: customTime,
        defaultNotificationChannels: whatsappEnabled 
          ? ['whatsapp'] 
          : []
      };
      
      // Save settings
      await updateGlobalSettings(settings);
      
      toast({
        title: 'Settings saved',
        description: 'Your notification preferences have been updated.',
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error saving settings',
        description: 'Please try again.',
      });
      console.error('Error saving settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Notification Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* WhatsApp Notifications */}
        <div className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <h3 className="text-lg font-semibold">WhatsApp Notifications</h3>
            <p className="text-sm text-gray-500">
              Receive reminders about your tasks via WhatsApp
            </p>
          </div>
          
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="whatsapp-enabled" className="font-medium">
              Enable WhatsApp notifications
            </Label>
            <Switch
              id="whatsapp-enabled"
              checked={whatsappEnabled}
              onCheckedChange={setWhatsappEnabled}
              disabled={isSubmitting}
            />
          </div>
          
          {whatsappEnabled && (
            <div className="space-y-3 rounded-md border border-gray-100 bg-gray-50 p-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-number" className="text-sm font-medium">
                  WhatsApp Number
                </Label>
                <div className="flex items-center">
                  <input
                    id="whatsapp-number"
                    type="tel"
                    inputMode="tel"
                    placeholder="+1 (555) 555-5555"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
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
                  onValueChange={(value) => setReminderFrequency(value as 'daily' | 'weekly' | 'task-only')}
                  disabled={isSubmitting}
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
                  How often you want to receive reminders
                </p>
              </div>
              
              {reminderFrequency !== 'task-only' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-time" className="text-sm font-medium">
                    Preferred Time for Summaries
                  </Label>
                  <input
                    id="custom-time"
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500">
                    When you want to receive your {reminderFrequency} summary
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Test notification */}
        {whatsappEnabled && whatsappNumber && (
          <div className="pt-2 mt-2 border-t border-gray-100">
            <div className="flex items-center p-3 mb-3 text-sm rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>WhatsApp Business API needed:</strong> Currently in development mode (messages are logged to console). 
                Integration with MessageBird, Infobip, or Meta's WhatsApp Business API required for production use.
              </span>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              disabled={isSubmitting}
              onClick={async () => {
                try {
                  // Call the test endpoint that will log a message to the console
                  const response = await fetch('/api/whatsapp/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: whatsappNumber })
                  });
                  
                  const data = await response.json();
                  
                  if (response.ok) {
                    toast({
                      title: 'Test notification sent',
                      description: `A test message for ${whatsappNumber} was logged to the server console`,
                    });
                  } else {
                    toast({
                      variant: 'destructive',
                      title: 'Error sending test',
                      description: data.message || 'Failed to send test message'
                    });
                  }
                } catch (error) {
                  console.error('Error sending test WhatsApp message:', error);
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not connect to the server'
                  });
                }
              }}
            >
              Send Test Notification
            </Button>
            <p className="mt-2 text-xs text-gray-500">
              This will log a test message to the server console. In production with a WhatsApp Business API provider configured (like MessageBird, Infobip, etc.), messages would be sent to your WhatsApp number.
            </p>
          </div>
        )}
        
        {/* Save Button */}
        <div className="flex justify-end pt-4 mt-2 border-t border-gray-100">
          <Button
            onClick={handleSaveSettings}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Notification Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useGoals } from '../contexts/GoalContext';
import { useToast } from '@/hooks/use-toast';
import { NotificationChannel } from '../types';

const TaskInputForm: React.FC = () => {
  const [goalInput, setGoalInput] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [hasTimeConstraint, setHasTimeConstraint] = useState(false);
  const [timeConstraintMinutes, setTimeConstraintMinutes] = useState<number | undefined>(undefined);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showNotificationOptions, setShowNotificationOptions] = useState(false);
  
  // Notification options
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
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

    // Validate contact info if notifications are enabled
    if (enableNotifications) {
      if (notificationChannels.includes('email') && !contactEmail) {
        toast({
          variant: 'destructive',
          title: 'Missing contact information',
          description: 'Please provide an email address for email notifications.',
        });
        return;
      }
      
      if (notificationChannels.includes('whatsapp') && !contactPhone) {
        toast({
          variant: 'destructive',
          title: 'Missing contact information',
          description: 'Please provide a phone number for WhatsApp notifications.',
        });
        return;
      }
    }

    try {
      // Prepare the data including the optional fields
      const goalData = {
        title: goalInput,
        additionalInfo: additionalInfo.trim() || undefined,
        timeConstraintMinutes: hasTimeConstraint ? timeConstraintMinutes : undefined,
        notificationChannels: enableNotifications ? notificationChannels : [],
        contactEmail: enableNotifications && notificationChannels.includes('email') ? contactEmail : undefined,
        contactPhone: enableNotifications && notificationChannels.includes('whatsapp') ? contactPhone : undefined
      };
      
      await createGoal(
        goalData.title,
        goalData.timeConstraintMinutes,
        goalData.additionalInfo,
        goalData.notificationChannels,
        goalData.contactEmail,
        goalData.contactPhone
      );
      
      // Clear the input after successful submission
      setGoalInput(''); 
      setAdditionalInfo('');
      setTimeConstraintMinutes(undefined);
      setHasTimeConstraint(false);
      setShowAdvancedOptions(false);
      setShowNotificationOptions(false);
      setEnableNotifications(false);
      setNotificationChannels([]);
      setContactEmail('');
      setContactPhone('');
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
            
            <Accordion
              type="multiple"
              className="w-full"
              value={[
                ...(showAdvancedOptions ? ["advanced-options"] : []),
                ...(showNotificationOptions ? ["notification-options"] : [])
              ]}
              onValueChange={(value) => {
                setShowAdvancedOptions(value.includes("advanced-options"));
                setShowNotificationOptions(value.includes("notification-options"));
              }}
            >
              <AccordionItem value="advanced-options" className="border-b-0">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary py-2">
                  Advanced Options
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  {/* Time Constraints */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="time-constraint"
                        checked={hasTimeConstraint}
                        onCheckedChange={setHasTimeConstraint}
                      />
                      <Label htmlFor="time-constraint" className="text-sm font-medium text-gray-700">
                        Set time constraint
                      </Label>
                    </div>
                  </div>
                  
                  {hasTimeConstraint && (
                    <div className="pl-8">
                      <Label htmlFor="time-minutes" className="text-sm font-medium text-gray-700 mb-1 block">
                        Total available time (minutes)
                      </Label>
                      <Input
                        id="time-minutes"
                        type="number"
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="e.g., 60 for 1 hour, 120 for 2 hours"
                        value={timeConstraintMinutes || ''}
                        onChange={(e) => setTimeConstraintMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                        disabled={loading}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        We'll optimize your tasks to fit within this timeframe
                      </p>
                    </div>
                  )}
                  
                  {/* Additional Information */}
                  <div>
                    <Label htmlFor="additional-info" className="text-sm font-medium text-gray-700 mb-1 block">
                      Additional Information
                    </Label>
                    <Textarea
                      id="additional-info"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Add more context or specific details that might help break down this goal more accurately..."
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For complex goals, adding more details helps create a better task breakdown
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="notification-options" className="border-b-0">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary py-2">
                  Accountability & Notifications
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  {/* Enable Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enable-notifications"
                        checked={enableNotifications}
                        onCheckedChange={setEnableNotifications}
                      />
                      <Label htmlFor="enable-notifications" className="text-sm font-medium text-gray-700">
                        Enable notifications for accountability
                      </Label>
                    </div>
                  </div>
                  
                  {enableNotifications && (
                    <div className="space-y-4 pl-8">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Notification Channels
                        </Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="email-notify" 
                              checked={notificationChannels.includes('email')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNotificationChannels([...notificationChannels, 'email']);
                                } else {
                                  setNotificationChannels(notificationChannels.filter(channel => channel !== 'email'));
                                }
                              }}
                            />
                            <Label htmlFor="email-notify" className="text-sm text-gray-700">
                              Email
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="whatsapp-notify" 
                              checked={notificationChannels.includes('whatsapp')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNotificationChannels([...notificationChannels, 'whatsapp']);
                                } else {
                                  setNotificationChannels(notificationChannels.filter(channel => channel !== 'whatsapp'));
                                }
                              }}
                            />
                            <Label htmlFor="whatsapp-notify" className="text-sm text-gray-700">
                              WhatsApp
                            </Label>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contact Information */}
                      {notificationChannels.includes('email') && (
                        <div>
                          <Label htmlFor="contact-email" className="text-sm font-medium text-gray-700 mb-1 block">
                            Email Address
                          </Label>
                          <Input
                            id="contact-email"
                            type="email"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
                            placeholder="your@email.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                      )}
                      
                      {notificationChannels.includes('whatsapp') && (
                        <div>
                          <Label htmlFor="contact-phone" className="text-sm font-medium text-gray-700 mb-1 block">
                            Phone Number (with country code)
                          </Label>
                          <Input
                            id="contact-phone"
                            type="tel"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
                            placeholder="+1234567890"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            disabled={loading}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Include country code (e.g., +1 for US)
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700">
                          With notifications enabled, you'll receive updates and can report progress or roadblocks to help you stay accountable toward your goal.
                        </p>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
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
                Our AI will analyze your goal and break it down into manageable tasks with time estimates.
              </p>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskInputForm;

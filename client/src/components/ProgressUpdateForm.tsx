import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useGoals } from '../contexts/GoalContext';
import { useToast } from '@/hooks/use-toast';
import { NotificationChannel } from '../types';

interface ProgressUpdateFormProps {
  goalId: number;
  goalTitle: string;
}

const ProgressUpdateForm: React.FC<ProgressUpdateFormProps> = ({ goalId, goalTitle }) => {
  // Form state
  const [updateMessage, setUpdateMessage] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { addProgressUpdate, loading } = useGoals();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!updateMessage.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a progress update.',
      });
      return;
    }

    // Validate contact info if notifications are enabled
    if (notifyEmail && !contactEmail) {
      toast({
        variant: 'destructive',
        title: 'Missing contact information',
        description: 'Please provide an email address for email notifications.',
      });
      return;
    }
    
    if (notifyWhatsApp && !contactPhone) {
      toast({
        variant: 'destructive',
        title: 'Missing contact information',
        description: 'Please provide a phone number for WhatsApp notifications.',
      });
      return;
    }

    try {
      // Build notification channels
      const notifyChannels: NotificationChannel[] = [];
      if (notifyEmail) notifyChannels.push('email');
      if (notifyWhatsApp) notifyChannels.push('whatsapp');
      
      await addProgressUpdate({
        goalId,
        updateMessage,
        notifyChannels,
        contactEmail: notifyEmail ? contactEmail : undefined,
        contactPhone: notifyWhatsApp ? contactPhone : undefined
      });
      
      // Reset form
      setUpdateMessage('');
      setIsDialogOpen(false);
      
      toast({
        title: 'Progress update submitted',
        description: 'Your progress has been recorded.',
      });
    } catch (error) {
      console.error('Error submitting progress update:', error);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <svg
            className="w-4 h-4 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Update Progress
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="goal-title" className="text-sm font-medium text-gray-700 block">
                Goal
              </Label>
              <div id="goal-title" className="text-sm font-medium mt-1">
                {goalTitle}
              </div>
            </div>
            
            <div>
              <Label htmlFor="update-message" className="text-sm font-medium text-gray-700 block">
                Progress Update
              </Label>
              <Textarea
                id="update-message"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary mt-1"
                placeholder="Describe your progress or what you've completed..."
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 block">
                Send Notifications (Optional)
              </Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="notify-email" 
                    checked={notifyEmail}
                    onCheckedChange={(checked) => setNotifyEmail(checked === true)}
                  />
                  <Label htmlFor="notify-email" className="text-sm text-gray-700">
                    Email
                  </Label>
                </div>
                
                {notifyEmail && (
                  <div className="pl-6">
                    <Label htmlFor="contact-email" className="text-xs font-medium text-gray-700 block mb-1">
                      Email Address
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm"
                      placeholder="your@email.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="notify-whatsapp" 
                    checked={notifyWhatsApp}
                    onCheckedChange={(checked) => setNotifyWhatsApp(checked === true)}
                  />
                  <Label htmlFor="notify-whatsapp" className="text-sm text-gray-700">
                    WhatsApp
                  </Label>
                </div>
                
                {notifyWhatsApp && (
                  <div className="pl-6">
                    <Label htmlFor="contact-phone" className="text-xs font-medium text-gray-700 block mb-1">
                      Phone Number (with country code)
                    </Label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm"
                      placeholder="+1234567890"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              Submit Update
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProgressUpdateForm;
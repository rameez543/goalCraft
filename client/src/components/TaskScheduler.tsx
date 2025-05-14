import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Task, Subtask } from '../types';

interface TaskSchedulerProps {
  task: Task;
  subtask?: Subtask;
  onUpdateDueDate: (dueDate: string | undefined) => void;
  onAddToCalendar: (add: boolean) => void;
  onEnableReminder?: (enabled: boolean, reminderTime?: string) => void;
  onEnableWhatsapp?: (enabled: boolean, phoneNumber?: string) => void;
  contactPhone?: string;
}

export const TaskScheduler: React.FC<TaskSchedulerProps> = ({
  task,
  subtask,
  onUpdateDueDate,
  onAddToCalendar,
  onEnableReminder,
  onEnableWhatsapp,
  contactPhone
}) => {
  // Use subtask date if a subtask is provided, otherwise use task date
  const [date, setDate] = useState<Date | undefined>(
    subtask?.dueDate ? new Date(subtask.dueDate) : 
    task?.dueDate ? new Date(task.dueDate) : 
    undefined
  );
  
  // Use subtask calendar status if a subtask is provided, otherwise use task status
  const [addToCalendar, setAddToCalendar] = useState<boolean>(
    subtask ? !!subtask.addedToCalendar : !!task.addedToCalendar
  );
  
  // Only used for tasks, not subtasks
  const [enableReminder, setEnableReminder] = useState<boolean>(
    !!task.reminderEnabled
  );
  
  const [reminderTime, setReminderTime] = useState<string>(
    task.reminderTime || '09:00'
  );
  
  // WhatsApp notification state
  const [enableWhatsapp, setEnableWhatsapp] = useState<boolean>(
    !!task.enableWhatsapp || !!contactPhone
  );
  
  const [whatsappNumber, setWhatsappNumber] = useState<string>(
    contactPhone || ''
  );
  
  const [whatsappSaved, setWhatsappSaved] = useState<boolean>(
    !!contactPhone
  );

  const handleCalendarChange = (date: Date | undefined) => {
    setDate(date);
    onUpdateDueDate(date ? date.toISOString() : undefined);
  };

  const handleAddToCalendarChange = (checked: boolean) => {
    setAddToCalendar(checked);
    onAddToCalendar(checked);
  };

  const handleEnableReminderChange = (checked: boolean) => {
    setEnableReminder(checked);
    if (onEnableReminder) {
      onEnableReminder(checked, checked ? reminderTime : undefined);
    }
  };

  const handleReminderTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReminderTime(e.target.value);
    if (enableReminder && onEnableReminder) {
      onEnableReminder(enableReminder, e.target.value);
    }
  };
  
  // WhatsApp notification handlers
  const handleEnableWhatsappChange = (checked: boolean) => {
    setEnableWhatsapp(checked);
    if (onEnableWhatsapp && checked === false) {
      // If turning off WhatsApp notifications, pass the disabled state
      onEnableWhatsapp(false);
    }
  };
  
  const handleWhatsappNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsappNumber(e.target.value);
    setWhatsappSaved(false); // Reset saved state when changing number
  };
  
  const handleSaveWhatsappNumber = () => {
    if (whatsappNumber && whatsappNumber.trim() !== '') {
      setWhatsappSaved(true);
      if (onEnableWhatsapp) {
        onEnableWhatsapp(true, whatsappNumber);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Show task/subtask details */}
      <div className="space-y-2">
        <h3 className="text-base font-medium break-words">
          {subtask ? 'Subtask' : 'Task'}: {subtask ? subtask.title : task.title}
        </h3>
        {(subtask?.context || task.context) && (
          <p className="text-sm text-gray-600 break-words">
            {subtask ? subtask.context : task.context}
          </p>
        )}
      </div>
      
      {/* Calendar for selecting due date */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="due-date" className="text-sm font-medium">
            Due Date
          </Label>
          {date && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={() => handleCalendarChange(undefined)}
              className="text-xs text-gray-600"
            >
              Clear
            </Button>
          )}
        </div>
        <div className="overflow-auto max-w-full pb-2">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarChange}
            className="border rounded-md p-3 min-w-[280px] mx-auto"
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>
        {date && (
          <p className="text-sm text-blue-600 mt-2">
            Selected date: {format(date, 'PPP')}
          </p>
        )}
      </div>
      
      {/* Add to calendar switch */}
      <div className="flex items-center justify-between space-x-2">
        <div className="space-y-0.5">
          <Label htmlFor="add-to-calendar" className="text-sm font-medium">
            Add to Calendar
          </Label>
          <p className="text-xs text-gray-500">
            Add this {subtask ? 'subtask' : 'task'} to your calendar application
          </p>
        </div>
        <Switch
          id="add-to-calendar"
          checked={addToCalendar}
          onCheckedChange={handleAddToCalendarChange}
          disabled={!date}
        />
      </div>
      
      {/* WhatsApp Notification section */}
      <div className="space-y-4 pt-2 border-t">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">
            Notification Preferences
          </Label>
          <p className="text-xs text-gray-500">
            Add your contact details to increase accountability
          </p>
        </div>
        
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="enable-whatsapp" className="text-sm font-medium">
              WhatsApp Notification
            </Label>
            <p className="text-xs text-gray-500">
              Get notified via WhatsApp
            </p>
          </div>
          <Switch
            id="enable-whatsapp"
            checked={enableWhatsapp}
            onCheckedChange={handleEnableWhatsappChange}
            disabled={!date}
          />
        </div>
        
        {enableWhatsapp && (
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number" className="text-sm font-medium">
              WhatsApp Number
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="whatsapp-number"
                type="tel"
                inputMode="tel"
                placeholder="+1 (555) 555-5555"
                value={whatsappNumber}
                onChange={handleWhatsappNumberChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <Button 
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveWhatsappNumber}
                className="whitespace-nowrap sm:w-auto w-full"
              >
                Save Number
              </Button>
            </div>
            {whatsappSaved && (
              <p className="text-xs text-green-600 flex items-center mt-1">
                <span className="mr-1">✓</span> 
                WhatsApp notifications enabled for this task
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Reminder settings (only for tasks, not subtasks) */}
      {!subtask && onEnableReminder && (
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="enable-reminder" className="text-sm font-medium">
                Enable Reminder
              </Label>
              <p className="text-xs text-gray-500">
                Get notified on the due date
              </p>
            </div>
            <Switch
              id="enable-reminder"
              checked={enableReminder}
              onCheckedChange={handleEnableReminderChange}
              disabled={!date}
            />
          </div>
          
          {enableReminder && (
            <div className="space-y-2">
              <Label htmlFor="reminder-time" className="text-sm font-medium">
                Reminder Time
              </Label>
              <div className="flex items-center">
                <input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={handleReminderTimeChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="ml-3 text-sm text-gray-500">
                  {reminderTime && new Date(`2000-01-01T${reminderTime}`).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You'll receive a notification at this time on the due date
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
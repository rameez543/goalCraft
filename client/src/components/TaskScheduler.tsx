import React, { useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Task, Subtask } from "../types";
import { format, parse } from "date-fns";

interface TaskSchedulerProps {
  task: Task;
  subtask?: Subtask;
  onUpdateDueDate: (dueDate: string | undefined) => void;
  onAddToCalendar: (add: boolean) => void;
  onEnableReminder?: (enabled: boolean, reminderTime?: string) => void;
}

export const TaskScheduler: React.FC<TaskSchedulerProps> = ({
  task,
  subtask,
  onUpdateDueDate,
  onAddToCalendar,
  onEnableReminder,
}) => {
  const item = subtask || task;
  
  // Parse the date string to a Date object if it exists
  const initialDate = item.dueDate 
    ? parse(item.dueDate, "yyyy-MM-dd", new Date()) 
    : undefined;
    
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [addedToCalendar, setAddedToCalendar] = useState(item.addedToCalendar || false);
  const [reminderEnabled, setReminderEnabled] = useState(task.reminderEnabled || false);
  
  // Handle date selection
  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      // Convert the date to ISO format (YYYY-MM-DD)
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      onUpdateDueDate(formattedDate);
    } else {
      onUpdateDueDate(undefined);
    }
  };
  
  // Handle adding to calendar
  const handleAddToCalendar = (checked: boolean) => {
    setAddedToCalendar(checked);
    onAddToCalendar(checked);
  };
  
  // Handle enabling reminders (for tasks only)
  const handleEnableReminder = (checked: boolean) => {
    setReminderEnabled(checked);
    if (onEnableReminder) {
      // Default reminder time is 1 day before due date
      const reminderTime = date 
        ? format(new Date(date.getTime() - 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm:ss") 
        : undefined;
      onEnableReminder(checked, reminderTime);
    }
  };
  
  // Generate Google Calendar link
  const generateGoogleCalendarLink = () => {
    if (!date) return null;
    
    const title = encodeURIComponent(item.title);
    const startDate = format(date, "yyyyMMdd");
    const endDate = format(date, "yyyyMMdd");
    
    let details = encodeURIComponent(item.context || "");
    if (task.estimatedMinutes) {
      details += encodeURIComponent(`\nEstimated time: ${task.estimatedMinutes} minutes`);
    }
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
  };
  
  const googleCalendarLink = generateGoogleCalendarLink();
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-medium">{subtask ? "Schedule Subtask" : "Schedule Task"}</h3>
      
      <div className="space-y-2">
        <Label htmlFor="due-date">Due Date</Label>
        <DatePicker 
          date={date} 
          onSelect={handleDateSelect} 
          label="Select due date" 
        />
      </div>
      
      {date && (
        <>
          <div className="flex items-center space-x-2">
            <Switch 
              id="add-to-calendar" 
              checked={addedToCalendar}
              onCheckedChange={handleAddToCalendar}
            />
            <Label htmlFor="add-to-calendar">Add to calendar</Label>
          </div>
          
          {addedToCalendar && googleCalendarLink && (
            <div className="mt-2">
              <a 
                href={googleCalendarLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center"
              >
                <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.5 3.75h-3V2.25h-1.5v1.5h-6V2.25h-1.5v1.5h-3c-.83 0-1.5.67-1.5 1.5v15c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5zm0 16.5h-15V9h15v11.25zm0-12.75h-15v-2.25h3v1.5h1.5v-1.5h6v1.5h1.5v-1.5h3v2.25z"/>
                </svg>
                Add to Google Calendar
              </a>
            </div>
          )}
          
          {!subtask && onEnableReminder && (
            <div className="flex items-center space-x-2 mt-4">
              <Switch 
                id="enable-reminder" 
                checked={reminderEnabled}
                onCheckedChange={handleEnableReminder}
              />
              <Label htmlFor="enable-reminder">Enable reminder notification</Label>
            </div>
          )}
        </>
      )}
    </div>
  );
};
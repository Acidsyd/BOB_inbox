'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  getUserTimezone, 
  setUserTimezone, 
  getBrowserTimezone,
  formatDateInTimezone,
  formatInboxMessageDate,
  formatConversationDate,
  getTimezoneInfo
} from '../lib/timezone';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  formatDate: (date: string | Date | undefined | null, formatString?: string) => string;
  formatMessageDate: (date: string | Date | undefined | null) => string;
  formatConversationDate: (date: string | Date | undefined | null) => string;
  timezoneInfo: any;
  refreshTimezone: () => void;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

interface TimezoneProviderProps {
  children: ReactNode;
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  const [timezone, setTimezoneState] = useState<string>('UTC'); // Always start with UTC for SSR
  const [isClient, setIsClient] = useState(false);

  // Initialize timezone on client side
  useEffect(() => {
    setIsClient(true);
    const detectedTimezone = getUserTimezone();
    setTimezoneState(detectedTimezone);

    // Debug log
    console.log('🌐 TimezoneProvider initialized:', {
      detectedTimezone,
      browserTimezone: getBrowserTimezone(),
      timezoneInfo: getTimezoneInfo()
    });

    // Force re-render after timezone is set
    setTimeout(() => {
      console.log('🌐 Timezone should now be set:', detectedTimezone);
    }, 100);
  }, []);

  const handleSetTimezone = (newTimezone: string) => {
    setUserTimezone(newTimezone);
    setTimezoneState(newTimezone);
    console.log('🌐 Timezone changed to:', newTimezone);
  };

  const refreshTimezone = () => {
    const currentTimezone = getUserTimezone();
    setTimezoneState(currentTimezone);
    console.log('🌐 Timezone refreshed:', currentTimezone);
  };

  const formatDate = (date: string | Date | undefined | null, formatString?: string) => {
    if (!isClient) return '';
    console.log('🌐 formatDate called:', { date, timezone, isClient });
    return formatDateInTimezone(date, formatString, timezone);
  };

  const formatMessageDate = (date: string | Date | undefined | null) => {
    if (!isClient) return '';
    console.log('🌐 formatMessageDate called:', { date, timezone, isClient });
    // Pass the current timezone to ensure timezone-aware formatting
    return formatDateInTimezone(date, 'MMM d, yyyy h:mm a', timezone);
  };

  const formatConversationDateFunc = (date: string | Date | undefined | null) => {
    if (!isClient) return '';

    // Replicate formatConversationDate logic but use the context timezone instead of getUserTimezone()
    if (!date) return '';

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      if (isNaN(dateObj.getTime())) {
        return '';
      }

      const now = new Date();

      // Get timezone-aware formatted dates for comparison using context timezone
      const { formatInTimeZone } = require('date-fns-tz');
      const todayStr = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
      const dateStr = formatInTimeZone(dateObj, timezone, 'yyyy-MM-dd');

      // Check if it's today
      if (dateStr === todayStr) {
        return formatInTimeZone(dateObj, timezone, 'h:mm a');
      }

      // Check if it's yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatInTimeZone(yesterday, timezone, 'yyyy-MM-dd');
      if (dateStr === yesterdayStr) {
        return 'Yesterday';
      }

      // Check if it's this year
      const currentYear = formatInTimeZone(now, timezone, 'yyyy');
      const dateYear = formatInTimeZone(dateObj, timezone, 'yyyy');
      if (dateYear === currentYear) {
        return formatInTimeZone(dateObj, timezone, 'MMM d');
      }

      // Different year
      return formatInTimeZone(dateObj, timezone, 'MMM d, yyyy');

    } catch (error) {
      console.error('Error formatting conversation date:', error);
      return '';
    }
  };

  const contextValue: TimezoneContextType = {
    timezone,
    setTimezone: handleSetTimezone,
    formatDate,
    formatMessageDate,
    formatConversationDate: formatConversationDateFunc,
    timezoneInfo: isClient ? getTimezoneInfo() : null,
    refreshTimezone
  };

  return (
    <TimezoneContext.Provider value={contextValue}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}

// Utility hook for quick date formatting without full context
export function useFormatDate() {
  const context = useContext(TimezoneContext);
  
  if (!context) {
    // Fallback when outside provider
    return (date: string | Date | undefined | null, formatString?: string) => {
      if (typeof window !== 'undefined') {
        return formatDateInTimezone(date, formatString);
      }
      return '';
    };
  }
  
  return context.formatDate;
}
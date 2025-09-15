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
    // Use the timezone-aware utility but ensure timezone is passed
    return formatConversationDate(date);
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
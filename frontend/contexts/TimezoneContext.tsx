'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import {
  getUserTimezone,
  setUserTimezone,
  getBrowserTimezone,
  formatDateInTimezone,
  formatInboxMessageDate,
  formatConversationDate as libFormatConversationDate,
  getTimezoneInfo,
  watchTimezoneChanges,
  detectUserTimezone,
  isValidTimezone,
  getTimezoneAbbreviation
} from '../lib/timezone';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  formatDate: (date: string | Date | undefined | null, formatString?: string) => string;
  formatMessageDate: (date: string | Date | undefined | null) => string;
  formatConversationDate: (date: string | Date | undefined | null) => string;
  timezoneInfo: any;
  refreshTimezone: () => void;
  timezoneAbbreviation: string;
  isTimezoneDetected: boolean;
  timezoneChangeCount: number;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

interface TimezoneProviderProps {
  children: ReactNode;
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  const [timezone, setTimezoneState] = useState<string>('UTC'); // Always start with UTC for SSR
  const [isClient, setIsClient] = useState(false);
  const [timezoneAbbreviation, setTimezoneAbbreviation] = useState<string>('UTC');
  const [isTimezoneDetected, setIsTimezoneDetected] = useState<boolean>(false);
  const [timezoneChangeCount, setTimezoneChangeCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize timezone on client side with enhanced detection
  useEffect(() => {
    setIsClient(true);

    try {
      // Use enhanced timezone detection with error handling
      const detection = detectUserTimezone();
      const detectedTimezone = detection.timezone;

      setTimezoneState(detectedTimezone);
      setTimezoneAbbreviation(detection.abbreviation);
      setIsTimezoneDetected(detection.isValid);

      console.log('🌐 TimezoneProvider initialized:', {
        timezone: detectedTimezone,
        abbreviation: detection.abbreviation,
        isValid: detection.isValid
      });
    } catch (error) {
      console.error('🌐 Error initializing timezone:', error);
      // Fallback to basic detection
      const fallbackTimezone = getBrowserTimezone();
      setTimezoneState(fallbackTimezone);
      setTimezoneAbbreviation(getTimezoneAbbreviation(fallbackTimezone));
      setIsTimezoneDetected(isValidTimezone(fallbackTimezone));
    } finally {
      // Always set loading to false
      setIsLoading(false);
    }

    // Set up timezone change monitoring with error handling
    const cleanup = watchTimezoneChanges((newTimezone) => {
      try {
        console.log('🌐 Timezone change detected:', newTimezone);
        setTimezoneState(newTimezone);
        setTimezoneAbbreviation(getTimezoneAbbreviation(newTimezone));
        setTimezoneChangeCount(prev => prev + 1);

        // Notify user of timezone change
        if (typeof window !== 'undefined' && window.location.pathname.includes('inbox')) {
          console.log('📧 Inbox timezone change - timestamps will update automatically');
        }
      } catch (error) {
        console.error('🌐 Error handling timezone change:', error);
      }
    });

    // Cleanup timezone watcher on unmount
    return cleanup;
  }, []);

  const handleSetTimezone = (newTimezone: string) => {
    if (!isValidTimezone(newTimezone)) {
      console.warn('🌐 Invalid timezone provided:', newTimezone);
      return;
    }

    setUserTimezone(newTimezone);
    setTimezoneState(newTimezone);
    setTimezoneAbbreviation(getTimezoneAbbreviation(newTimezone));
    setIsTimezoneDetected(true);
    console.log('🌐 Timezone manually changed to:', newTimezone);
  };

  const refreshTimezone = () => {
    const currentTimezone = getUserTimezone();
    setTimezoneState(currentTimezone);
    console.log('🌐 Timezone refreshed:', currentTimezone);
  };

  const formatDate = (date: string | Date | undefined | null, formatString?: string) => {
    if (!isClient) return '';

    // Debug logging for scheduled activity timestamps
    if (date && typeof date === 'string' && date.includes('2025-09-22')) {
      console.log('🕐 TimezoneContext formatDate:', {
        inputDate: date,
        timezone,
        formatString,
        isClient
      });
    }

    return formatDateInTimezone(date, formatString, timezone);
  };

  const formatMessageDate = (date: string | Date | undefined | null) => {
    if (!isClient) return '';
    // Pass the current timezone to ensure timezone-aware formatting
    return formatDateInTimezone(date, 'MMM d, yyyy h:mm a', timezone);
  };

  const formatConversationDateFunc = (date: string | Date | undefined | null) => {
    if (!isClient) return '';
    if (!date) return '';

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      if (isNaN(dateObj.getTime())) {
        return '';
      }

      const now = new Date();

      // Get timezone-aware formatted dates for comparison using context timezone
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

  // Safe timezone info getter
  const safeGetTimezoneInfo = () => {
    if (!isClient || isLoading) return null;
    try {
      return getTimezoneInfo();
    } catch (error) {
      console.error('🌐 Error getting timezone info:', error);
      return { timezone, browserTimezone: getBrowserTimezone(), error: true };
    }
  };

  const contextValue: TimezoneContextType = {
    timezone,
    setTimezone: handleSetTimezone,
    formatDate,
    formatMessageDate,
    formatConversationDate: formatConversationDateFunc,
    timezoneInfo: safeGetTimezoneInfo(),
    refreshTimezone,
    timezoneAbbreviation,
    isTimezoneDetected,
    timezoneChangeCount
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
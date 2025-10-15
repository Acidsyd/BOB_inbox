import { useEffect, useState } from 'react';
import { useTimezone } from './frontend/contexts/TimezoneContext';

export default function TimezoneDebugger() {
  const { timezone, formatMessageDate, timezoneInfo } = useTimezone();
  const [testTime] = useState(new Date('2025-09-15T14:21:00.000Z')); // UTC 14:21

  useEffect(() => {
    console.log('🌐 Timezone Debug Info:', {
      currentTimezone: timezone,
      timezoneInfo,
      browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      localStorage: localStorage.getItem('userTimezone'),
      testTimeUTC: testTime.toISOString(),
      testTimeFormatted: formatMessageDate(testTime),
      testTimeNative: testTime.toLocaleString('en-GB', {
        timeZone: 'Europe/Rome',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  }, [timezone, formatMessageDate, timezoneInfo, testTime]);

  return (
    <div className="p-4 border rounded bg-yellow-50">
      <h3 className="font-bold">Timezone Debug</h3>
      <div className="text-sm space-y-1">
        <div>Current timezone: {timezone}</div>
        <div>Browser timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
        <div>Test time UTC: {testTime.toISOString()}</div>
        <div>Test time formatted: {formatMessageDate(testTime)}</div>
        <div>Test time native (Europe/Rome): {testTime.toLocaleString('en-GB', {
          timeZone: 'Europe/Rome',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</div>
      </div>
    </div>
  );
}
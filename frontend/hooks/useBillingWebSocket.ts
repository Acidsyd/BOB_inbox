/**
 * Billing WebSocket Hook - Real-time Billing Updates
 * 
 * Provides real-time billing updates including:
 * - Usage monitoring and limits
 * - Subscription status changes
 * - Payment processing updates
 * - Credit/quota notifications
 * - Plan upgrades/downgrades
 */

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAuth } from '../lib/auth/context';

export interface UsageUpdate {
  organizationId: string;
  metric: 'emails_sent' | 'campaigns_created' | 'api_calls' | 'storage_used';
  current: number;
  limit: number;
  percentage: number;
  period: 'monthly' | 'daily' | 'hourly';
  timestamp: string;
}

export interface SubscriptionUpdate {
  organizationId: string;
  planId: string;
  planName: string;
  status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing';
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  amount: number;
  currency: string;
  timestamp: string;
}

export interface PaymentUpdate {
  organizationId: string;
  paymentId: string;
  status: 'processing' | 'succeeded' | 'failed' | 'canceled';
  amount: number;
  currency: string;
  method: string;
  timestamp: string;
  failureReason?: string;
}

export interface CreditUpdate {
  organizationId: string;
  creditType: 'email_credits' | 'api_credits' | 'bonus_credits';
  balance: number;
  used: number;
  added?: number;
  expired?: number;
  expiryDate?: string;
  timestamp: string;
}

export interface BillingAlert {
  organizationId: string;
  type: 'usage_warning' | 'usage_limit_reached' | 'payment_failed' | 'credit_low' | 'subscription_expired';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  actionUrl?: string;
  timestamp: string;
}

export const useBillingWebSocket = () => {
  const { user } = useAuth();
  const { isConnected, on, off, subscribeToBilling, unsubscribeFromBilling } = useWebSocket();

  // State for real-time billing data
  const [currentUsage, setCurrentUsage] = useState<UsageUpdate[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionUpdate | null>(null);
  const [recentPayments, setRecentPayments] = useState<PaymentUpdate[]>([]);
  const [creditBalance, setCreditBalance] = useState<CreditUpdate[]>([]);
  const [billingAlerts, setBillingAlerts] = useState<BillingAlert[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  /**
   * Handle usage updates
   */
  const handleUsageUpdate = useCallback((data: UsageUpdate) => {
    setCurrentUsage(prev => {
      const filtered = prev.filter(u => u.metric !== data.metric || u.period !== data.period);
      return [...filtered, data].sort((a, b) => a.metric.localeCompare(b.metric));
    });

    // Check for usage warnings
    if (data.percentage >= 80) {
      const alert: BillingAlert = {
        organizationId: data.organizationId,
        type: data.percentage >= 100 ? 'usage_limit_reached' : 'usage_warning',
        severity: data.percentage >= 100 ? 'critical' : 'warning',
        title: `${data.metric.replace('_', ' ').toUpperCase()} ${data.percentage >= 100 ? 'Limit Reached' : 'Usage Warning'}`,
        message: `You have used ${data.current}/${data.limit} ${data.metric} (${data.percentage.toFixed(1)}%) this ${data.period}`,
        actionRequired: data.percentage >= 100,
        actionUrl: '/settings/billing',
        timestamp: data.timestamp,
      };

      setBillingAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    }
  }, []);

  /**
   * Handle subscription updates
   */
  const handleSubscriptionUpdate = useCallback((data: SubscriptionUpdate) => {
    setSubscriptionStatus(data);

    // Generate alert for subscription status changes
    if (data.status === 'past_due' || data.status === 'canceled' || data.status === 'inactive') {
      const alert: BillingAlert = {
        organizationId: data.organizationId,
        type: 'subscription_expired',
        severity: 'critical',
        title: 'Subscription Issue',
        message: `Your subscription is ${data.status}. Please update your billing information.`,
        actionRequired: true,
        actionUrl: '/settings/billing',
        timestamp: data.timestamp,
      };

      setBillingAlerts(prev => [alert, ...prev.slice(0, 9)]);
    }
  }, []);

  /**
   * Handle payment updates
   */
  const handlePaymentUpdate = useCallback((data: PaymentUpdate) => {
    setRecentPayments(prev => [data, ...prev.slice(0, 4)]); // Keep last 5 payments

    // Generate alert for failed payments
    if (data.status === 'failed') {
      const alert: BillingAlert = {
        organizationId: data.organizationId,
        type: 'payment_failed',
        severity: 'error',
        title: 'Payment Failed',
        message: `Payment of ${data.amount} ${data.currency.toUpperCase()} failed. ${data.failureReason || 'Please check your payment method.'}`,
        actionRequired: true,
        actionUrl: '/settings/billing',
        timestamp: data.timestamp,
      };

      setBillingAlerts(prev => [alert, ...prev.slice(0, 9)]);
    }
  }, []);

  /**
   * Handle credit updates
   */
  const handleCreditUpdate = useCallback((data: CreditUpdate) => {
    setCreditBalance(prev => {
      const filtered = prev.filter(c => c.creditType !== data.creditType);
      return [...filtered, data];
    });

    // Generate alert for low credits
    if (data.balance <= 100 && data.creditType === 'email_credits') {
      const alert: BillingAlert = {
        organizationId: data.organizationId,
        type: 'credit_low',
        severity: 'warning',
        title: 'Low Credit Balance',
        message: `You have ${data.balance} email credits remaining. Consider purchasing more credits.`,
        actionRequired: false,
        actionUrl: '/settings/billing',
        timestamp: data.timestamp,
      };

      setBillingAlerts(prev => [alert, ...prev.slice(0, 9)]);
    }
  }, []);

  /**
   * Handle general billing notifications
   */
  const handleBillingNotification = useCallback((data: any) => {
    if (data.type === 'billing_alert') {
      setBillingAlerts(prev => [data, ...prev.slice(0, 9)]);
    }
  }, []);

  /**
   * Dismiss billing alert
   */
  const dismissAlert = useCallback((alertIndex: number) => {
    setBillingAlerts(prev => prev.filter((_, index) => index !== alertIndex));
  }, []);

  /**
   * Clear all alerts
   */
  const clearAllAlerts = useCallback(() => {
    setBillingAlerts([]);
  }, []);

  /**
   * Get usage percentage for a specific metric
   */
  const getUsagePercentage = useCallback((metric: string, period: string = 'monthly'): number => {
    const usage = currentUsage.find(u => u.metric === metric && u.period === period);
    return usage ? usage.percentage : 0;
  }, [currentUsage]);

  /**
   * Get current usage for a specific metric
   */
  const getCurrentUsage = useCallback((metric: string, period: string = 'monthly'): { current: number; limit: number } => {
    const usage = currentUsage.find(u => u.metric === metric && u.period === period);
    return usage ? { current: usage.current, limit: usage.limit } : { current: 0, limit: 0 };
  }, [currentUsage]);

  /**
   * Check if usage limit is reached for any metric
   */
  const hasUsageLimitReached = useCallback((): boolean => {
    return currentUsage.some(u => u.percentage >= 100);
  }, [currentUsage]);

  /**
   * Get total credit balance
   */
  const getTotalCredits = useCallback((creditType?: string): number => {
    if (creditType) {
      const credit = creditBalance.find(c => c.creditType === creditType);
      return credit ? credit.balance : 0;
    }
    return creditBalance.reduce((total, credit) => total + credit.balance, 0);
  }, [creditBalance]);

  // Setup event listeners when connected
  useEffect(() => {
    if (!isConnected || !user?.organizationId) return;

    const unsubscribeFunctions = [
      on('billing_update', (data) => {
        switch (data.event) {
          case 'usage_updated':
            handleUsageUpdate(data.data);
            break;
          case 'subscription_changed':
            handleSubscriptionUpdate(data.data);
            break;
          case 'payment_processed':
            handlePaymentUpdate(data.data);
            break;
          case 'credit_updated':
            handleCreditUpdate(data.data);
            break;
        }
      }),
      on('billing_notification', handleBillingNotification),
      on('billing_subscribed', () => setIsSubscribed(true)),
      on('billing_unsubscribed', () => setIsSubscribed(false)),
    ];

    // Subscribe to billing updates
    subscribeToBilling();

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
      unsubscribeFromBilling();
      setIsSubscribed(false);
    };
  }, [
    isConnected,
    user?.organizationId,
    on,
    subscribeToBilling,
    unsubscribeFromBilling,
    handleUsageUpdate,
    handleSubscriptionUpdate,
    handlePaymentUpdate,
    handleCreditUpdate,
    handleBillingNotification,
  ]);

  return {
    // Connection status
    isConnected: isConnected && isSubscribed,
    
    // Real-time billing data
    currentUsage,
    subscriptionStatus,
    recentPayments,
    creditBalance,
    billingAlerts,
    
    // Utility functions
    getUsagePercentage,
    getCurrentUsage,
    hasUsageLimitReached,
    getTotalCredits,
    dismissAlert,
    clearAllAlerts,
    
    // Raw data for advanced usage
    rawUsageData: currentUsage,
    rawSubscriptionData: subscriptionStatus,
    rawPaymentData: recentPayments,
    rawCreditData: creditBalance,
  };
};

export default useBillingWebSocket;
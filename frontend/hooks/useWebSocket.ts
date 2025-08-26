/**
 * Enhanced WebSocket Hook with Auto-Reconnection and Error Recovery
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/ping-pong mechanism for connection health
 * - Real-time billing and campaign updates
 * - Comprehensive error handling and recovery
 * - Connection metrics and performance monitoring
 * - TypeScript support with full type safety
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../lib/auth/context';

export interface WebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  heartbeatInterval?: number;
  enableCompression?: boolean;
}

export interface ConnectionMetrics {
  latency: number;
  connectionTime: number;
  reconnectionCount: number;
  totalEvents: number;
  isConnected: boolean;
  lastHeartbeat: Date | null;
}

export interface WebSocketError {
  type: 'connection' | 'authentication' | 'timeout' | 'server';
  message: string;
  timestamp: Date;
  retryable: boolean;
}

export interface BillingUpdate {
  organizationId: string;
  event: 'usage_updated' | 'subscription_changed' | 'payment_processed' | 'limit_reached';
  data: any;
  timestamp: string;
}

export interface CampaignProgress {
  campaignId: string;
  organizationId: string;
  progress: {
    current: number;
    total: number;
    percentage: number;
    stage: string;
  };
  status: string;
  metrics: any;
  timestamp: string;
}

export const useWebSocket = (options: WebSocketOptions = {}) => {
  const { user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  
  // Configuration
  const config = {
    url: options.url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000',
    autoConnect: options.autoConnect !== false,
    reconnectionAttempts: options.reconnectionAttempts || 5,
    reconnectionDelay: options.reconnectionDelay || 1000,
    heartbeatInterval: options.heartbeatInterval || 15000,
    enableCompression: options.enableCompression !== false,
  };

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<WebSocketError | null>(null);
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    latency: 0,
    connectionTime: 0,
    reconnectionCount: 0,
    totalEvents: 0,
    isConnected: false,
    lastHeartbeat: null,
  });

  // Event handlers storage
  const eventHandlers = useRef(new Map<string, Set<Function>>());
  const reconnectionAttempts = useRef(0);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTime = useRef<number>(0);

  /**
   * Calculate exponential backoff delay
   */
  const calculateBackoffDelay = useCallback((attempt: number): number => {
    const baseDelay = config.reconnectionDelay;
    const maxDelay = 30000; // 30 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 1000; // Add jitter
  }, [config.reconnectionDelay]);

  /**
   * Handle connection errors with retry logic
   */
  const handleConnectionError = useCallback((error: any, type: WebSocketError['type'] = 'connection') => {
    const wsError: WebSocketError = {
      type,
      message: error.message || error,
      timestamp: new Date(),
      retryable: type !== 'authentication',
    };

    setConnectionError(wsError);
    setIsConnected(false);

    if (wsError.retryable && reconnectionAttempts.current < config.reconnectionAttempts) {
      const delay = calculateBackoffDelay(reconnectionAttempts.current);
      
      setTimeout(() => {
        reconnectionAttempts.current++;
        setMetrics(prev => ({ ...prev, reconnectionCount: prev.reconnectionCount + 1 }));
        connect();
      }, delay);
    }
  }, [config.reconnectionAttempts, calculateBackoffDelay]);

  /**
   * Start heartbeat mechanism
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }

    heartbeatTimer.current = setInterval(() => {
      if (socketRef.current?.connected) {
        const pingStart = Date.now();
        
        socketRef.current.emit('ping', { timestamp: new Date().toISOString() }, () => {
          const latency = Date.now() - pingStart;
          setMetrics(prev => ({
            ...prev,
            latency,
            lastHeartbeat: new Date(),
          }));
        });
      }
    }, config.heartbeatInterval);
  }, [config.heartbeatInterval]);

  /**
   * Stop heartbeat mechanism
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (!token || !user) {
      setConnectionError({
        type: 'authentication',
        message: 'No authentication token available',
        timestamp: new Date(),
        retryable: false,
      });
      return;
    }

    if (socketRef.current?.connected) {
      return; // Already connected
    }

    connectionStartTime.current = Date.now();
    setConnectionError(null);

    try {
      const socket = io(config.url, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        compression: config.enableCompression,
        reconnection: false, // We handle reconnection manually
        timeout: 10000,
      });

      // Connection established
      socket.on('connect', () => {
        const connectionTime = Date.now() - connectionStartTime.current;
        setIsConnected(true);
        setConnectionError(null);
        reconnectionAttempts.current = 0;
        
        setMetrics(prev => ({
          ...prev,
          isConnected: true,
          connectionTime,
          totalEvents: prev.totalEvents + 1,
        }));

        startHeartbeat();
      });

      // Connection error
      socket.on('connect_error', (error) => {
        handleConnectionError(error, 'connection');
      });

      // Authentication error
      socket.on('disconnect', (reason) => {
        setIsConnected(false);
        stopHeartbeat();
        
        setMetrics(prev => ({ ...prev, isConnected: false }));

        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          // Server or client initiated disconnect - don't auto-reconnect
          return;
        }

        // Auto-reconnect for other reasons
        handleConnectionError(new Error(`Disconnected: ${reason}`), 'connection');
      });

      // Handle pong response
      socket.on('pong', (data) => {
        setMetrics(prev => ({
          ...prev,
          lastHeartbeat: new Date(),
        }));
      });

      // Handle server shutdown
      socket.on('server_shutdown', (data) => {
        setConnectionError({
          type: 'server',
          message: data.message || 'Server is shutting down',
          timestamp: new Date(),
          retryable: data.supportedReconnection !== false,
        });

        if (data.reconnectionDelay && data.supportedReconnection) {
          setTimeout(() => {
            connect();
          }, data.reconnectionDelay);
        }
      });

      // Forward all events to registered handlers
      socket.onAny((eventName, ...args) => {
        setMetrics(prev => ({ ...prev, totalEvents: prev.totalEvents + 1 }));
        
        const handlers = eventHandlers.current.get(eventName);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(...args);
            } catch (error) {
              console.error(`Error in WebSocket event handler for ${eventName}:`, error);
            }
          });
        }
      });

      socketRef.current = socket;

    } catch (error) {
      handleConnectionError(error, 'connection');
    }
  }, [token, user, config, handleConnectionError, startHeartbeat, stopHeartbeat]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    stopHeartbeat();
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setMetrics(prev => ({ ...prev, isConnected: false }));
  }, [stopHeartbeat]);

  /**
   * Add event listener
   */
  const on = useCallback((event: string, handler: Function) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set());
    }
    eventHandlers.current.get(event)!.add(handler);

    return () => {
      const handlers = eventHandlers.current.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlers.current.delete(event);
        }
      }
    };
  }, []);

  /**
   * Remove event listener
   */
  const off = useCallback((event: string, handler: Function) => {
    const handlers = eventHandlers.current.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlers.current.delete(event);
      }
    }
  }, []);

  /**
   * Emit event to server
   */
  const emit = useCallback((event: string, ...args: any[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, ...args);
      setMetrics(prev => ({ ...prev, totalEvents: prev.totalEvents + 1 }));
      return true;
    }
    return false;
  }, []);

  /**
   * Subscribe to billing updates
   */
  const subscribeToBilling = useCallback(() => {
    return emit('subscribe_billing', { organizationId: user?.organizationId });
  }, [emit, user?.organizationId]);

  /**
   * Unsubscribe from billing updates
   */
  const unsubscribeFromBilling = useCallback(() => {
    return emit('unsubscribe_billing', { organizationId: user?.organizationId });
  }, [emit, user?.organizationId]);

  /**
   * Subscribe to campaign updates
   */
  const subscribeToCampaign = useCallback((campaignId: string) => {
    return emit('subscribe_campaign', { campaignId });
  }, [emit]);

  /**
   * Unsubscribe from campaign updates
   */
  const unsubscribeFromCampaign = useCallback((campaignId: string) => {
    return emit('unsubscribe_campaign', { campaignId });
  }, [emit]);

  // Initialize connection when component mounts
  useEffect(() => {
    if (config.autoConnect && token && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [config.autoConnect, token, user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
      eventHandlers.current.clear();
    };
  }, [stopHeartbeat]);

  return {
    // Connection state
    isConnected,
    connectionError,
    metrics,
    
    // Connection control
    connect,
    disconnect,
    
    // Event handling
    on,
    off,
    emit,
    
    // Convenience methods
    subscribeToBilling,
    unsubscribeFromBilling,
    subscribeToCampaign,
    unsubscribeFromCampaign,
    
    // Socket instance (for advanced usage)
    socket: socketRef.current,
  };
};

export default useWebSocket;
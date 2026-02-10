/**
 * Core event types and interfaces for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

// Basic event structure
export interface BaseEvent<T = unknown> {
  id: string;
  channel: string;
  data: T;
  timestamp: number;
  type?: string;
}

// Buffered event for replay functionality
export interface BufferedEvent<T = unknown> extends BaseEvent<T> {
  bufferedAt: number;
  ttl?: number;
}

// Event callback function type
export type EventCallback<T = unknown> = (event: BaseEvent<T>) => void;

// Unsubscribe function type
export type UnsubscribeFunction = () => void;

// Emit options
export interface EmitOptions {
  priority?: 'high' | 'medium' | 'low';
  ttl?: number;
  immediate?: boolean;
}

// Middleware function type
export type Middleware<T = unknown> = (
  event: BaseEvent<T>,
  next: () => Promise<void> | void
) => Promise<void> | void;

// Performance metrics
export interface PerformanceMetrics {
  eventsPerSecond: number;
  bufferUtilization: number;
  memoryUsage: number;
  activeSubscriptions: number;
  middlewareLatency: number;
}

// Error types
export class BaseEventError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'BaseEventError';
  }
}

export class BufferOverflowError extends BaseEventError {
  constructor(maxSize: number, attemptedSize: number) {
    super(`Buffer overflow: attempted ${attemptedSize}, max ${maxSize}`, 'BUFFER_OVERFLOW');
  }
}

export class InvalidChannelError extends BaseEventError {
  constructor(channel: string) {
    super(`Invalid channel: ${channel}`, 'INVALID_CHANNEL');
  }
}

export class SecurityError extends BaseEventError {
  constructor(message: string) {
    super(`Security violation: ${message}`, 'SECURITY_ERROR');
  }
}
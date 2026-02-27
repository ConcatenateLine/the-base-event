/**
 * Event schemas for type validation
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { BaseEvent } from "./typing";

// User-related events
export interface UserEventPayload {
  userId: string;
  sessionId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type UserEventType =
  | { type: "user:login"; payload: UserEventPayload }
  | { type: "user:logout"; payload: UserEventPayload }
  | {
      type: "user:update";
      payload: UserEventPayload & { changes: Record<string, unknown> };
    }
  | {
      type: "user:session:expired";
      payload: { sessionId: string; reason: string };
    };

// System-related events
export interface SystemEventPayload {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  code?: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

export type SystemEventType =
  | { type: "system:ready"; payload: SystemEventPayload }
  | { type: "system:error"; payload: SystemEventPayload & { error: Error } }
  | { type: "system:warning"; payload: SystemEventPayload }
  | { type: "system:debug"; payload: SystemEventPayload };

// Performance monitoring events
export interface PerformanceEventPayload {
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export type PerformanceEventType =
  | { type: "performance:buffer"; payload: PerformanceEventPayload }
  | { type: "performance:emit"; payload: PerformanceEventPayload }
  | { type: "performance:memory"; payload: PerformanceEventPayload };

// Security events
export interface SecurityEventPayload {
  violation: string;
  channel?: string;
  source?: string;
  blocked?: boolean;
  details?: Record<string, unknown>;
}

export type SecurityEventType =
  | { type: "security:xss-attempt"; payload: SecurityEventPayload }
  | { type: "security:rate-limit"; payload: SecurityEventPayload }
  | { type: "security:invalid-channel"; payload: SecurityEventPayload };

// Union type for all events
export type TypedEvent =
  | UserEventType
  | SystemEventType
  | PerformanceEventType
  | SecurityEventType;

// Schema validation functions
export function validateUserEvent(
  event: BaseEvent<unknown>
): event is BaseEvent<UserEventPayload> {
  return (
    event.channel.startsWith("user:") &&
    typeof event.data === "object" &&
    event.data !== null
  );
}

export function validateSystemEvent(
  event: BaseEvent<unknown>
): event is BaseEvent<SystemEventPayload> {
  return (
    event.channel.startsWith("system:") &&
    typeof event.data === "object" &&
    event.data !== null
  );
}

export function validatePerformanceEvent(
  event: BaseEvent<unknown>
): event is BaseEvent<PerformanceEventPayload> {
  return (
    event.channel.startsWith("performance:") &&
    typeof event.data === "object" &&
    event.data !== null
  );
}

export function validateSecurityEvent(
  event: BaseEvent<unknown>
): event is BaseEvent<SecurityEventPayload> {
  return (
    event.channel.startsWith("security:") &&
    typeof event.data === "object" &&
    event.data !== null
  );
}

// Generic event validator
export function validateEvent<T>(
  event: BaseEvent<T>,
  validator: (event: BaseEvent<unknown>) => event is BaseEvent<T>
): boolean {
  try {
    return validator(event as BaseEvent<unknown>);
  } catch {
    return false;
  }
}

/**
 * Event system index file
 * @author The Base Event Team
 * @since 1.0.0
 */

export type {
  BaseEvent,
  BufferedEvent,
  EventCallback,
  UnsubscribeFunction,
  EmitOptions,
  Middleware,
  PerformanceMetrics,
  BaseEventError,
  BufferOverflowError,
  InvalidChannelError,
  SecurityError,
} from "./typing";

export type {
  UserEventType,
  SystemEventType,
  PerformanceEventType,
  SecurityEventType,
  TypedEvent,
} from "./schemas";

export {
  validateUserEvent,
  validateSystemEvent,
  validatePerformanceEvent,
  validateSecurityEvent,
  validateEvent,
} from "./schemas";

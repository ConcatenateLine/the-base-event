/**
 * Core module exports for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

export { EventEmitter, createEventEmitter } from './emitter';
export type { EventEmitterConfig } from './events/typing';

// Export all event types and interfaces
export type {
  BaseEvent,
  BufferedEvent,
  EventCallback,
  UnsubscribeFunction,
  EmitOptions,
  Middleware,
  PerformanceMetrics,
  BaseEventConfig,
  BufferConfig
} from './events';

// Export buffer system
export { createBufferManager } from './buffer';
export type { BufferManager } from './buffer';

// Export security (optional module will be added later)
// export { SecurityManager } from './security' when implemented
/**
 * Main entry point for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

// Core exports
export { EventEmitter, createEventEmitter } from "./core";

export type {
  BaseEvent,
  BufferedEvent,
  EventCallback,
  UnsubscribeFunction,
  EmitOptions,
  Middleware,
  PerformanceMetrics,
  BaseEventConfig,
  BufferConfig,
  EventEmitterConfig,
} from "./core";

/**
 * Core module exports for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

export { EventEmitter, createEventEmitter } from "./emitter";
export type { EventEmitterConfig } from "./emitter";

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
  BufferConfig,
} from "./events/typing";

// Export buffer system
export { createBufferManager } from "./buffer";
export type { BufferManager } from "./buffer";

// Export SSR/CSR module
export {
  isSSR,
  getEnvironment,
  setSSR,
  type Environment,
} from "./ssr/detection";

export {
  HydrationManager,
  DEFAULT_SSR_CONFIG,
  type SSRConfig,
  type SSRState,
} from "./ssr/hydration";

export {
  BufferSyncManager,
  type BufferSyncStrategy,
  type SyncMode,
} from "./ssr/buffer-sync";

export { ClientWaitManager } from "./ssr/client-wait";

// Export schema validation
export {
  validate,
  validateEventData,
  isValid,
  getGlobalRegistry,
  createSchemaRegistry,
  registerSchema,
  createSchemaValidator,
  SchemaValidationError,
} from "./events/schemas";

export type {
  Schema,
  SchemaDefinition,
  ValidationError,
  ValidationResult,
  ValidationRule,
  StringRule,
  NumberRule,
  BooleanRule,
  ObjectRule,
  ArrayRule,
  EnumRule,
  UnionRule,
  LiteralRule,
  SchemaRegistry,
} from "./events/schemas";

// Export validation middleware
export {
  createValidationMiddleware,
  createSchemaMiddleware,
  ValidationMiddleware,
  type MiddlewareValidationConfig,
  type SchemaMiddlewareConfig,
} from "./middleware/validation";

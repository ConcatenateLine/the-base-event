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
} from "./schemas";

export {
  validateUserEvent,
  validateSystemEvent,
  validatePerformanceEvent,
  validateSecurityEvent,
  validateEvent,
  validate,
  validateEventData,
  isValid,
  getGlobalRegistry,
  createSchemaRegistry,
  registerSchema,
  createSchemaValidator,
  SchemaValidationError,
} from "./schemas";

/**
 * Runtime Schema Validation System for The Base Event
 * Provides lightweight, type-safe schema validation for event payloads
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { BaseEvent, Middleware } from "./typing";

export interface ValidationRule {
  type:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "enum"
    | "union"
    | "literal";
  optional?: boolean;
  message?: string;
}

export interface StringRule extends ValidationRule {
  type: "string";
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: string[];
}

export interface NumberRule extends ValidationRule {
  type: "number";
  minimum?: number;
  maximum?: number;
  integer?: boolean;
  enum?: number[];
}

export interface BooleanRule extends ValidationRule {
  type: "boolean";
}

export interface ObjectRule extends ValidationRule {
  type: "object";
  properties: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ArrayRule extends ValidationRule {
  type: "array";
  items: Schema;
  minItems?: number;
  maxItems?: number;
}

export interface EnumRule<T extends string | number> extends ValidationRule {
  type: "enum";
  values: T[];
}

export interface UnionRule extends ValidationRule {
  type: "union";
  schemas: Schema[];
}

export interface LiteralRule<T> extends ValidationRule {
  type: "literal";
  value: T;
}

export type Schema =
  | StringRule
  | NumberRule
  | BooleanRule
  | ObjectRule
  | ArrayRule
  | EnumRule<string | number>
  | UnionRule
  | LiteralRule<unknown>;

export interface SchemaDefinition {
  channel: string;
  schema: Schema;
}

export interface ValidationError {
  path: string;
  message: string;
  value: unknown;
  rule: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface SchemaRegistry {
  register(schema: SchemaDefinition): void;
  get(channel: string): Schema | undefined;
  has(channel: string): boolean;
  remove(channel: string): boolean;
  clear(): void;
}

class InMemorySchemaRegistry implements SchemaRegistry {
  private schemas = new Map<string, Schema>();

  register(schema: SchemaDefinition): void {
    this.schemas.set(schema.channel, schema.schema);
  }

  get(channel: string): Schema | undefined {
    return this.schemas.get(channel);
  }

  has(channel: string): boolean {
    return this.schemas.has(channel);
  }

  remove(channel: string): boolean {
    return this.schemas.delete(channel);
  }

  clear(): void {
    this.schemas.clear();
  }
}

const globalRegistry = new InMemorySchemaRegistry();

export function getGlobalRegistry(): SchemaRegistry {
  return globalRegistry;
}

export function createSchemaRegistry(): SchemaRegistry {
  return new InMemorySchemaRegistry();
}

function getType(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function formatPath(path: string): string {
  return path || "root";
}

export function validate(
  value: unknown,
  schema: Schema,
  path = ""
): ValidationResult {
  const errors: ValidationError[] = [];

  const addError = (
    message: string,
    rule: ValidationRule,
    val: unknown = value
  ): void => {
    errors.push({
      path: formatPath(path),
      message,
      value: val,
      rule,
    });
  };

  const validateRequired = (val: unknown, sch: Schema): boolean => {
    if (val === undefined || val === null) {
      if (!sch.optional) {
        addError(`Value is required but got ${getType(val)}`, sch, val);
        return false;
      }
      return false;
    }
    return true;
  };

  switch (schema.type) {
    case "string": {
      if (!validateRequired(value, schema)) break;

      if (typeof value !== "string") {
        addError(`Expected string but got ${getType(value)}`, schema, value);
        break;
      }

      if (value !== undefined) {
        const strVal = value as string;

        if (
          schema.minLength !== undefined &&
          strVal.length < schema.minLength
        ) {
          addError(
            `String length must be at least ${schema.minLength}, got ${strVal.length}`,
            schema,
            value
          );
        }

        if (
          schema.maxLength !== undefined &&
          strVal.length > schema.maxLength
        ) {
          addError(
            `String length must be at most ${schema.maxLength}, got ${strVal.length}`,
            schema,
            value
          );
        }

        if (schema.pattern && !schema.pattern.test(strVal)) {
          addError(
            `String does not match pattern ${schema.pattern}`,
            schema,
            value
          );
        }

        if (schema.enum && !schema.enum.includes(strVal)) {
          addError(
            `String must be one of: ${schema.enum.join(", ")}, got "${strVal}"`,
            schema,
            value
          );
        }
      }
      break;
    }

    case "number": {
      if (!validateRequired(value, schema)) break;

      if (value !== undefined && typeof value !== "number") {
        addError(`Expected number but got ${getType(value)}`, schema, value);
        break;
      }

      if (value !== undefined) {
        const numVal = value as number;

        if (schema.minimum !== undefined && numVal < schema.minimum) {
          addError(
            `Number must be at least ${schema.minimum}, got ${numVal}`,
            schema,
            value
          );
        }

        if (schema.maximum !== undefined && numVal > schema.maximum) {
          addError(
            `Number must be at most ${schema.maximum}, got ${numVal}`,
            schema,
            value
          );
        }

        if (schema.integer && !Number.isInteger(numVal)) {
          addError(`Number must be an integer, got ${numVal}`, schema, value);
        }

        if (schema.enum && !schema.enum.includes(numVal)) {
          addError(
            `Number must be one of: ${schema.enum.join(", ")}, got ${numVal}`,
            schema,
            value
          );
        }
      }
      break;
    }

    case "boolean": {
      if (!validateRequired(value, schema)) break;

      if (value !== undefined && typeof value !== "boolean") {
        addError(`Expected boolean but got ${getType(value)}`, schema, value);
      }
      break;
    }

    case "object": {
      if (!validateRequired(value, schema)) break;

      if (value !== undefined) {
        if (
          typeof value !== "object" ||
          value === null ||
          Array.isArray(value)
        ) {
          addError(`Expected object but got ${getType(value)}`, schema, value);
          break;
        }

        const objVal = value as Record<string, unknown>;

        if (schema.required) {
          for (const requiredField of schema.required) {
            if (!(requiredField in objVal)) {
              addError(
                `Missing required field: ${requiredField}`,
                schema,
                value
              );
            }
          }
        }

        if (schema.properties) {
          for (const [key, fieldSchema] of Object.entries(schema.properties)) {
            if (key in objVal) {
              const fieldResult = validate(
                objVal[key],
                fieldSchema,
                `${path}.${key}`
              );
              errors.push(...fieldResult.errors);
            }
          }
        }

        if (schema.additionalProperties === false) {
          const knownProps = schema.properties
            ? Object.keys(schema.properties)
            : [];
          for (const key of Object.keys(objVal)) {
            if (!knownProps.includes(key)) {
              addError(
                `Unknown property "${key}" is not allowed`,
                schema,
                value
              );
            }
          }
        }
      }
      break;
    }

    case "array": {
      if (!validateRequired(value, schema)) break;

      if (value !== undefined) {
        if (!Array.isArray(value)) {
          addError(`Expected array but got ${getType(value)}`, schema, value);
          break;
        }

        const arrVal = value as unknown[];

        if (schema.minItems !== undefined && arrVal.length < schema.minItems) {
          addError(
            `Array must have at least ${schema.minItems} items, got ${arrVal.length}`,
            schema,
            value
          );
        }

        if (schema.maxItems !== undefined && arrVal.length > schema.maxItems) {
          addError(
            `Array must have at most ${schema.maxItems} items, got ${arrVal.length}`,
            schema,
            value
          );
        }

        for (let i = 0; i < arrVal.length; i++) {
          const itemResult = validate(arrVal[i], schema.items, `${path}[${i}]`);
          errors.push(...itemResult.errors);
        }
      }
      break;
    }

    case "enum": {
      if (!validateRequired(value, schema)) break;

      if (
        value !== undefined &&
        !schema.values.includes(value as string | number)
      ) {
        addError(
          `Value must be one of: ${schema.values.join(", ")}, got ${JSON.stringify(value)}`,
          schema,
          value
        );
      }
      break;
    }

    case "union": {
      if (!validateRequired(value, schema)) break;

      if (value !== undefined) {
        let matched = false;
        for (const sch of schema.schemas) {
          const result = validate(value, sch, path);
          if (result.valid) {
            matched = true;
            break;
          }
        }
        if (!matched && !schema.optional) {
          addError(
            "Value does not match any of the union schemas",
            schema,
            value
          );
        }
      }
      break;
    }

    case "literal": {
      if (!validateRequired(value, schema)) break;

      if (value !== undefined && value !== schema.value) {
        addError(
          `Value must be ${JSON.stringify(schema.value)}, got ${JSON.stringify(value)}`,
          schema,
          value
        );
      }
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateEventData<T>(
  data: T,
  schema: Schema,
  path = ""
): ValidationResult {
  return validate(data, schema, path);
}

export function isValid(data: unknown, schema: Schema): boolean {
  return validate(data, schema).valid;
}

export interface ValidationMiddlewareOptions {
  registry?: SchemaRegistry;
  throwOnError?: boolean;
}

export function createValidationMiddleware(
  options: ValidationMiddlewareOptions = {}
): Middleware {
  const { registry = globalRegistry, throwOnError = false } = options;

  return (
    event: BaseEvent<unknown>,
    next: () => Promise<void> | void
  ): void => {
    const schema = registry.get(event.channel);

    if (!schema) {
      next();
      return;
    }

    const result = validate(event.data, schema, event.channel);

    if (!result.valid) {
      const errorMessage = result.errors
        .map(e => `${e.path}: ${e.message}`)
        .join("; ");

      if (throwOnError) {
        throw new SchemaValidationError(event.channel, result.errors);
      }

      console.error(
        `Schema validation failed for channel "${event.channel}": ${errorMessage}`
      );
      return;
    }

    next();
  };
}

export class SchemaValidationError extends Error {
  constructor(
    public readonly channel: string,
    public readonly errors: ValidationError[]
  ) {
    const message = errors.map(e => `${e.path}: ${e.message}`).join("; ");
    super(`Schema validation failed for channel "${channel}": ${message}`);
    this.name = "SchemaValidationError";
  }
}

export function registerSchema(
  registry: SchemaRegistry,
  definition: SchemaDefinition
): void {
  registry.register(definition);
}

export function createSchemaValidator<T>(
  schema: Schema
): (data: T) => ValidationResult {
  return (data: T) => validateEventData(data, schema);
}

// === Existing Event Types and Type Predicates ===

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

export type TypedEvent =
  | UserEventType
  | SystemEventType
  | PerformanceEventType
  | SecurityEventType;

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

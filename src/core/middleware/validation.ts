/**
 * Middleware Validation Module
 * Provides validation middleware integration for EventEmitter
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { BaseEvent, Middleware } from "../events/typing";
import {
  validate,
  type Schema,
  type SchemaRegistry,
  type ValidationResult,
  type ValidationError,
  getGlobalRegistry,
  SchemaValidationError,
  createSchemaRegistry,
} from "../events/schemas";

export interface MiddlewareValidationConfig {
  registry?: SchemaRegistry;
  throwOnError?: boolean;
  logErrors?: boolean;
}

export interface SchemaMiddlewareConfig {
  channel: string;
  schema: Schema;
}

class ValidationMiddleware {
  private registry: SchemaRegistry;
  private throwOnError: boolean;
  private logErrors: boolean;

  constructor(config: MiddlewareValidationConfig = {}) {
    this.registry = config.registry ?? getGlobalRegistry();
    this.throwOnError = config.throwOnError ?? false;
    this.logErrors = config.logErrors ?? true;
  }

  middleware(): Middleware {
    return (
      event: BaseEvent<unknown>,
      next: () => Promise<void> | void
    ): void => {
      const schema = this.registry.get(event.channel);

      if (!schema) {
        next();
        return;
      }

      const result: ValidationResult = validate(
        event.data,
        schema,
        event.channel
      );

      if (!result.valid) {
        const errorMessage = this.formatErrors(result.errors);

        if (this.throwOnError) {
          throw new SchemaValidationError(event.channel, result.errors);
        }

        if (this.logErrors) {
          console.error(
            `[ValidationMiddleware] Schema validation failed for channel "${event.channel}": ${errorMessage}`
          );
        }
        return;
      }

      next();
    };
  }

  private formatErrors(errors: ValidationError[]): string {
    return errors.map(e => `${e.path}: ${e.message}`).join("; ");
  }

  register(config: SchemaMiddlewareConfig): void {
    this.registry.register(config);
  }

  setRegistry(registry: SchemaRegistry): void {
    this.registry = registry;
  }

  setThrowOnError(value: boolean): void {
    this.throwOnError = value;
  }

  setLogErrors(value: boolean): void {
    this.logErrors = value;
  }
}

export function createValidationMiddleware(
  config?: MiddlewareValidationConfig
): Middleware {
  const vm = new ValidationMiddleware(config);
  return vm.middleware();
}

export function createSchemaMiddleware(
  schemaOrConfig: Schema | SchemaMiddlewareConfig,
  config?: MiddlewareValidationConfig
): Middleware {
  const registry = config?.registry ?? createSchemaRegistry();

  if ("channel" in schemaOrConfig) {
    registry.register(schemaOrConfig);
  }

  return new ValidationMiddleware({
    ...config,
    registry,
  }).middleware();
}

export { ValidationMiddleware };

export type {
  Schema,
  SchemaDefinition,
  ValidationError,
  ValidationResult,
  SchemaRegistry,
} from "../events/schemas";

/**
 * Middleware Module Exports
 * @author The Base Event Team
 * @since 1.0.0
 */

export {
  createValidationMiddleware,
  createSchemaMiddleware,
  ValidationMiddleware,
  type MiddlewareValidationConfig,
  type SchemaMiddlewareConfig,
} from "./validation";

export {
  validate,
  validateEventData,
  isValid,
  getGlobalRegistry,
  createSchemaRegistry,
  registerSchema,
  createSchemaValidator,
  SchemaValidationError,
  type Schema,
  type SchemaDefinition,
  type ValidationError,
  type ValidationResult,
  type ValidationRule,
  type StringRule,
  type NumberRule,
  type BooleanRule,
  type ObjectRule,
  type ArrayRule,
  type EnumRule,
  type UnionRule,
  type LiteralRule,
  type SchemaRegistry,
} from "../events/schemas";

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
  OnceOptions,
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

export {
  compilePattern,
  matchPattern,
  matchWildcard,
  clearPatternCache,
  getPatternCacheSize,
  createPatternMatcher,
  expandPattern,
  isValidPattern,
  type PatternMatchResult,
  type CompiledPattern,
} from "./pattern-match";

export {
  registerMigration,
  migrateEvent,
  getMigrationPath,
  registerSchema as registerVersionSchema,
  getSchemaForVersion,
  getLatestVersion,
  getVersionHistory,
  createMigration,
  isVersionCompatible,
  getVersionDifference,
  shouldProcessEvent,
  clearVersionRegistry,
  createVersionedEvent,
  type Version,
  type VersionedEvent,
  type VersionMigration,
  type VersionSchema,
  type VersionSubscription,
  type VersionFilterOptions,
  type VersionedEventConfig,
} from "./versioning";

export {
  generateInterface,
  schemaTypeToTs,
  generateInterfaceFile,
  generateEnum,
  generateTypeAlias,
  generateUnionType,
  generateGenericInterface,
  addComment,
  generateEventInterface,
  type InterfaceOptions,
  type EnumDefinition,
  type TypeDef,
} from "./interface-generator";

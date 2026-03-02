# Schema Validation Architecture

---

## 🎯 **Overview**

The Schema Validation system provides **runtime validation** for event payloads, ensuring type safety and data integrity. It integrates seamlessly with the middleware system to validate events before they are emitted or processed.

---

## 🏗️ **System Architecture**

### **Core Components** (`src/core/events/schemas.ts`)

```typescript
interface SchemaDefinition {
  type:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "enum"
    | "union"
    | "literal";
  properties?: Record<string, SchemaDefinition>;
  items?: SchemaDefinition;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
  enumValues?: unknown[];
  const?: unknown;
}
```

### **Schema Registry** (`src/core/events/schemas.ts`)

```typescript
interface SchemaRegistry {
  register(config: { channel: string; schema: SchemaDefinition }): void;
  unregister(channel: string): void;
  get(channel: string): SchemaDefinition | undefined;
  has(channel: string): boolean;
  clear(): void;
}
```

### **Validation Middleware** (`src/core/middleware/validation.ts`)

```typescript
interface ValidationMiddlewareConfig {
  registry: SchemaRegistry;
  strictMode?: boolean;
  onError?: (error: ValidationError) => void;
}
```

---

## 🎨 **Supported Schema Types**

### **Primitive Types**

| Type      | Validation                            |
| --------- | ------------------------------------- |
| `string`  | minLength, maxLength, pattern (regex) |
| `number`  | minimum, maximum, multipleOf          |
| `boolean` | const (exact value)                   |

### **Complex Types**

| Type      | Validation                |
| --------- | ------------------------- |
| `object`  | properties, required      |
| `array`   | items, minItems, maxItems |
| `enum`    | enum values list          |
| `union`   | multiple possible types   |
| `literal` | exact value match         |

---

## 📝 **Usage Examples**

### **Basic Schema Registration**

```typescript
import {
  EventEmitter,
  createSchemaRegistry,
  createValidationMiddleware,
} from "the-base-event";

const registry = createSchemaRegistry();

registry.register({
  channel: "user:login",
  schema: {
    type: "object",
    properties: {
      userId: { type: "string" },
      timestamp: { type: "number" },
      email: { type: "string", pattern: "^[^@]+@[^@]+$" },
    },
    required: ["userId", "timestamp"],
  },
});
```

### **With Middleware Integration**

```typescript
const emitter = new EventEmitter();

emitter.use(
  createValidationMiddleware({
    registry,
    strictMode: false,
    onError: error => {
      console.error("Validation failed:", error.errors);
    },
  })
);

emitter.emit("user:login", { userId: "123", timestamp: Date.now() });
```

### **Validation Error Response**

```typescript
interface ValidationError {
  valid: false;
  errors: Array<{
    path: string;
    message: string;
    value: unknown;
    rule: string;
  }>;
}
```

---

## ⚙️ **Configuration Options**

### **Middleware Options**

```typescript
interface ValidationMiddlewareConfig {
  registry: SchemaRegistry;
  strictMode?: boolean; // Throw on validation failure (default: false)
  onError?: (error: ValidationError) => void;
}
```

### **Schema Definition Options**

| Option       | Type     | Description                 |
| ------------ | -------- | --------------------------- |
| `type`       | string   | JSON Schema type            |
| `properties` | object   | Object property definitions |
| `required`   | string[] | Required property names     |
| `minimum`    | number   | Minimum numeric value       |
| `maximum`    | number   | Maximum numeric value       |
| `minLength`  | number   | Minimum string length       |
| `maxLength`  | number   | Maximum string length       |
| `pattern`    | string   | Regex pattern for strings   |
| `enum`       | array    | Allowed values              |
| `const`      | any      | Exact value match           |

---

## 🔄 **Integration Points**

### **With EventEmitter**

```typescript
const emitter = new EventEmitter();

// Add validation middleware
emitter.use(
  createValidationMiddleware({
    registry: createSchemaRegistry(),
  })
);
```

### **With Buffer System**

```typescript
// Validated events can still be buffered
const emitter = new EventEmitter({
  buffer: { strategy: "lru", maxSize: 1000 },
});

emitter.use(createValidationMiddleware({ registry }));
```

---

## 🎯 **Benefits**

### **✅ Data Integrity**

- Runtime validation ensures payload consistency
- Early error detection before processing
- Detailed error reporting with paths

### **✅ Developer Experience**

- Type-safe schema definitions
- Intuitive error messages
- Optional strict mode

### **✅ Performance**

- Lightweight validation (~1KB)
- Optional feature (disabled by default)
- Zero overhead when not used

### **✅ Flexibility**

- Per-channel schema registration
- Custom error handlers
- Integration with existing middleware

---

_Schema validation: Type-safe event payloads with runtime validation_

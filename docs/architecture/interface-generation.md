# TypeScript Interface Generation

The Base Event provides utilities to generate TypeScript interface strings from schema definitions, enabling automatic type generation for event payloads.

## Overview

Convert JSON Schema-like definitions into TypeScript interfaces for type-safe event handling:

```typescript
import { generateInterface, Schema } from '@core/events/interface-generator';
import { ObjectRule, StringRule, NumberRule } from '@core/events/schemas';
```

## Basic Usage

### Generate Interface from Schema

```typescript
import { generateInterface, ObjectRule, StringRule, NumberRule } from '@core/events/interface-generator';

const userSchema: ObjectRule = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    age: { type: 'number' },
  },
  required: ['id', 'name'],
};

const interfaceStr = generateInterface(userSchema, {
  interfaceName: 'UserEvent',
  exportInterface: true,
});

console.log(interfaceStr);
// export interface UserEvent {
//   id: string;
//   name: string;
//   age?:: number;
// }
```

## API Reference

### `generateInterface(schema, options?)`

Generate a TypeScript interface from a schema.

```typescript
interface InterfaceOptions {
  /** Name of the generated interface */
  interfaceName?: string;
  
  /** Add 'export' keyword */
  exportInterface?: boolean;
  
  /** Optional namespace */
  namespace?: string;
}
```

### `generateInterfaceFile(schemas, options?)`

Generate multiple interfaces for an entire event schema registry.

```typescript
const interfaces = generateInterfaceFile([
  { channel: 'user:login', schema: userLoginSchema },
  { channel: 'user:logout', schema: userLogoutSchema },
], {
  namespace: 'EventSchemas',
});
```

### `generateEventInterface(channel, dataSchema, options?)`

Generate a complete event interface including standard event fields.

```typescript
const eventInterface = generateEventInterface('user:login', userSchema, {
  interfaceName: 'UserLoginEvent',
});
// export interface UserLoginEvent {
//   readonly id: string;
//   readonly channel: "user:login";
//   readonly data: {...};
//   readonly timestamp: number;
//   readonly version?: string;
//   readonly type?: string;
// }
```

### `generateEnum(name, values, options?)`

Generate TypeScript enum declarations.

```typescript
const enumStr = generateEnum('UserRole', ['admin', 'user', 'guest']);
// export enum UserRole {
//   ADMIN = "admin"
//   USER = "user"
//   GUEST = "guest"
// }

const numericEnum = generateEnum('StatusCode', [200, 404, 500]);
// export enum StatusCode {
//   STATUS_CODE_200 = 200
//   STATUS_CODE_404 = 404
//   STATUS_CODE_500 = 500
// }
```

### `generateTypeAlias(name, type, options?)`

Generate type alias declarations.

```typescript
const typeAlias = generateTypeAlias('UserId', 'string');
// export type UserId = string;
```

### `generateUnionType(types, name?)`

Generate union types.

```typescript
const union = generateUnionType(['string', 'number']);
// string | number

const namedUnion = generateUnionType(['admin', 'user', 'guest'], 'UserRole');
// export type UserRole = 'admin' | 'user' | 'guest';
```

### `schemaTypeToTs(schema, path?)`

Convert a schema directly to its TypeScript type representation.

```typescript
import { ObjectRule, StringRule } from '@core/events/schemas';

const schema: ObjectRule = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string' },
  },
};

const typeStr = schemaTypeToTs(schema, 'data');
// { name: string; email: string; }
```

### `generateGenericInterface(name, typeParameter, constraint?, options?)`

Generate generic interface declarations.

```typescript
const generic = generateGenericInterface('EventHandler', 'T', 'BaseEvent');
// export interface EventHandler<T extends BaseEvent> {}
```

### `addComment(text, comment, position?)`

Add JSDoc comments to generated code.

```typescript
const commented = addComment('type UserId = string;', 'Unique user identifier');
// /** Unique user identifier */
// type UserId = string;
```

## Schema Type Mapping

| Schema Type | TypeScript Type |
|-------------|----------------|
| `{ type: 'string' }` | `string` |
| `{ type: 'number' }` | `number` |
| `{ type: 'boolean' }` | `boolean` |
| `{ type: 'array', items: ... }` | `T[]` |
| `{ type: 'object', properties: ... }` | `{ prop: T; }` |
| `{ type: 'enum', values: [...] }` | `'a' \| 'b' \| 'c'` |
| `{ type: 'union', schemas: [...] }` | `T1 \| T2 \| ...` |
| `{ type: 'literal', value: 'x' }` | `'x'` |

## Complete Example

```typescript
import { 
  generateInterfaceFile, 
  generateEventInterface,
  ObjectRule,
  StringRule,
  NumberRule,
  BooleanRule,
  ArrayRule,
  EnumRule,
} from '@core/events/interface-generator';

const schemas = [
  {
    channel: 'user:login',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        email: { type: 'string' },
        rememberMe: { type: 'boolean' },
      },
      required: ['userId'],
    } as ObjectRule,
  },
  {
    channel: 'user:profile:update',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        tags: { 
          type: 'array', 
          items: { type: 'string' } 
        } as ArrayRule,
        role: {
          type: 'enum',
          values: ['admin', 'user', 'guest'],
        } as EnumRule,
      },
    } as ObjectRule,
  },
];

const output = generateInterfaceFile(schemas, {
  namespace: 'Events',
  exportInterface: true,
});

console.log(output);
```

Output:
```typescript
// Auto-generated TypeScript interfaces
// Generated by The Base Event

export interface Events.UserLogin {
  userId: string;
  email?:: string;
  rememberMe?:: boolean;
}

export interface Events.UserProfileUpdate {
  userId: string;
  tags?:: string[];
  role?:: "admin" | "user" | "guest";
}
```

## Integration with Schema Validation

Use the generated interfaces with the schema validation system:

```typescript
import { generateInterface, createSchemaValidator } from '@core/events/interface-generator';
import { validate } from '@core/events/schemas';

const interfaceStr = generateInterface(userSchema, { interfaceName: 'User' });
const validator = createSchemaValidator(userSchema);

const result = validate({ userId: '123' }, userSchema);
if (!result.valid) {
  console.error('Validation failed:', result.errors);
}
```

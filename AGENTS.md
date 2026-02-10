# AGENTS.md
## Guidelines for Agentic Coding Assistants

---

## 🎯 **Project Overview for Agents**

**The Base Event** is a framework-agnostic notification bus with intelligent event replay, memory management, and SSR/CSR compatibility. Target: 1.5KB bundle with 100K+ events/sec performance.

### **Key Architectural Principles**
1. **Core First**: All logic in framework-agnostic core, adapters are thin wrappers
2. **Simple by Default**: Optional features disabled, zero performance impact
3. **TypeScript Everywhere**: Strong typing with generics, interfaces, and schemas
4. **Memory Safe**: Built-in TTL, size limits, and auto-cleanup
5. **SSR Ready**: Cross-environment safety for modern frameworks

---

## 🛠️ **Build, Test, and Development Commands**

### **Core Commands**
```bash
# Development (watch mode)
npm run dev              # TypeScript compiler with --watch

# Build all targets
npm run build            # Rollup creates CJS, ESM, UMD, .d.ts

# Single test execution
npm test                 # Run Jest once
npm test path/to/test  # Run specific test file
npm test -- --testNamePattern="buffer"  # Run tests matching pattern

# Watch mode testing
npm run test:watch     # Jest watch mode

# Coverage reporting
npm run test:coverage   # Jest with coverage report

# Type checking (no emit)
npm run typecheck       # Validate TypeScript without building

# Code quality
npm run lint            # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run format          # Prettier formatting

# Pre-publish checks
npm run prepublishOnly   # Build + test before npm publish

# Release automation
npm run release         # Semantic release with conventional commits
```

### **Development Workflow**
```bash
# New feature development
npm run dev              # Start TypeScript watch
npm run test:watch         # Start Jest watch in separate terminal
npm run format -- --write # Auto-format on save

# Before committing
npm run typecheck        # Validate types
npm run lint             # Check code style
npm test                 # Full test suite
npm run test:coverage     # Verify coverage ≥95%
```

---

## 🎨 **Code Style Guidelines**

### **Import Organization**
```typescript
// Order: 1. Node.js built-ins, 2. External libraries, 3. Internal modules
import { EventEmitter } from 'events';           // Node.js built-ins
import mitt from 'mitt';                             // External libraries
import { BufferManager } from './core/buffer';       // Internal modules (relative)

// Named imports preferred over namespace imports
import { EventEmitter, BaseEventConfig } from './core';
// NOT: import * as Core from './core';

// Type-only imports use 'type' keyword
import type { EventCallback, Middleware } from './types';
```

### **File Structure (Each .ts file)**
```typescript
// 1. File header comment (purpose, author, date)
/**
 * Ring buffer implementation for event storage with LRU eviction
 * @author The Base Event Team
 * @since 1.0.0
 */

// 2. Imports (ordered as above)
import type { BufferedEvent, EvictionStrategy } from '../types';

// 3. Constants
const DEFAULT_BUFFER_SIZE = 1000;
const DEFAULT_TTL = 30000; // 30 seconds

// 4. Interface definitions (if any)
export interface LRUConfig {
  maxSize: number;
  ttl: number;
}

// 5. Main class/function implementation
export class LRUBuffer {
  // Private properties first
  private buffer: Map<string, BufferedEvent[]>;
  private maxSize: number;
  private ttl: number;

  // Constructor
  constructor(config: LRUConfig) {
    this.maxSize = config.maxSize;
    this.ttl = config.ttl;
    this.buffer = new Map();
  }

  // Public methods (get, set, has, etc.)
  public add(event: BufferedEvent): void { /* implementation */ }
  public get(channel: string): BufferedEvent[] { /* implementation */ }
  
  // Private helper methods
  private evictExpired(): void { /* implementation */ }
  private isExpired(event: BufferedEvent): boolean { /* implementation */ }
}

// 6. Exports
export { LRUBuffer, type LRUConfig };
```

### **Naming Conventions**
```typescript
// Files: kebab-case
ring-buffer.ts, event-emitter.ts, middleware-chain.ts

// Classes: PascalCase
class EventEmitter {}
class LRUBuffer {}
class SecurityManager {}

// Interfaces/Types: PascalCase, descriptive names
interface BufferedEvent {}
type EventCallback<T> = (event: T) => void;
interface BaseEventConfig {}

// Variables/Properties: camelCase
const maxBufferSize = 1000;
private eventBuffer: Map<string, any[]>;
public getMetrics(): PerformanceMetrics {}

// Constants: UPPER_SNAKE_CASE
const DEFAULT_MAX_SIZE = 1000;
const EVENT_EMITTER_VERSION = '1.0.0';

// Functions: camelCase, descriptive verbs
function createEventEmitter(config?: BaseEventConfig): EventEmitter {}
function isEventExpired(event: BufferedEvent): boolean {}
function sanitizePayload(payload: unknown): unknown {}

// Methods: camelCase
public emit<T>(channel: string, data: T): void {}
private async processMiddleware(): Promise<void> {}
```

### **TypeScript Guidelines**
```typescript
// Always use generics for type safety
interface EventEmitter {
  emit<T>(channel: string, data: T, options?: EmitOptions): void;
  on<T>(channel: string, callback: EventCallback<T>): UnsubscribeFunction;
}

// Prefer interfaces over types for extensibility
interface EventConfig {
  buffer?: BufferConfig;
  security?: SecurityConfig;
}

// Use discriminated unions for type-safe event handling
type UserEvent = { type: 'user:login'; payload: { userId: string } } |
               { type: 'user:logout'; payload: { userId: string } };

// Return types explicitly
function createEmitter(): EventEmitter { /* return type specified */ }

// Use 'unknown' instead of 'any' for untyped data
function processPayload(payload: unknown): processedPayload {
  if (typeof payload === 'string') {
    return payload.toUpperCase();
  }
  return payload;
}

// Prefer 'const assertions' over type casts
const config = getEventConfig() as EventConfig; // Good
const config = getEventConfig() satisfies EventConfig; // Better (TypeScript 4.9+)
```

### **Error Handling Patterns**
```typescript
// Create specific error classes
export class BufferOverflowError extends Error {
  constructor(maxSize: number, attemptedSize: number) {
    super(`Buffer overflow: attempted ${attemptedSize}, max ${maxSize}`);
    this.name = 'BufferOverflowError';
  }
}

// Use Result/Either patterns for operations that can fail
type Result<T, E> = { success: true; data: T } | { success: false; error: E };

function addToBuffer(event: BufferedEvent): Result<void, BufferOverflowError> {
  if (buffer.size >= maxSize) {
    return { success: false, error: new BufferOverflowError(maxSize, buffer.size + 1) };
  }
  buffer.add(event);
  return { success: true, data: undefined };
}

// Always handle async errors with try/catch
async function emitWithRetry<T>(event: T): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await emit(event);
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

---

## 🔒 **Security Guidelines**

### **Input Validation**
```typescript
// Always validate external inputs
function sanitizeChannel(channel: string): string {
  if (typeof channel !== 'string') {
    throw new TypeError('Channel must be string');
  }
  return channel.replace(/[^a-zA-Z0-9:*_.-]/g, '');
}

// Validate configuration objects
function validateConfig(config: unknown): BaseEventConfig {
  if (!config || typeof config !== 'object') {
    return getDefaultConfig();
  }
  
  const validated = { ...getDefaultConfig(), ...config as BaseEventConfig };
  
  if (validated.buffer?.maxSize && (validated.buffer.maxSize < 1 || validated.buffer.maxSize > 10000)) {
    throw new RangeError('Buffer max size must be between 1 and 10000');
  }
  
  return validated;
}
```

### **XSS Prevention**
```typescript
// Sanitize string payloads for XSS
function sanitizeStringPayload(payload: string): string {
  return payload
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Validate JSON structure
function parseSafeJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid JSON payload: ${error.message}`);
  }
}
```

---

## 🧪 **Testing Guidelines**

### **Test Structure**
```typescript
// Use describe blocks for logical grouping
describe('LRUBuffer', () => {
  let buffer: LRUBuffer;

  // Setup/teardown
  beforeEach(() => {
    buffer = new LRUBuffer({ maxSize: 10, ttl: 30000 });
  });

  afterEach(() => {
    buffer.clear();
  });

  // Test specific functionality
  describe('add method', () => {
    it('should add events to buffer', () => {
      const event = { channel: 'test', data: 'payload', timestamp: Date.now() };
      buffer.add(event);
      
      expect(buffer.size).toBe(1);
      expect(buffer.get('test')).toContainEqual(event);
    });

    it('should evict oldest events when buffer is full', () => {
      // Fill buffer
      for (let i = 0; i < 10; i++) {
        buffer.add({ channel: 'test', data: `item${i}`, timestamp: Date.now() });
      }
      
      // Add one more (should evict oldest)
      buffer.add({ channel: 'test', data: 'newest', timestamp: Date.now() });
      
      const events = buffer.get('test');
      expect(events).toHaveLength(10);
      expect(events[0].data).not.toBe('item0'); // Should be evicted
      expect(events[9].data).toBe('newest'); // Should be newest
    });
  });
});
```

### **Async Testing Patterns**
```typescript
// Use async/await for async operations
it('should handle async middleware processing', async () => {
  const middleware = jest.fn().mockImplementation(async (event, next) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    await next();
  });
  
  emitter.use(middleware);
  emitter.emit('test', 'payload');
  
  // Wait for async operations
  await new Promise(resolve => setTimeout(resolve, 50));
  
  expect(middleware).toHaveBeenCalled();
});

// Test error scenarios
it('should handle middleware errors gracefully', async () => {
  const errorMiddleware = jest.fn().mockImplementation(async (event, next) => {
    throw new Error('Middleware error');
  });
  
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  
  emitter.use(errorMiddleware);
  emitter.emit('test', 'payload');
  
  await new Promise(resolve => setTimeout(resolve, 20));
  
  expect(consoleSpy).toHaveBeenCalledWith('Error in middleware chain:', expect.any(Error));
});
```

---

## 📦 **Package Management Guidelines**

### **Dependencies**
```json
// Use exact versions for stability
{
  "dependencies": {
    "some-lib": "1.2.3"           // NOT ^1.2.3
  }
}

// Prefer peerDependencies for framework integration
{
  "peerDependencies": {
    "react": ">=16.8.0",          // Optional framework
    "angular": ">=12.0.0",         // Optional framework
    "vue": ">=3.0.0"              // Optional framework
  }
}
```

### **Bundle Optimization**
```typescript
// Use tree-shakable exports
export { EventEmitter, createEventEmitter } from './core';
// NOT: export * from './core';

// Conditional exports for optional features
export { SecurityManager } from './security'; // Tree-shakable if unused

// Use sideEffects: false for pure library
// package.json: "sideEffects": false
```

---

## 🔧 **Specific Agent Instructions**

### **When Working on Core Engine**
1. **Always maintain framework agnosticism** - no framework-specific code in core
2. **Memory management is critical** - every addition must consider buffer growth
3. **TypeScript generics everywhere** - ensure type safety for event data
4. **Performance first** - core must handle 100K+ events/sec
5. **SSR/CSR safety** - always consider both environments

### **When Working on Adapters**
1. **Keep adapters minimal** - thin wrappers around core functionality
2. **Framework patterns only** - follow each framework's conventions
3. **No core logic in adapters** - all logic stays in core
4. **Example-driven development** - provide usage examples for each adapter

### **When Adding New Features**
1. **Optional by default** - new features should not impact performance
2. **Backward compatibility** - never break existing API
3. **Configuration-based** - features enabled via config object
4. **Comprehensive tests** - new features require 100% test coverage
5. **Documentation updates** - API changes must be documented

### **Performance Requirements**
- **Core operations must be O(1) or O(log n)** where possible
- **Memory allocation must be minimal** - reuse objects, avoid unnecessary allocations
- **Async operations must be non-blocking** - never block event loop
- **Bundle size impact must be measured** - every addition evaluated for size

### **Security Requirements**
- **All external inputs validated** - no trusted data assumptions
- **XSS prevention for string payloads** - sanitize when emitting to DOM contexts
- **Rate limiting available** - prevent event flooding attacks
- **Error messages sanitization** - no sensitive data in error output

---

## 📋 **Quality Checklist Before Commits**

- [ ] TypeScript compiles without errors
- [ ] All tests pass (`npm test`)
- [ ] Coverage ≥95% (`npm run test:coverage`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] Bundle size impact measured (`npm run build && du -h dist/`)
- [ ] Memory usage profile checked for new features
- [ ] SSR/CSR compatibility verified
- [ ] Documentation updated for API changes
- [ ] Breaking changes documented in CHANGELOG

---

## 🎯 **Project Success Metrics**

### **Targets for All Agents**
- **Bundle Size**: Keep ≤1.5KB (minified + gzipped)
- **Performance**: Maintain ≥100K events/sec benchmark
- **TypeScript**: 100% type coverage, no 'any' types
- **Testing**: ≥95% coverage, all async patterns tested
- **Memory**: No leaks in load tests, controlled growth
- **SSR/CSR**: 100% compatibility across Next.js, Nuxt, Angular Universal

### **Red Flags to Watch**
- ⚠️ Bundle size growing beyond 1.5KB
- ⚠️ Performance dropping below 100K events/sec
- ⚠️ TypeScript 'any' types in core code
- ⚠️ Memory usage growing unbounded in tests
- ⚠️ Framework-specific logic in core modules
- ⚠️ Missing SSR/CSR handling in new features

---

*Guidelines created: February 2025*
*For agentic assistants working on The Base Event project*
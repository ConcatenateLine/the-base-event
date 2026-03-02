# AGENTS.md - The Base Event

## Build, Test, and Development Commands

```bash
# Development
npm run dev              # TypeScript watch mode

# Build
npm run build            # Rollup: CJS, ESM, UMD, .d.ts

# Testing
npm test                 # Run all tests
npm test path/to/test   # Run specific test file
npm test -- --testNamePattern="buffer"  # Run tests matching pattern
npm run test:watch      # Jest watch mode
npm run test:coverage   # Coverage report

# Code quality
npm run typecheck       # TypeScript validation (no emit)
npm run lint            # ESLint check
npm run lint:fix        # ESLint auto-fix
npm run format          # Prettier formatting
```

## Code Style Guidelines

### Imports (ordered)

1. Node.js built-ins → 2. External libraries → 3. Internal modules

```typescript
import { EventEmitter } from "events";
import mitt from "mitt";
import { BufferManager } from "./core/buffer";
import type { EventCallback } from "./types";
```

### Naming Conventions

- Files: `kebab-case` (ring-buffer.ts)
- Classes: `PascalCase` (EventEmitter, LRUBuffer)
- Interfaces/Types: `PascalCase` (BufferedEvent, EventCallback<T>)
- Variables/Properties: `camelCase` (maxBufferSize, eventBuffer)
- Constants: `UPPER_SNAKE_CASE` (DEFAULT_MAX_SIZE)
- Functions: `camelCase` (createEventEmitter, sanitizePayload)

### TypeScript Guidelines

- Use generics everywhere for type safety
- Prefer interfaces over types for extensibility
- Explicit return types required
- Use `unknown` instead of `any`
- Use `satisfies` over `as` when possible

### File Structure

```typescript
// 1. File header comment
/** Description @author The Base Event Team @since 1.0.0 */

// 2. Imports
import type { ... } from '../types';

// 3. Constants
const DEFAULT_BUFFER_SIZE = 1000;

// 4. Interfaces
export interface Config { maxSize: number; }

// 5. Implementation
export class Buffer {
  private buffer: Map<string, any>;
  public add(event: BufferedEvent): void { }
  private evictExpired(): void { }
}

// 6. Exports
export { Buffer, type Config };
```

### Error Handling

- Create specific error classes extending Error
- Use Result patterns: `type Result<T, E> = { success: true; data: T } | { success: false; error: E }`
- Always use try/catch for async operations

### Security

- Validate all external inputs
- Sanitize string payloads for XSS prevention
- Never expose secrets in error messages

## Path Aliases

Configured in tsconfig.json:

```json
{
  "@/*": ["src/*"],
  "@core/*": ["src/core/*"],
  "@security/*": ["src/security/*"],
  "@adapters/*": ["src/adapters/*"]
}
```

## Project Targets

- Bundle: ≤1.5KB (minified + gzipped)
- Performance: ≥100K events/sec
- Coverage: ≥95%
- TypeScript: 100% type coverage, no `any`

## Quality Checklist Before Commits

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run format` applied
- [ ] Coverage ≥95%

## Key Principles

1. Core first - framework-agnostic logic in core, adapters are thin wrappers
2. Memory safe - built-in TTL, size limits, auto-cleanup
3. SSR/CSR compatible - cross-environment safety
4. Optional by default - features disabled, zero performance impact
5. Backward compatible - never break existing API

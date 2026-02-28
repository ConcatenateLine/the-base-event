# The Base Event
## Complete Project Specification & Implementation Guide

---

## 🎯 **Project Overview**

**The Base Event** is a framework-agnostic notification bus that solves critical problems in JavaScript event systems: lost events, memory leaks, and framework lock-in. It provides intelligent event replay, built-in memory management, and optional security features - all in a lightweight 1.5KB package.

### **Core Philosophy**
- **Framework Agnostic**: Single core engine, optional thin adapters
- **No Lost Events**: Intelligent buffer replay ensures all events reach subscribers
- **Memory Safe**: Built-in TTL and size limits prevent unbounded growth
- **Simple by Default**: Optional features disabled, zero performance impact
- **TypeScript First**: Strong typing with event schemas and validation
- **SSR/CSR Compatible**: Built-in hydration safety for server-side rendering

---

## 🏗️ **Complete Project Architecture**

### **Package Structure**
```
the-base-event/
├── src/
│   ├── core/
│   │   ├── emitter.ts              # Main event emitter
│   │   ├── buffer/
│   │   │   ├── index.ts           # Buffer management
│   │   │   ├── strategies/         # LRU, FIFO, priority
│   │   │   │   ├── lru.ts
│   │   │   │   ├── fifo.ts
│   │   │   │   └── priority.ts
│   │   │   ├── memory/            # TTL, limits, cleanup
│   │   │   │   ├── ttl.ts
│   │   │   │   ├── limits.ts
│   │   │   │   └── cleanup.ts
│   │   │   └── synchronization/   # Cross-tab sync
│   │   │       └── cross-tab.ts
│   │   ├── ssr/                    # SSR/CSR handling
│   │   │   ├── detection.ts        # Environment detection
│   │   │   ├── hydration.ts         # Client hydration sync
│   │   │   ├── buffer-sync.ts      # Cross-environment sync
│   │   │   └── client-wait.ts      # Client mount waiting
│   │   ├── middleware/
│   │   │   ├── index.ts           # Middleware chain
│   │   │   ├── async-chain.ts     # Sequential processing
│   │   │   └── validation.ts      # Event validation
│   │   ├── events/
│   │   │   ├── index.ts           # Event types
│   │   │   ├── typing.ts          # TypeScript interfaces
│   │   │   ├── schemas.ts         # Event schemas
│   │   │   └── versioning.ts       # Backward compatibility
│   │   ├── performance/
│   │   │   ├── index.ts           # Performance monitoring
│   │   │   ├── metrics.ts         # Metrics collection
│   │   │   └── optimization.ts    # Tree-shaking support
│   │   └── index.ts              # Core exports
│   ├── security/                  # Optional security module
│   │   ├── index.ts               # Security module entry
│   │   ├── sanitization.ts        # XSS prevention
│   │   ├── filtering.ts           # Channel whitelist/blacklist
│   │   ├── rate-limiting.ts       # Event flood protection
│   │   └── validation.ts          # Payload security
│   ├── adapters/                  # Minimal framework wrappers
│   │   ├── react/
│   │   │   ├── useNotificationChannel.ts
│   │   │   └── examples/
│   │   ├── angular/
│   │   │   ├── NotificationService.ts
│   │   │   └── examples/
│   │   ├── vue/
│   │   │   ├── useNotificationChannel.ts
│   │   │   └── examples/
│   │   └── node/
│   │       ├── index.ts
│   │       └── examples/
│   ├── migration/                 # Migration utilities
│   │   ├── index.ts
│   │   ├── from-mitt.ts
│   │   └── utils.ts
│   ├── test/                     # Test suites
│   │   ├── core/
│   │   ├── security/
│   │   ├── adapters/
│   │   └── integration/
│   ├── examples/                  # Usage examples
│   │   ├── basic/
│   │   ├── security/
│   │   ├── performance/
│   │   └── frameworks/
│   └── index.ts                  # Main package entry
├── docs/                         # Documentation
│   ├── api/                      # API reference
│   ├── guides/                    # User guides
│   ├── migration/                 # Migration guides
│   └── examples/                  # Code examples
├── tools/                        # Build and dev tools
│   ├── build/                     # Rollup config
│   ├── test/                      # Jest config
│   └── devtools/                  # DevTools recommendations
├── package.json
├── tsconfig.json
├── rollup.config.js
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
└── README.md
```

### **Core Module Specifications**

#### **EventEmitter Interface**
```typescript
interface EventEmitter {
  // Core event methods
  emit<T>(channel: string, data: T, options?: EmitOptions): void;
  on<T>(channel: string, callback: EventCallback<T>): UnsubscribeFunction;
  once<T>(channel: string, callback: EventCallback<T>): UnsubscribeFunction;
  off<T>(channel: string, callback?: EventCallback<T>): void;
  
  // Middleware
  use(middleware: Middleware): void;
  
  // Buffer control
  clear(channel?: string): void;
  getBuffered(channel: string): BufferedEvent[];
  
  // Performance monitoring
  getMetrics(): PerformanceMetrics;
  
  // Security (optional)
  configureSecurity(config: SecurityConfig): void;
  
  // SSR/CSR handling
  isSSR(): boolean;
  waitForHydration(): Promise<void>;
  getSSRConfig(): SSRConfig;
}
```

#### **Configuration Interface**
```typescript
interface BaseEventConfig {
  buffer?: {
    strategy: 'lru' | 'fifo' | 'priority';
    maxSize: number;
    ttl: number;
    crossTab?: boolean;
    compression?: boolean;
  };
  middleware?: Middleware[];
  security?: SecurityConfig;
  performance?: {
    monitoring?: boolean;
    metricsInterval?: number;
  };
  ssr?: {
    enabled?: boolean;
    hydrationDelay?: number;
    bufferStrategy?: 'client-only' | 'server-persist' | 'hybrid';
    syncMode?: 'immediate' | 'on-hydration' | 'manual';
  };
}
```

---

## 🚀 **Implementation Roadmap**

### **Phase 1: Core Engine (Weeks 1-6) - Critical**
**Objective**: Build rock-solid foundation with intelligent buffering

**Week 1-2: Core Buffer System**
- [x] Implement ring buffer with configurable strategies
- [x] TTL and size limit enforcement
- [x] Cross-tab synchronization via localStorage
- [-] Buffer compression for large payloads (skipped)
- [x] Unit tests for buffer strategies

**Week 3-4: Event Emitter Core**
- [x] Main EventEmitter class implementation
- [x] Event type system with TypeScript generics
- [x] Async middleware chain support
- [x] Subscription management with cleanup
- [x] Integration tests for emitter + buffer

**Week 5-6: Performance & SSR Support**
- [x] Built-in performance metrics collection
- [x] Memory usage tracking
- [x] Events per second monitoring
- [ ] Performance optimization benchmarks
- [ ] Performance regression tests
- [ ] SSR/CSR environment detection
- [ ] Client hydration waiting mechanism
- [ ] Cross-environment buffer synchronization
- [ ] SSR-safe event emission patterns

**Deliverables**: Core engine with intelligent buffering, async middleware, performance monitoring

### **Phase 2: Advanced Features (Weeks 7-10) - High Priority**
**Objective**: Add differentiators and developer experience features

**Week 7-8: Event System Enhancements**
- [ ] Event schema validation system
- [ ] Event versioning support
- [ ] Wildcard pattern matching
- [ ] Once listeners with auto-cleanup
- [ ] TypeScript interface generation

**Week 9-10: Security Module (Optional)**
- [ ] Input sanitization for XSS prevention
- [ ] Channel whitelist/blacklist filtering
- [ ] Rate limiting configuration
- [ ] Security module toggle (disabled by default)
- [ ] Security configuration tests

**Deliverables**: Enhanced event system with optional security, TypeScript schemas

### **Phase 3: Framework Integration (Weeks 11-14) - High Priority**
**Objective**: Provide minimal, effective framework adapters

**Week 11-12: Adapter Development**
- [ ] React hook: useNotificationChannel
- [ ] Angular service: NotificationService
- [ ] Vue composable: useNotificationChannel
- [ ] Node.js module for server-side usage
- [ ] Adapter integration tests

**Week 13-14: Migration & Documentation**
- [ ] Migration utility from mitt (largest competitor)
- [ ] Basic usage examples for each framework
- [ ] Quick start documentation
- [ ] API reference documentation
- [ ] Migration guide from common libraries

**Deliverables**: Framework adapters, migration tools, documentation

### **Phase 4: Release & Ecosystem (Weeks 15-18) - Medium Priority**
**Objective**: Prepare for production release and community adoption

**Week 15-16: Quality & Release**
- [ ] Comprehensive test coverage (>95%)
- [ ] Bundle optimization with tree-shaking
- [ ] Type definition generation (.d.ts files)
- [ ] Build pipeline automation
- [ ] Package metadata and publishing

**Week 17-18: Ecosystem Setup**
- [ ] GitHub repository with contribution guidelines
- [ ] NPM package publishing
- [ ] DevTools recommendations documentation
- [ ] Community issue templates and PR guidelines
- [ ] Initial blog post and announcement

**Deliverables**: Production-ready npm package, community infrastructure

### **Future Considerations**

[ ] **Skipped: Buffer Compression for Large Payloads**

  - **Reason**: Not needed for typical notification bus use cases (payloads typically <1KB)
  - **Performance**: Compression adds CPU overhead, risking 100K+ events/sec target
  - **Bundle Size**: LZ-string adds ~3KB+, threatening 1.5KB bundle target
  - **Alternative**: Users with large payloads should configure smaller `maxSize` or `ttl`
  - **Future**: Can be re-evaluated if demand emerges with threshold-based approach

---

## 🛠️ **Development Environment Setup**

### **Required Tools**
```json
{
  "devDependencies": {
    "typescript": "^5.0",
    "rollup": "^4.0",
    "jest": "^29.0",
    "@types/jest": "^29.0",
    "eslint": "^8.0",
    "prettier": "^3.0",
    "semantic-release": "^22.0",
    "husky": "^8.0",
    "lint-staged": "^13.0"
  }
}
```

### **Build Scripts**
```json
{
  "scripts": {
    "dev": "tsc --watch",
    "build": "rollup -c",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write src/**/*.ts",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test",
    "release": "semantic-release"
  }
}
```

### **TypeScript Configuration**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## 📦 **Package Specification**

### **Package.json Structure**
```json
{
  "name": "the-base-event",
  "version": "1.0.0",
  "description": "Framework-agnostic event bus with intelligent replay and memory management",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./security": "./dist/security.js",
    "./react": "./dist/adapters/react.js",
    "./angular": "./dist/adapters/angular.js",
    "./vue": "./dist/adapters/vue.js"
  },
  "keywords": [
    "events",
    "event-emitter",
    "event-bus",
    "notifications",
    "framework-agnostic",
    "typescript",
    "buffer",
    "replay",
    "memory-management"
  ],
  "author": "concatenateline",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/concatenateline/the-base-event.git"
  },
  "bugs": {
    "url": "https://github.com/concatenateline/the-base-event/issues"
  },
  "homepage": "https://github.com/concatenateline/the-base-event#readme"
}
```

### **Bundle Targets**
- **ES Module**: `dist/index.esm.js` (tree-shakable)
- **CommonJS**: `dist/index.js` (Node.js compatible)
- **UMD**: `dist/index.umd.js` (browser global)
- **Type Definitions**: `dist/index.d.ts` (TypeScript support)
- **Minified Versions**: All formats with `.min.js` suffix

---

## 🎯 **Success Metrics & KPIs**

### **Technical Success Metrics**

#### **Performance Targets**
```typescript
interface PerformanceTargets {
  bundleSize: '≤1.5KB';           // Competitive with lightweight libs
  eventsPerSecond: '≥100K';          // Faster than competitors
  memoryUsage: '<10MB per 100K events'; // Controlled growth
  latency: '<1ms overhead';            // Minimal impact
}
```

#### **Quality Metrics**
- Test Coverage: ≥95%
- TypeScript Coverage: 100%
- Bundle Analysis: Zero unused exports
- Performance Regression: <5% degradation
- Memory Leak Tests: 100% pass rate

### **Business Success Metrics**

#### **Adoption Targets (6 months)**
- NPM Downloads: 50K/month
- GitHub Stars: 500+
- Framework Usage: 70% React, 20% Angular, 10% Vue
- Migration Success: 80% from existing libraries
- Community Contributions: 10+ pull requests

#### **Developer Experience Metrics**
- Setup Time: <3 minutes for basic integration
- Learning Curve: <1 hour for core concepts
- Documentation Rating: ≥4.5/5 stars
- Bug Report Resolution: <48 hours median
- Feature Request Response: <7 days median

---

## 🔍 **Testing Strategy**

### **Test Categories**

#### **Unit Tests (Core Engine)**
```typescript
describe('EventEmitter', () => {
  describe('Buffer Management', () => {
    it('should buffer events before subscription');
    it('should replay buffered events on subscription');
    it('should respect TTL for buffered events');
    it('should enforce max buffer size');
    it('should use LRU eviction strategy');
  });
  
  describe('Middleware Chain', () => {
    it('should process middleware in order');
    it('should handle async middleware');
    it('should pass errors through chain');
    it('should support middleware removal');
  });
  
  describe('Memory Management', () => {
    it('should cleanup on unsubscribe');
    it('should prevent memory leaks');
    it('should respect configuration limits');
  });
});
```

#### **Integration Tests (Framework Adapters)**
```typescript
describe('React Adapter', () => {
  it('should work with React hooks');
  it('should handle component unmount');
  it('should work with React concurrent features');
});

describe('Angular Adapter', () => {
  it('should work with dependency injection');
  it('should handle service destruction');
  it('should work with Angular signals');
});

describe('Vue Adapter', () => {
  it('should work with composition API');
  it('should handle component unmount');
  it('should work with Vue reactivity system');
});
```

#### **Performance Tests**
```typescript
describe('Performance', () => {
  it('should handle 100K events per second');
  it('should maintain <1ms latency');
  it('should not leak memory under load');
  it('should work efficiently with 10K subscribers');
});
```

#### **SSR/CSR Tests**
```typescript
describe('SSR/CSR Compatibility', () => {
  describe('Environment Detection', () => {
    it('should detect SSR environment correctly');
    it('should detect client environment correctly');
    it('should handle environment transitions');
  });
  
  describe('Hydration Safety', () => {
    it('should buffer server events until hydration');
    it('should replay events after client mount');
    it('should prevent duplicate events during hydration');
    it('should handle hydration timeout gracefully');
  });
  
  describe('Cross-Environment Buffer', () => {
    it('should persist events across SSR/CSR boundary');
    it('should sync server and client buffers');
    it('should handle buffer conflicts gracefully');
  });
});
```

#### **Security Tests (Optional Module)**
```typescript
describe('Security Module', () => {
  it('should sanitize XSS payloads');
  it('should enforce rate limits');
  it('should filter by channel whitelist');
  it('should validate against schemas');
});
```

---

## 🎉 **Final Project Summary**

### **What Makes "The Base Event" Unique**

1. **No Lost Events**: Intelligent buffer replay guarantees delivery
2. **Framework Agnostic**: Single core, minimal adapters for any framework
3. **Memory Safe**: Built-in TTL, size limits, and auto-cleanup
4. **Performance Optimized**: 100K+ events/sec, 1.5KB bundle
5. **TypeScript First**: Strong typing with event schemas
6. **Security Ready**: Optional security, zero impact when disabled
7. **Developer Friendly**: Simple API, comprehensive documentation
8. **SSR/CSR Compatible**: Built-in hydration safety for modern frameworks

### **Competitive Advantages**

| Feature | mitt | eventemitter3 | Redux | **The Base Event** |
|---------|------|---------------|-------|-------------------|
| Event Replay | ❌ | ❌ | ❌ | ✅ |
| Memory Management | ❌ | ❌ | ❌ | ✅ |
| Framework Agnostic | ❌ | ❌ | ❌ | ✅ |
| Bundle Size | 200b | 2KB | 15KB | **1.5KB** |
| Security | ❌ | ❌ | ❌ | ✅ (optional) |
| TypeScript | ✅ | ✅ | ✅ | ✅ (enhanced) |
| Performance Monitoring | ❌ | ❌ | ❌ | ✅ |
| SSR/CSR Support | ❌ | ❌ | ❌ | ✅ |

### **Target Audience**
1. **Individual Developers**: Simple setup, no framework lock-in
2. **Small Teams**: Quick integration, minimal overhead
3. **Performance-Conscious**: Memory safety without complexity
4. **Migration Projects**: Easy upgrade from existing libraries
5. **Enterprise Applications**: Optional security and monitoring
6. **SSR Applications**: Next.js, Nuxt, SvelteKit, Angular Universal
7. **Full-Stack Teams**: Unified event system across server and client

**The Base Event** fills the critical gap between overly-simple event emitters and heavyweight state management solutions, providing a perfect balance of features, performance, and simplicity.

---

*Project specification completed: February 2025*
*Ready for implementation with clear roadmap and success metrics*


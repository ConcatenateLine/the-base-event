# The Base Event

> Framework-agnostic event bus with intelligent replay and memory management

[![npm version](https://img.shields.io/npm/v/the-base-event.svg)](https://www.npmjs.com/package/the-base-event)
[![npm downloads](https://img.shields.io/npm/dm/the-base-event.svg)](https://www.npmjs.com/package/the-base-event)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/the-base-event.svg)](https://bundlephobia.com/result?p=the-base-event)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 🎯 Features

- **🔄 Event Replay**: Intelligent buffering guarantees no lost events
- **🧠 Memory Safe**: Built-in TTL and size limits prevent unbounded growth
- **🌐 Framework Agnostic**: Single core engine with minimal adapters
- **⚡ High Performance**: 100K+ events/sec with <1ms overhead
- **🔒 Security Ready**: Optional XSS prevention and rate limiting
- **📝 TypeScript First**: Strong typing with event schemas and validation
- **🖥️ SSR Compatible**: Built-in hydration safety for modern frameworks
- **📦 Lightweight**: 1.5KB bundle, tree-shakable imports

## 📦 Installation

```bash
# npm
npm install the-base-event

# yarn
yarn add the-base-event

# pnpm
pnpm add the-base-event
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { EventEmitter } from 'the-base-event';

// Create emitter with default configuration
const emitter = new EventEmitter();

// Subscribe to events
const unsubscribe = emitter.on('user:login', (event) => {
  console.log('User logged in:', event.payload);
});

// Emit events
emitter.emit('user:login', { userId: '123', timestamp: Date.now() });

// Cleanup when done
unsubscribe();
```

### Advanced Configuration

```typescript
import { EventEmitter } from 'the-base-event';

const emitter = new EventEmitter({
  buffer: {
    strategy: 'lru',
    maxSize: 1000,
    ttl: 30000
  },
  security: {
    sanitization: true,
    rateLimit: { max: 1000, window: 1000 }
  },
  performance: {
    monitoring: true
  }
});
```

## 🏗️ Architecture

```
the-base-event/
├── core/           # Framework-agnostic engine
├── adapters/        # Framework wrappers
├── security/        # Optional security features
└── migration/       # Migration utilities
```

## 📚 Documentation

- [API Reference](./docs/api/README.md)
- [Framework Guides](./docs/guides/)
- [Migration Guide](./docs/migration/)
- [Examples](./docs/examples/)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test
npm run test:single user-events
```

## 🔧 Development

```bash
# Start development server
npm run dev

# Build all formats
npm run build

# Type checking
npm run typecheck

# Lint code
npm run lint

# Format code
npm run format
```

## 🎯 Performance

- **Bundle Size**: 1.5KB (minified + gzipped)
- **Events/sec**: 100K+ benchmark
- **Memory**: Controlled growth with auto-cleanup
- **Latency**: <1ms overhead

## 📄 License

MIT © [The Base Event Team](https://github.com/ConcatenateLine/the-base-event)

---

**The Base Event** - The only framework-agnostic event system that guarantees no lost events through intelligent buffer replay while providing built-in memory safety and SSR compatibility.

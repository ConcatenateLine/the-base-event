# Security Module

The Security Module provides comprehensive security features for The Base Event event emitter, including XSS prevention, channel filtering, and rate limiting. All security features are **disabled by default** to ensure zero performance impact when not needed.

## Overview

The security module integrates seamlessly with the EventEmitter through middleware and provides:

- **Input Sanitization**: XSS prevention through configurable sanitization rules
- **Channel Filtering**: Whitelist/blacklist filtering with glob pattern support
- **Rate Limiting**: Token bucket algorithm for controlling event flow

## Quick Start

```typescript
import { EventEmitter, createSecurityModule } from "@the-base-event/core";

const emitter = new EventEmitter();

const security = createSecurityModule({
  enabled: true,
  sanitization: { enabled: true },
  filtering: { enabled: true, config: { mode: "blacklist", blockedPatterns: ["admin:*"] } },
  rateLimiting: { enabled: true, config: { eventsPerSecond: 100, burstCapacity: 150 } }
});

emitter.use(security.createMiddleware());
```

## Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `enabled` | boolean | Enable/disable all security features | `false` |
| `sanitization` | object | XSS prevention settings | disabled |
| `filtering` | object | Channel filtering settings | disabled |
| `rateLimiting` | object | Rate limiting settings | disabled |

## API Reference

### `createSecurityModule(config)`

Creates a security module instance with the specified configuration.

```typescript
const security = createSecurityModule({
  enabled: true,
  sanitization: {
    enabled: true,
    config: {
      stripScriptTags: true,
      encodeHtmlEntities: true
    }
  }
});
```

### Methods

- `isEnabled()` - Returns whether security is enabled
- `enable()` / `disable()` - Toggle security features
- `createMiddleware()` - Create middleware for EventEmitter
- `sanitizePayload(data)` - Sanitize data without emitting
- `isXssPayload(input)` - Check if string contains XSS
- `isChannelAllowed(channel)` - Quick channel check
- `filterChannel(channel)` - Detailed filter result
- `checkRateLimit(channel?)` - Check rate limit status
- `getRateLimiter()` - Access rate limiter instance
- `getChannelFilter()` - Access filter instance
- `updateConfig(config)` - Update config at runtime
- `getConfig()` - Get current configuration

## Performance

All security features are designed for minimal overhead:

- Features are disabled by default (zero overhead when unused)
- Sanitization uses efficient regex patterns
- Channel filtering uses pre-compiled regex for pattern matching
- Rate limiting uses in-memory token bucket algorithm

For high-throughput scenarios, consider enabling only the security features you need.

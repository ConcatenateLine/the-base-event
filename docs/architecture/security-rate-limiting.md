# Security - Rate Limiting

The rate limiting module implements a token bucket algorithm to control the rate of events emitted through the EventEmitter.

## Overview

Rate limiting prevents:
- Denial of Service (DoS) attacks
- Resource exhaustion
- Excessive event processing
- Abuse from rapid event emission

## Token Bucket Algorithm

The implementation uses the token bucket algorithm:

- **Bucket Capacity**: Maximum tokens (burst capacity)
- **Refill Rate**: Tokens added per second (events per second)
- **Consumption**: One token per event check

```
Bucket State Over Time:

Time 0s: ████████████ (10 tokens, burst=10)
Time 0.1s: ████████████ (10 tokens) 
Time 0.5s: ██████████ (9 tokens after 5 events)
Time 1.0s: ██████████ (refilled to ~10 tokens)
```

## Usage

### Global Rate Limiting

Limit events across all channels:

```typescript
import { createGlobalRateLimiter } from "@the-base-event/core";

const limiter = createGlobalRateLimiter(100, 150);
// 100 events/second, burst to 150

// Check if allowed
const result = limiter.check();

result.allowed;          // true/false
result.remainingTokens;  // tokens left
result.resetAt;          // timestamp when bucket refills
result.retryAfter;       // ms to wait before retry
```

### Per-Channel Rate Limiting

Limit events for each channel independently:

```typescript
import { createPerChannelRateLimiter } from "@the-base-event/core";

const limiter = createPerChannelRateLimiter(10, 20);
// 10 events/sec per channel, burst to 20

// Different channels have separate buckets
limiter.check("user:login");   // Channel 1: 19 tokens left
limiter.check("user:login");   // Channel 1: 18 tokens left
limiter.check("admin:panel");  // Channel 2: 19 tokens left
```

### Callback on Rate Limit Exceeded

```typescript
const limiter = createRateLimiter({
  eventsPerSecond: 10,
  burstCapacity: 10,
  scope: "global"
});

limiter.setOnLimitExceeded((data) => {
  console.log("Rate limit exceeded:", {
    channel: data.channel,
    scope: data.scope,
    eventsPerSecond: data.eventsPerSecond,
    currentTokens: data.currentTokens,
    timestamp: data.timestamp
  });
});
```

## Configuration

```typescript
interface RateLimitConfig {
  eventsPerSecond: number;  // Token refill rate (default: 100)
  burstCapacity: number;     // Max tokens in bucket (default: 150)
  scope: "global" | "per-channel";  // Rate limit scope
}
```

### Configuration Examples

```typescript
// Strict limits (10 events/sec)
const strict = createRateLimiter({
  eventsPerSecond: 10,
  burstCapacity: 10,
  scope: "global"
});

// Moderate limits (100 events/sec)
const moderate = createRateLimiter({
  eventsPerSecond: 100,
  burstCapacity: 150,
  scope: "global"
});

// Per-channel limits (50 events/sec per channel)
const perChannel = createRateLimiter({
  eventsPerSecond: 50,
  burstCapacity: 75,
  scope: "per-channel"
});
```

## Integration with EventEmitter

```typescript
import { EventEmitter, createSecurityModule } from "@the-base-event/core";

const security = createSecurityModule({
  enabled: true,
  rateLimiting: {
    enabled: true,
    config: {
      eventsPerSecond: 100,
      burstCapacity: 150,
      scope: "global"
    },
    onLimitExceeded: (data) => {
      console.warn("Rate limit exceeded:", data);
    }
  }
});

const emitter = new EventEmitter();
emitter.use(security.createMiddleware());

// Rapid emission will be rate limited
for (let i = 0; i < 200; i++) {
  emitter.emit("events:fire", { index: i });
}
```

## Class API

### `new RateLimiter(config)`

```typescript
const limiter = new RateLimiter({
  eventsPerSecond: 50,
  burstCapacity: 50,
  scope: "per-channel"
});
```

### Methods

- `check(channel?)` - Check rate limit, returns RateLimitResult
- `allow(channel?)` - Simple boolean check
- `reset(channel?)` - Reset specific channel or global bucket
- `resetAll()` - Reset all channels and global
- `getConfig()` - Get current configuration
- `updateConfig(config)` - Update configuration
- `getStatus(channel?)` - Get bucket status
- `setOnLimitExceeded(callback)` - Set callback for limit exceeded

### RateLimitResult

```typescript
{
  allowed: boolean;        // Whether event is allowed
  remainingTokens: number;  // Tokens left in bucket
  resetAt: number;          // Timestamp of next refill
  retryAfter?: number;      // Milliseconds until allowed (when blocked)
}
```

## Reset Functionality

```typescript
const limiter = createPerChannelRateLimiter(5, 5);

// Exceed limit
limiter.check("channel1");
limiter.check("channel1");
limiter.check("channel1");
limiter.check("channel1");
limiter.check("channel1");
limiter.check("channel1"); // Blocked

// Reset specific channel
limiter.reset("channel1");
limiter.check("channel1"); // Allowed again

// Reset everything
limiter.resetAll();
```

## Status Information

```typescript
const status = limiter.getStatus("channel1");
// or for global: limiter.getStatus()

{
  tokens: number;      // Current tokens
  maxTokens: number;   // Burst capacity
  lastRefill: number;  // Timestamp of last refill
}
```

## Best Practices

1. **Choose appropriate limits**: Consider your application's normal event rate
2. **Use per-channel for isolation**: Prevent one noisy channel from affecting others
3. **Monitor with callbacks**: Log rate limit exceeded events for monitoring
4. **Allow burst capacity**: Set burst higher than steady-state for spikes
5. **Combine with other security**: Use sanitization + filtering + rate limiting together

## Performance Considerations

- Token bucket operations are O(1)
- Per-channel tracking adds memory overhead (proportional to active channels)
- Callback execution adds minimal overhead
- For extreme throughput, consider increasing eventsPerSecond and burstCapacity

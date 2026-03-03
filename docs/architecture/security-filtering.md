# Security - Channel Filtering

The filtering module provides whitelist/blacklist filtering for event channels with support for glob patterns.

## Overview

Channel filtering allows you to control which channels can emit events, providing an additional layer of security by blocking unwanted or sensitive channel names.

## Modes

### Blacklist Mode (Default)

Blocks specific channels while allowing all others:

```typescript
import { createBlacklistFilter } from "@the-base-event/core";

const filter = createBlacklistFilter(["admin:*", "private:*", "system:secret:*"]);

filter.allow("user:events");    // ✓ true
filter.allow("admin:delete");  // ✗ false
filter.allow("private:data");   // ✗ false
```

### Whitelist Mode

Allows only specific channels:

```typescript
import { createWhitelistFilter } from "@the-base-event/core";

const filter = createWhitelistFilter(["user:*", "public:*"]);

filter.allow("user:login");    // ✓ true
filter.allow("public:events"); // ✓ true
filter.allow("admin:panel");   // ✗ false
```

## Glob Patterns

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `*` | Match any characters within a segment | `user:*` matches `user:login`, `user:logout` |
| `**` | Match any characters across segments | `user:*:*` matches `user:id:event` |
| `?` | Match single character | `user?` matches `user1`, `user2` |

### Examples

```typescript
const filter = createWhitelistFilter([
  "user:*",           // Any user event
  "system:health",    // Specific system event
  "public:*",         // Any public event
  "order:**"          // Order events at any level
]);
```

## Usage

### Basic Usage

```typescript
import { ChannelFilter, createChannelFilter } from "@the-base-event/core";

// Create filter with configuration
const filter = createChannelFilter({
  mode: "whitelist",
  allowedChannels: ["user:*", "system:*"],
  defaultBehavior: "deny"
});

// Check a channel
filter.allow("user:login");      // true
filter.allow("admin:delete");     // false
```

### Get Detailed Results

```typescript
const result = filter.filterEvent("user:login");

result.allowed;           // true
result.matchedPattern;    // "user:*"
result.reason;            // undefined (when allowed)
```

### Runtime Updates

```typescript
const filter = createBlacklistFilter(["admin:*"]);

// Add patterns dynamically
filter.addBlockedPattern("private:*");
filter.addAllowedChannel("special:*");

// Remove patterns
filter.removeBlockedPattern("admin:*");

// Clear all rules
filter.clearRules();
```

### Default Behavior

Configure what happens when no rules match:

```typescript
// Default: allow when no blacklist matches
const filter1 = createBlacklistFilter(["admin:*"]);

// Deny when no whitelist matches
const filter2 = createWhitelistFilter(["user:*", "system:*"]);
```

## Integration with EventEmitter

```typescript
import { EventEmitter, createSecurityModule } from "@the-base-event/core";

const security = createSecurityModule({
  enabled: true,
  filtering: {
    enabled: true,
    config: {
      mode: "blacklist",
      blockedPatterns: ["admin:*", "private:*", "internal:**"],
      defaultBehavior: "allow"
    }
  }
});

const emitter = new EventEmitter();
emitter.use(security.createMiddleware());

// This will be blocked
emitter.emit("admin:delete", { userId: 123 });

// This will be allowed
emitter.emit("user:login", { userId: 123 });
```

## Class API

### `new ChannelFilter(config)`

```typescript
const filter = new ChannelFilter({
  mode: "whitelist",
  allowedChannels: ["user:*"],
  blockedPatterns: ["user:admin:*"],
  defaultBehavior: "deny"
});
```

### Methods

- `allow(channel)` - Check if channel is allowed
- `filterEvent(channel)` - Get detailed filter result
- `updateConfig(config)` - Update configuration
- `getConfig()` - Get current configuration
- `addAllowedChannel(pattern)` - Add to whitelist
- `addBlockedPattern(pattern)` - Add to blacklist
- `removeAllowedChannel(pattern)` - Remove from whitelist
- `removeBlockedPattern(pattern)` - Remove from blacklist
- `clearRules()` - Clear all rules

## Helper Functions

```typescript
import { 
  isChannelAllowed, 
  filterChannels 
} from "@the‑base-event/core";

// Quick boolean check
const allowed = isChannelAllowed("user:login", {
  mode: "whitelist",
  allowedChannels: ["user:*"],
  defaultBehavior: "deny"
});

// Filter array of channels
const channels = ["user:1", "admin:2", "public:3"];
const allowed = filterChannels(channels, {
  mode: "blacklist",
  blockedPatterns: ["admin:*"],
  defaultBehavior: "allow"
});
// Result: ["user:1", "public:3"]
```

## Best Practices

1. **Use whitelist for sensitive applications**: Only allow known channels
2. **Use blacklist for general protection**: Block obvious problematic patterns
3. **Combine with sanitization**: Filter channels + sanitize payloads
4. **Monitor blocked attempts**: Log channel filter violations for security monitoring

# Wildcard Pattern Matching

The Base Event supports wildcard pattern matching for event channels, enabling subscribers to receive events from multiple matching channels using glob-style patterns.

## Pattern Syntax

| Pattern | Description | Example Match |
|---------|-------------|---------------|
| `*` | Single segment wildcard - matches any alphanumeric segment | `user:*` matches `user:login`, `user:logout` |
| `**` | Multi-segment wildcard - matches multiple segments | `notification:**` matches `notification:email`, `notification:sms:send` |
| `?` | Single character wildcard | `user:?` matches `user:a`, `user:1` |

## API Reference

### `onPattern(pattern, callback)`

Subscribe to events matching a wildcard pattern.

```typescript
const emitter = new EventEmitter();

// Subscribe to all user events
emitter.onPattern('user:*', (event) => {
  console.log('User event:', event.channel, event.data);
});

// Subscribe to all notification events
emitter.onPattern('notification:**', (event) => {
  console.log('Notification event:', event.channel, event.data);
});

// Unsubscribe
const unsubscribe = emitter.onPattern('user:*', handler);
unsubscribe();
```

### `oncePattern(pattern, callback, options?)`

Subscribe to pattern events that fire only once.

```typescript
// Listen for first user event
emitter.oncePattern('user:*', (event) => {
  console.log('First user event:', event);
});
```

## Direct Pattern Matching

### `matchWildcard(channel, pattern)`

Check if a channel matches a pattern.

```typescript
import { matchWildcard } from '@core/events/pattern-match';

matchWildcard('user:login', 'user:*');      // true
matchWildcard('user:profile:update', 'user:*'); // false
matchWildcard('notification:email:send', 'notification:**'); // true
```

### `matchPattern(channel, pattern)`

Returns detailed match result with captured groups.

```typescript
import { matchPattern } from '@core/events/pattern-match';

const result = matchPattern('user:login', 'user:*');
// { matches: true, capturedGroups: { capture0: 'login' } }
```

### `compilePattern(pattern)`

Pre-compile a pattern for better performance in loops.

```typescript
import { compilePattern } from '@core/events/pattern-match';

const compiled = compilePattern('user:*');
// Use compiled.regex for matching
```

## Pattern Caching

Patterns are automatically cached for performance. The cache size is limited to 1000 patterns.

```typescript
import { getPatternCacheSize, clearPatternCache } from '@core/events/pattern-match';

// Check cache size
const size = getPatternCacheSize();

// Clear cache if needed
clearPatternCache();
```

## Performance Considerations

- Patterns are compiled once and cached
- Use specific patterns when possible to reduce matching overhead
- For high-frequency patterns, pre-compile using `compilePattern()`

## TypeScript Support

The pattern matching utilities are fully typed:

```typescript
import type { PatternMatchResult, CompiledPattern } from '@core/events/pattern-match';
```

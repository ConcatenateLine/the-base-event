# Once Listeners with Auto-Cleanup

The Base Event extends the standard `once()` method with advanced features including timeout support, max attempts, and automatic cleanup.

## Basic Usage

The standard `once()` behavior remains unchanged - it listens for a single event and automatically unsubscribes:

```typescript
const emitter = new EventEmitter();

emitter.once('user:login', (event) => {
  console.log('User logged in:', event.data);
});

emitter.emit('user:login', { userId: '123' });
// Listener called and automatically unsubscribed
```

## Advanced Options

### Timeout Option

Automatically invoke the callback with a default value if no event is received within the specified timeout:

```typescript
emitter.once('user:login', (event) => {
  console.log('User logged in:', event.data);
}, {
  timeout: 5000, // 5 seconds
  defaultValue: { userId: 'guest' },
});

// If no 'user:login' event within 5 seconds:
// Callback called with defaultValue: { userId: 'guest' }
```

### Max Attempts Option

Listen for multiple events before unsubscribing:

```typescript
emitter.once('user:action', (event) => {
  console.log('Action received:', event.data);
}, {
  maxAttempts: 3, // Listen for 3 events before unsubscribing
});

emitter.emit('user:action', { action: 'click' });  // Called
emitter.emit('user:action', { action: 'hover' }); // Called
emitter.emit('user:action', { action: 'scroll' }); // Called, then unsubscribed
```

## Options Reference

```typescript
interface OnceOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Default value to emit if timeout is reached */
  defaultValue?: unknown;
  
  /** Number of events to listen for before auto-unsubscribe */
  maxAttempts?: number;
}
```

## Auto-Cleanup on Destroy

All `once` listeners are automatically cleaned up when the emitter is destroyed:

```typescript
const emitter = new EventEmitter();

emitter.once('user:login', handler, { timeout: 10000 });

// When emitter is destroyed, all pending timeouts are cleared
emitter.destroy();
// No memory leaks from pending timeouts
```

## Error Handling

Errors in `once` callbacks are caught and logged without breaking the event flow:

```typescript
emitter.once('data:fetch', (event) => {
  throw new Error('Simulated error');
}, {
  timeout: 5000,
});

// Error caught internally, no crash
emitter.emit('data:fetch', { data: 'test' });
```

## Pattern Once Listeners

You can also use `oncePattern` for wildcard patterns:

```typescript
emitter.oncePattern('user:*', (event) => {
  console.log('User event:', event.channel);
});
```

## Use Cases

### Timeout with Default Value

Useful for cases where you need a fallback when an expected event doesn't arrive:

```typescript
const emitter = new EventEmitter();

// Wait for user session, fallback to guest after 3 seconds
emitter.once('session:established', (event) => {
  console.log('Session:', event.data);
}, {
  timeout: 3000,
  defaultValue: { sessionId: 'guest', expiresAt: null },
});
```

### Max Attempts for Aggregation

Collect multiple events before processing:

```typescript
const emitter = new EventEmitter();

// Collect 5 analytics events before processing
const events: unknown[] = [];
emitter.once('analytics:batch', (event) => {
  events.push(event.data);
  processBatch(events);
}, {
  maxAttempts: 5,
});
```

### Combining Options

```typescript
emitter.once('task:result', handler, {
  timeout: 10000,
  defaultValue: { status: 'timeout' },
  maxAttempts: 3,
});
```

## Memory Safety

The `once` listener system is designed to prevent memory leaks:

- Timeout timers are cleared when listener fires
- Timeout timers are cleared on emitter destroy
- Listeners are automatically unsubscribed after max attempts
- References are cleaned up after execution

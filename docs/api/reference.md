# API Reference

Complete reference for The Base Event library.

## Core

### `createEventEmitter(config?)`

Creates a new EventEmitter instance with optional configuration.

```typescript
import { createEventEmitter } from "the-base-event";

const emitter = createEventEmitter({
  buffer: { maxSize: 500 },
  middleware: [myMiddleware],
  ssr: { enabled: true },
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| config | `EventEmitterConfig` | Optional configuration |

**Returns:** `EventEmitter`

---

### `EventEmitter`

The main event emitter class.

#### `emitter.emit<T>(channel, data, options?)`

Emit an event to a specific channel.

```typescript
emitter.emit<UserEvent>("user:login", {
  userId: "user-123",
  action: "login",
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| channel | `string` | Event channel name |
| data | `T` | Event payload |
| options | `EmitOptions` | Optional emit options |

#### `emitter.on<T>(channel, callback)`

Subscribe to events on a channel.

```typescript
const unsubscribe = emitter.on<UserEvent>("user:login", (event) => {
  console.log(event.data);
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| channel | `string` | Channel to subscribe to |
| callback | `EventCallback<T>` | Handler function |

**Returns:** `UnsubscribeFunction`

#### `emitter.once<T>(channel, callback, options?)`

Subscribe to an event once.

```typescript
emitter.once<UserEvent>("user:login", (event) => {
  console.log("First login:", event.data);
}, { timeout: 5000, defaultValue: null });
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| channel | `string` | Channel to subscribe to |
| callback | `EventCallback<T>` | Handler function |
| options | `OnceOptions` | Optional once configuration |

**Returns:** `UnsubscribeFunction`

#### `emitter.onPattern<T>(pattern, callback)`

Subscribe to events matching a wildcard pattern.

```typescript
emitter.onPattern<UserEvent>("user:*", (event) => {
  console.log(event.channel, event.data);
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| pattern | `string` | Pattern (`*` single segment, `**` multi-segment) |
| callback | `EventCallback<T>` | Handler function |

**Returns:** `UnsubscribeFunction`

#### `emitter.off<T>(channel, callback?)`

Unsubscribe from a channel.

```typescript
// Unsubscribe specific callback
emitter.off("user:login", myCallback);

// Unsubscribe all callbacks on channel
emitter.off("user:login");
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| channel | `string` | Channel to unsubscribe from |
| callback | `EventCallback<T>` | Optional specific callback |

#### `emitter.getBuffered(channel)`

Get buffered events for a channel.

```typescript
const buffered = emitter.getBuffered("user:login");
console.log(buffered);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| channel | `string` | Channel name |

**Returns:** `BufferedEvent<T>[]`

#### `emitter.clear(channel?)`

Clear buffered events.

```typescript
// Clear specific channel
emitter.clear("user:login");

// Clear all channels
emitter.clear();
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| channel | `string` | Optional channel to clear |

#### `emitter.use(middleware)`

Add middleware to the processing chain.

```typescript
const loggingMiddleware: Middleware = async (event, next) => {
  console.log("Event:", event.channel);
  await next();
};

emitter.use(loggingMiddleware);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| middleware | `Middleware` | Middleware function |

#### `emitter.getMetrics()`

Get performance metrics.

```typescript
const metrics = emitter.getMetrics();
console.log(metrics.eventsPerSecond);
```

**Returns:** `PerformanceMetrics`

#### `emitter.destroy()`

Clean up all subscriptions and resources.

```typescript
emitter.destroy();
```

#### `emitter.markHydrated()`

Mark the application as hydrated (for SSR).

```typescript
// Call after framework hydration
emitter.markHydrated();
```

#### `emitter.waitForHydration()`

Wait for client hydration to complete.

```typescript
await emitter.waitForHydration();
```

**Returns:** `Promise<void>`

---

## Types

### `EventEmitterConfig`

```typescript
interface EventEmitterConfig {
  buffer?: BufferConfig;
  middleware?: Middleware[];
  ssr?: Partial<SSRConfig>;
}
```

### `BufferConfig`

```typescript
interface BufferConfig {
  maxSize?: number;      // Maximum events to buffer
  ttl?: number;         // Time to live in ms
  strategy?: "lru" | "fifo" | "priority";
  crossTab?: boolean;   // Enable cross-tab sync
}
```

### `EmitOptions`

```typescript
interface EmitOptions {
  priority?: "high" | "medium" | "low";
  ttl?: number;
  immediate?: boolean;
  type?: string;
  version?: string;
}
```

### `OnceOptions`

```typescript
interface OnceOptions {
  timeout?: number;       // Timeout in ms
  defaultValue?: unknown; // Default value if timeout
  maxAttempts?: number;  // Max retry attempts
}
```

### `BaseEvent<T>`

```typescript
interface BaseEvent<T = unknown> {
  id: string;
  channel: string;
  data: T;
  timestamp: number;
  type?: string;
  version?: string;
}
```

### `BufferedEvent<T>`

```typescript
interface BufferedEvent<T = unknown> extends BaseEvent<T> {
  bufferedAt: number;
  ttl?: number;
}
```

### `EventCallback<T>`

```typescript
type EventCallback<T = unknown> = (event: BaseEvent<T>) => void;
```

### `UnsubscribeFunction`

```typescript
type UnsubscribeFunction = () => void;
```

### `Middleware<T>`

```typescript
type Middleware<T = unknown> = (
  event: BaseEvent<T>,
  next: () => Promise<void> | void
) => Promise<void> | void;
```

### `PerformanceMetrics`

```typescript
interface PerformanceMetrics {
  eventsPerSecond: number;
  bufferUtilization: number;
  memoryUsage: number;
  activeSubscriptions: number;
  middlewareLatency: number;
}
```

### `SSRConfig`

```typescript
interface SSRConfig {
  enabled: boolean;
  hydrationDelay?: number;
  bufferStrategy?: "client-only" | "server-only" | "sync";
  syncMode?: "immediate" | "on-hydration" | "manual";
}
```

---

## Adapters

### React

#### `useNotificationChannel<T>(options)`

React hook for subscribing to events.

```typescript
const { subscribe, emit, clear } = useNotificationChannel<ChatMessage>({
  emitter: globalEmitter,
  channel: "chat:messages",
  replay: true,
});
```

**Options:**

```typescript
interface UseNotificationChannelOptions {
  emitter?: EventEmitter;
  channel: string;
  replay?: boolean;
}
```

**Returns:**

```typescript
interface NotificationChannelResult<T> {
  subscribe: (callback: EventCallback<T>) => UnsubscribeFunction;
  emit: (data: T) => void;
  clear: () => void;
}
```

---

### Angular

#### `NotificationService`

Angular service for event management.

```typescript
@Injectable({ providedIn: "root" })
class NotificationService {
  emit<T>(channel: string, data: T): void;
  on<T>(channel: string, callback: EventCallback<T>): UnsubscribeFunction;
  once<T>(channel: string, callback: EventCallback<T>): UnsubscribeFunction;
  onPattern<T>(pattern: string, callback: EventCallback<T>): UnsubscribeFunction;
  off(channel: string): void;
  getBuffered<T>(channel: string): BaseEvent<T>[];
  clear(channel?: string): void;
  destroy(): void;
}
```

---

### Vue

#### `useEventBus()`

Vue composable for event bus.

```typescript
const { subscribe, emit, unsubscribe, clear, emitter } = useEventBus();
```

**Returns:**

```typescript
interface EventBusResult {
  subscribe: <T>(channel: string, callback: EventCallback<T>, replay?: boolean) => UnsubscribeFunction;
  emit: <T>(channel: string, data: T) => void;
  unsubscribe: (channel: string) => void;
  clear: (channel?: string) => void;
  isConnected: Ref<boolean>;
  emitter: EventEmitter;
}
```

#### `useChannel<T>(channel, options)`

Composable for specific channel.

```typescript
const { lastEvent, events, subscribe, emit, clear } = useChannel<TodoItem>("todos");
```

---

### Node.js

#### `createServerEventEmitter(config)`

Create server-optimized emitter.

```typescript
const serverEmitter = createServerEventEmitter({
  server: {
    maxListeners: 100,
    timeout: 30000,
    keepAlive: true,
  },
});
```

#### `createNotificationChannel<T>(emitter, channel)`

Create a namespaced notification channel.

```typescript
const channel = createNotificationChannel<JobEvent>(emitter, "jobs");
channel.subscribe((event) => { /* ... */ });
channel.emit({ id: "job-1", data: {} });
```

---

## Error Handling

### Error Classes

```typescript
import { BufferOverflowError, InvalidChannelError, SecurityError } from "the-base-event";
```

| Error | Code | Description |
|-------|------|-------------|
| BufferOverflowError | BUFFER_OVERFLOW | Buffer capacity exceeded |
| InvalidChannelError | INVALID_CHANNEL | Invalid channel name |
| SecurityError | SECURITY_ERROR | Security violation |

---

## Constants

### Default Buffer Config

```typescript
import { DEFAULT_BUFFER_CONFIG } from "the-base-event";

const DEFAULT_BUFFER_CONFIG = {
  maxSize: 1000,
  ttl: 60000,
  strategy: "fifo" as const,
};
```

### Default SSR Config

```typescript
import { DEFAULT_SSR_CONFIG } from "the-base-event";

const DEFAULT_SSR_CONFIG = {
  enabled: false,
  hydrationDelay: 5000,
  bufferStrategy: "client-only" as const,
  syncMode: "on-hydration" as const,
};
```

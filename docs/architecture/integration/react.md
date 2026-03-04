# React Integration Guide

The React adapter provides hooks for integrating The Base Event with React applications, with full support for React 18's concurrent mode.

## Installation

```bash
npm install the-base-event
```

## Quick Start

```tsx
import { useNotificationChannel } from "the-base-event/react";

function NotificationComponent() {
  const { events, subscribe, emit, clear } = useNotificationChannel<string>({
    channel: "notifications",
    replay: true,
  });

  const handleSend = () => {
    emit("Hello from React!");
  };

  return (
    <div>
      <button onClick={handleSend}>Send Notification</button>
      <button onClick={clear}>Clear</button>
      <ul>
        {events.map((event) => (
          <li key={event.id}>{event.data}</li>
        ))}
      </ul>
    </div>
  );
}
```

## API Reference

### useNotificationChannel

```tsx
const {
  events,
  subscribe,
  emit,
  clear,
  emitter,
} = useNotificationChannel<T>({
  channel: string,
  emitter?: EventEmitter,
  config?: EventEmitterConfig,
  replay?: boolean,
});
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `channel` | `string` | Required | The notification channel to subscribe to |
| `emitter` | `EventEmitter` | `undefined` | Optional shared emitter instance |
| `config` | `EventEmitterConfig` | `undefined` | Configuration for the emitter |
| `replay` | `boolean` | `true` | Whether to replay buffered events |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `events` | `BaseEvent<T>[]` | Array of buffered events |
| `subscribe` | `(callback) => UnsubscribeFunction` | Subscribe to new events |
| `emit` | `(data: T) => void` | Emit an event to the channel |
| `clear` | `() => void` | Clear buffered events |
| `emitter` | `EventEmitter` | The underlying emitter instance |

### useNotificationSubscription

A simpler hook for subscribing to events without managing the event buffer:

```tsx
const lastEvent = useNotificationSubscription<T>({
  channel: string,
  emitter?: EventEmitter,
  onEvent?: (event: BaseEvent<T>) => void,
  replay?: boolean,
});
```

## React 18 Concurrent Mode

The hooks use `useSyncExternalStore` for full React 18 concurrent mode support:

- Works with Suspense
- Supports concurrent rendering
- Proper cleanup on unmount
- SSR-compatible (using server snapshot)

## Shared Emitter

Share a single emitter across multiple components:

```tsx
import { createEventEmitter } from "the-base-event/react";

const sharedEmitter = createEventEmitter({
  buffer: { maxSize: 1000, ttl: 60000 },
});

function ComponentA() {
  const { events, emit } = useNotificationChannel({
    channel: "shared",
    emitter: sharedEmitter,
  });
  // ...
}

function ComponentB() {
  const { events, emit } = useNotificationChannel({
    channel: "shared",
    emitter: sharedEmitter,
  });
  // ...
}
```

## TypeScript

The adapter is fully typed with generics:

```tsx
interface UserNotification {
  id: string;
  message: string;
  timestamp: number;
}

const { events, emit, subscribe } = useNotificationChannel<UserNotification>({
  channel: "user-notifications",
});

subscribe((event) => {
  // event.data is typed as UserNotification
  console.log(event.data.message);
});

emit({
  id: "1",
  message: "Hello!",
  timestamp: Date.now(),
});
```

## Event Replay

By default, new subscribers receive all buffered events:

```tsx
// These events are buffered
emit("event-1");
emit("event-2");

// New subscriber receives both events (replay: true by default)
const { events } = useNotificationChannel({
  channel: "my-channel",
  replay: true, // default
});

// events = [event-1, event-2]
```

Disable replay when you only want new events:

```tsx
const { subscribe } = useNotificationChannel({
  channel: "my-channel",
  replay: false,
});

subscribe((event) => {
  // Only receives events emitted after subscription
});
```

## Cleanup

The hook automatically cleans up subscriptions on unmount:

```tsx
function MyComponent() {
  const { subscribe, emit, clear } = useNotificationChannel({
    channel: "notifications",
  });

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      console.log(event.data);
    });

    return () => {
      unsubscribe(); // Manual cleanup if needed
    };
  }, [subscribe]);

  return <div>...</div>;
}
```

## Error Handling

```tsx
try {
  emit("Hello!");
} catch (error) {
  if (error.message.includes("destroyed")) {
    // Emitter was destroyed, reinitialize
  }
}
```

## Best Practices

1. **Share emitters** for related components to share event state
2. **Use TypeScript generics** for type-safe event data
3. **Set appropriate buffer config** for your use case
4. **Clean up on unmount** - though hooks do this automatically
5. **Disable replay** for high-frequency events to avoid performance issues

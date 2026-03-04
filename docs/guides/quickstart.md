# Quick Start Guide

Get up and running with The Base Event in minutes.

## Installation

```bash
npm install the-base-event
# or
yarn add the-base-event
# or
pnpm add the-base-event
```

## Basic Usage

### Create an Event Emitter

```typescript
import { createEventEmitter } from "the-base-event";

const emitter = createEventEmitter();
```

### Emit Events

```typescript
interface UserEvent {
  userId: string;
  action: string;
}

emitter.emit<UserEvent>("user:login", {
  userId: "user-123",
  action: "login",
});
```

### Subscribe to Events

```typescript
const unsubscribe = emitter.on<UserEvent>("user:login", (event) => {
  console.log("User logged in:", event.data);
});

// Stop listening
unsubscribe();
```

### Subscribe Once

```typescript
emitter.once<UserEvent>("user:login", (event) => {
  console.log("This runs only once:", event.data);
});
```

## Framework Integration

### React

```tsx
import { useNotificationChannel } from "the-base-event/adapters/react";

function Chat() {
  const { subscribe, emit } = useNotificationChannel({
    channel: "chat:messages",
    replay: true,
  });

  useEffect(() => {
    const unsub = subscribe((event) => {
      console.log("New message:", event.data);
    });
    return () => unsub();
  }, [subscribe]);

  const sendMessage = (text: string) => {
    emit({ text, sender: "me", timestamp: Date.now() });
  };
}
```

### Vue

```typescript
import { useEventBus } from "the-base-event/adapters/vue";

function useChat() {
  const { subscribe, emit } = useEventBus();

  const unsubscribe = subscribe("chat:messages", (event) => {
    console.log("New message:", event.data);
  });

  return { unsubscribe };
}
```

### Angular

```typescript
import { Injectable } from "@angular/core";
import { NotificationService } from "the-base-event/adapters/angular";

@Injectable({ providedIn: "root" })
class MyComponent {
  constructor(private notifications: NotificationService) {}

  ngOnInit() {
    this.notifications.on("alert", (event) => {
      console.log("Alert:", event.data);
    });
  }

  sendAlert(message: string) {
    this.notifications.emit("alert", { message });
  }
}
```

### Node.js

```typescript
import { createServerEventEmitter } from "the-base-event/adapters/node";

const emitter = createServerEventEmitter();

emitter.on("job:process", (event) => {
  console.log("Processing job:", event.data);
});

emitter.emit("job:process", { id: "job-1", data: {} });
```

## Event Replay

Events emitted before subscription are automatically replayed:

```typescript
// Emit before subscribing
emitter.emit("notification", { message: "Hello" });

// Subscribe later - receives buffered event
emitter.on("notification", (event) => {
  console.log(event.data.message); // "Hello"
});
```

## Wildcard Patterns

```typescript
// Match single segment
emitter.onPattern("user:*", (event) => {
  console.log(event.channel); // "user:login", "user:logout", etc.
});

// Match multiple segments
emitter.onPattern("**", (event) => {
  console.log(event.channel); // Any channel
});
```

## Buffer Configuration

```typescript
const emitter = createEventEmitter({
  buffer: {
    maxSize: 1000,      // Maximum buffered events
    ttl: 60000,         // Time to live in ms (1 minute)
    strategy: "lru",    // lru, fifo, or priority
  },
});
```

## Middleware

```typescript
const loggingMiddleware: Middleware = async (event, next) => {
  console.log(`[${event.channel}]`, event.data);
  await next();
};

emitter.use(loggingMiddleware);
```

## SSR Support

```typescript
const emitter = createEventEmitter({
  ssr: {
    enabled: true,
    hydrationDelay: 3000,
    bufferStrategy: "client-only",
    syncMode: "on-hydration",
  },
});

// Call after framework hydration
emitter.markHydrated();
```

## TypeScript Support

Full type inference out of the box:

```typescript
interface MyEvent {
  id: string;
  payload: {
    name: string;
    value: number;
  };
}

emitter.on<MyEvent>("my-event", (event) => {
  // event.data.payload.name is typed as string
  // event.data.payload.value is typed as number
});
```

## Next Steps

- [API Reference](../api/reference.md) - Complete API documentation
- [Migration Guide](../migration/guide.md) - Migrate from other libraries
- [Architecture Overview](../architecture/overview.md) - Deep dive into the system

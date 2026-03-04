# Migration Guide

Migrating from other event libraries to The Base Event.

## From mitt

### Overview

mitt is a tiny (200B) event emitter. The Base Event provides similar API with additional features like:
- Event replay
- Buffer strategies
- Middleware support
- SSR support

### Basic Migration

**mitt:**
```typescript
import mitt from "mitt";

const emitter = mitt();

emitter.on("user:login", (data) => {
  console.log("User:", data);
});

emitter.emit("user:login", { userId: "123" });
```

**The Base Event:**
```typescript
import { createEventEmitter } from "the-base-event";

const emitter = createEventEmitter();

emitter.on("user:login", (event) => {
  console.log("User:", event.data); // Note: data is in event.data
});

emitter.emit("user:login", { userId: "123" });
```

### Key Differences

| mitt | The Base Event |
|------|----------------|
| `emitter.on(type, handler)` | `emitter.on(channel, (event) => handler(event.data))` |
| `emitter.emit(type, data)` | `emitter.emit(channel, data)` |
| `emitter.all` | Built-in via `onPattern("**")` |
| No built-in buffering | Event replay by default |

### Using Migration Utility

```typescript
import { migrateFromMitt, type MittEmitter } from "the-base-event/migration/from-mitt";

const mittEmitter: MittEmitter = mitt();

// Migrate with options
const baseEventEmitter = migrateFromMitt(mittEmitter, {
  preserveWildcards: true,  // Preserve wildcard handlers
  replayBuffered: true,      // Replay buffered events
  bufferConfig: {
    maxSize: 500,
    strategy: "lru",
  },
});

// Continue using either emitter
mittEmitter.emit("test", "data");
baseEventEmitter.emit("test", "data");
```

### Creating Compatibility Layer

```typescript
import { createMittCompatLayer } from "the-base-event/migration/from-mitt";

const emitter = createEventEmitter();

// Create mitt-compatible API
const mittCompat = createMittCompatLayer(emitter);

mittCompat.on("test", (data) => {
  console.log(data);
});

mittCompat.emit("test", "hello");
```

---

## From EventEmitter3

### Overview

EventEmitter3 is a high-performance event emitter. The Base Event maintains similar patterns while adding framework features.

### Basic Migration

**EventEmitter3:**
```typescript
import EventEmitter from "eventemitter3";

const emitter = new EventEmitter();

emitter.on("user:login", (userId, data) => {
  console.log(userId, data);
});

emitter.emit("user:login", "123", { name: "John" });
```

**The Base Event:**
```typescript
import { createEventEmitter } from "the-base-event";

const emitter = createEventEmitter();

emitter.on("user:login", (event) => {
  const [userId, data] = event.data as [string, { name: string }];
  console.log(userId, data);
});

emitter.emit("user:login", ["123", { name: "John" }]);
```

### Manual Adapter

```typescript
import { createEventEmitter, type EventCallback, type UnsubscribeFunction } from "classthe-base-event";

 EventEmitter3Adapter {
  private emitter = createEventEmitter();

: (...: string, fn  on(event {
    this.emitter.on(eventargs: unknown[])Event) => {
, (base => void): this      fn(...(baseEvent.data as unknown[]));
    });
    return this;
  }

  once(event: string, fn: (...args: unknown[]) => void): this {
    this.emitter.once(event, (baseEvent) => {
      fn(...(baseEvent.data as unknown[]));
    });
    return this;
  }

  emit(event: string, ...args: unknown[]): this {
    this.emitter.emit(event, args);
    return this;
  }

  off(event: string, fn?: (...args: unknown[]) => void): this {
    if (fn) {
      this.emitter.off(event, ((baseEvent) => {
        fn(...(baseEvent.data as unknown[]));
      }) as EventCallback);
    } else {
      this.emitter.off(event);
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    this.emitter.clear(event);
    return this;
  }

  listenerCount(event: string): number {
    return this.emitter.getBuffered(event).length;
  }
}
```

---

## From Node.js Events

### Overview

Node.js `events` module is built-in. The Base Event provides similar API with cross-platform support.

### Basic Migration

**Node.js events:**
```typescript
import { EventEmitter } from "events";

const emitter = new EventEmitter();

emitter.on("user:login", (user) => {
  console.log("Login:", user);
});

emitter.emit("user:login", { id: "123", name: "John" });
```

**The Base Event:**
```typescript
import { createEventEmitter } from "the-base-event";

const emitter = createEventEmitter();

emitter.on("user:login", (event) => {
  console.log("Login:", event.data);
});

emitter.emit("user:login", { id: "123", name: "John" });
```

### Using the Node.js Adapter

```typescript
import { createServerEventEmitter } from "the-base-event/adapters/node";

const serverEmitter = createServerEventEmitter({
  server: {
    maxListeners: 100,
    timeout: 30000,
  },
});

// Similar to Node.js EventEmitter
serverEmitter.on("request", (event) => {
  console.log("Request:", event.data);
});

serverEmitter.emit("request", { url: "/api/users" });
```

### Migration Utility

```typescript
import { EventEmitter } from "events";
import { createEventEmitter } from "the-base-event";

function migrateNodeEmitter(nodeEmitter: EventEmitter): void {
  const baseEmitter = createEventEmitter();

  // Get all event names
  const events = (nodeEmitter as unknown as { _events: Record<string, unknown> })._events;
  
  for (const eventName of Object.keys(events)) {
    const handlers = Array.isArray(events[eventName])
      ? events[eventName]
      : [events[eventName]];

    for (const handler of handlers) {
      baseEmitter.on(eventName, (event) => {
        (handler as (...args: unknown[]) => void)(event.data);
      });
    }
  }
}
```

---

## From Redux Observables

### Overview

Redux Observable uses RxJS observables. The Base Event provides a simpler push-based alternative.

### Basic Migration

**Redux Observable:**
```typescript
import { createEpicMiddleware } from "redux-observable";
import { of } from "rxjs";
import { map, mergeMap, catchError } from "rxjs/operators";

const epic = action$ =>
  action$.pipe(
    ofType("FETCH_USER"),
    mergeMap(action =>
      of(action.payload).pipe(
        map(user => ({ type: "FETCH_USER_SUCCESS", payload: user })),
        catchError(error => of({ type: "FETCH_USER_ERROR", payload: error }))
      )
    )
  );
```

**The Base Event:**
```typescript
import { createEventEmitter, type Middleware } from "the-base-event";

const fetchUserMiddleware: Middleware<{ type: string; payload?: unknown }> = async (event, next) => {
  if (event.data.type === "FETCH_USER") {
    try {
      const user = await fetchUser(event.data.payload);
      emitter.emit("FETCH_USER_SUCCESS", user);
    } catch (error) {
      emitter.emit("FETCH_USER_ERROR", error);
    }
  }
  await next();
};

const emitter = createEventEmitter();
emitter.use(fetchUserMiddleware);
```

### Epic-like Pattern

```typescript
import { createEventEmitter, type EventCallback, type UnsubscribeFunction } from "the-base-event";

interface Action {
  type: string;
  payload?: unknown;
}

class EpicRunner {
  private epics: Array<(action$: ActionStream) => UnsubscribeFunction> = [];
  private actionEmitter = createEventEmitter<Action>();

  addEpic(epic: (action$: ActionStream) => UnsubscribeFunction): void {
    this.epics.push(epic);
  }

  start(): void {
    for (const epic of this.epics) {
      epic(new ActionStream(this.actionEmitter));
    }
  }

  dispatch(action: Action): void {
    this.actionEmitter.emit(action.type, action);
  }
}

class ActionStream {
  constructor(private emitter: ReturnType<typeof createEventEmitter<Action>>) {}

  ofType<T extends Action["type"]>(...types: T[]): { pipe: (operator: (source: AsyncIterable<Action>) => AsyncIterable<Action>) => { subscribe: (callback: (action: Action) => void) => UnsubscribeFunction } } {
    const filteredEmitter = createEventEmitter<Action>();
    
    const unsub = this.emitter.on((event) => {
      if (types.includes(event.data.type as T)) {
        filteredEmitter.emit(event.data.type, event.data);
      }
    });

    return {
      pipe: (operator) => operator(this.toAsyncIterable(filteredEmitter)),
    };
  }

  private toAsyncIterable<T>(emitter: ReturnType<typeof createEventEmitter<T>>): AsyncIterable<T> {
    return {
      [Symbol.asyncIterator]: () => {
        let buffer: T[] = [];
        let resolver: ((value: IteratorResult<T>) => void) | null = null;
        
        emitter.on<T>((event) => {
          buffer.push(event.data);
          if (resolver) {
            resolver({ value: buffer.shift()!, done: false });
            resolver = null;
          }
        });

        return {
          next: (): Promise<IteratorResult<T>> => {
            if (buffer.length > 0) {
              return Promise.resolve({ value: buffer.shift()!, done: false });
            }
            return new Promise((resolve) => {
              resolver = resolve;
            });
          },
        };
      },
    };
  }
}

// Usage
const runner = new EpicRunner();

runner.addEpic((action$) => {
  const subscription = action$.ofType("FETCH_USER").pipe({
    subscribe: async (source) => {
      for await (const action of source) {
        const user = await fetch(`/api/users/${action.payload}`).then(r => r.json());
        runner.dispatch({ type: "FETCH_USER_SUCCESS", payload: user });
      }
    },
  });
  return () => subscription();
});

runner.start();
runner.dispatch({ type: "FETCH_USER", payload: 123 });
```

---

## Configuration Comparison

| Feature | mitt | EventEmitter3 | Node.js | Redux | The Base Event |
|---------|------|---------------|---------|-------|----------------|
| Wildcards | Yes | No | No | No | Yes |
| Buffering | No | No | No | No | Yes |
| Middleware | No | No | No | Yes | Yes |
| SSR | No | No | No | No | Yes |
| Typing | Basic | Basic | Good | Good | Excellent |
| Bundle | 200B | 1KB | Built-in | 5KB+ | <1.5KB |

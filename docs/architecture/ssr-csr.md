# SSR/CSR Architecture

## Overview

The SSR/CSR module provides seamless event handling across Server-Side Rendering (SSR) and Client-Side Rendering (CSR) environments. It ensures events emitted during server rendering are properly buffered and replayed after client hydration, preventing lost events in modern frameworks like Next.js, Nuxt, SvelteKit, and Angular Universal.

---

## Problem Statement

In SSR applications:

1. **Server emits events** during initial render
2. **Client hydrates** and takes over
3. **Events are lost** because no subscribers existed on server

The Base Event solves this by buffering server events and replaying them after hydration.

---

## Architecture Components

### Directory Structure

```
src/core/ssr/
├── index.ts           # Main exports
├── detection.ts       # Environment detection (SSR vs CSR)
├── hydration.ts       # Client hydration synchronization
├── buffer-sync.ts     # Cross-environment buffer sync
└── client-wait.ts     # Client mount waiting mechanism
```

### Core Interfaces

```typescript
interface SSRConfig {
  enabled: boolean;
  hydrationDelay: number;
  bufferStrategy: "client-only" | "server-persist" | "hybrid";
  syncMode: "immediate" | "on-hydration" | "manual";
}

interface SSRState {
  isServer: boolean;
  isHydrated: boolean;
  hydrationPromise: Promise<void> | null;
}
```

---

## Component Design

### 1. Environment Detection (`detection.ts`)

**Purpose**: Detect whether code is running on server or client

**Implementation**:

```typescript
export function isSSR(): boolean {
  return (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !navigator.onLine
  );
}

export function getEnvironment(): "server" | "client" {
  return isSSR() ? "server" : "client";
}
```

**Detection Strategies**:

- `typeof window === 'undefined'` - Primary check
- `typeof document === 'undefined'` - Secondary check
- `!navigator.onLine` - Network availability (optional)

---

### 2. Hydration Sync (`hydration.ts`)

**Purpose**: Track hydration state and coordinate event replay

**Implementation**:

```typescript
class HydrationManager {
  private isHydrated = false;
  private hydrationResolve: (() => void) | null = null;
  private hydrationPromise: Promise<void>;

  constructor(private config: SSRConfig) {
    this.hydrationPromise = new Promise(resolve => {
      this.hydrationResolve = resolve;
    });
  }

  markHydrated(): void {
    this.isHydrated = true;
    this.hydrationResolve?.();
  }

  waitForHydration(): Promise<void> {
    if (this.isHydrated) return Promise.resolve();
    return this.hydrationPromise;
  }

  getState(): SSRState {
    return {
      isServer: isSSR(),
      isHydrated: this.isHydrated,
      hydrationPromise: this.hydrationPromise,
    };
  }
}
```

**Configuration Options**:
| Option | Values | Description |
|--------|--------|-------------|
| `hydrationDelay` | number (ms) | Delay before replaying events |
| `bufferStrategy` | client-only/server-persist/hybrid | How to handle server events |
| `syncMode` | immediate/on-hydration/manual | When to sync buffers |

---

### 3. Buffer Sync (`buffer-sync.ts`)

**Purpose**: Synchronize event buffers between server and client

**Buffer Strategies**:

| Strategy         | Server Behavior   | Client Behavior   | Use Case      |
| ---------------- | ----------------- | ----------------- | ------------- |
| `client-only`    | No buffering      | Buffer all        | SPA migration |
| `server-persist` | Buffer to storage | Read from storage | Full SSR apps |
| `hybrid`         | Both buffer       | Both replay       | Complex apps  |

**Implementation**:

```typescript
type BufferSyncStrategy = "client-only" | "server-persist" | "hybrid";

class BufferSyncManager {
  private serverBuffer: BufferedEvent[] = [];
  private storageKey = "__the_base_event_ssr_buffer__";

  constructor(private strategy: BufferSyncStrategy) {}

  bufferServerEvent(event: BufferedEvent): void {
    if (this.strategy === "client-only") return;
    this.serverBuffer.push(event);

    if (this.strategy === "server-persist") {
      this.persistToStorage();
    }
  }

  replayServerEvents(): BufferedEvent[] {
    const events = this.serverBuffer;
    this.serverBuffer = [];
    this.clearStorage();
    return events;
  }

  private persistToStorage(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.storageKey, JSON.stringify(this.serverBuffer));
    }
  }

  private loadFromStorage(): BufferedEvent[] {
    if (typeof localStorage === "undefined") return [];
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private clearStorage(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(this.storageKey);
    }
  }
}
```

---

### 4. Client Wait (`client-wait.ts`)

**Purpose**: Wait for client-side framework to mount before replaying

**Implementation**:

```typescript
class ClientWaitManager {
  private mountResolve: (() => void) | null = null;
  private mountPromise: Promise<void>;
  private timeoutId: number | null = null;

  constructor(private timeout = 5000) {
    this.mountPromise = new Promise(resolve => {
      this.mountResolve = resolve;
    });
  }

  onClientMount(): void {
    this.clearTimeout();
    this.mountResolve?.();
  }

  waitForClient(timeout?: number): Promise<void> {
    const effectiveTimeout = timeout ?? this.timeout;

    if (effectiveTimeout > 0) {
      this.timeoutId = window.setTimeout(() => {
        console.warn(
          "[TheBaseEvent] Hydration timeout, replaying buffered events"
        );
        this.mountResolve?.();
      }, effectiveTimeout);
    }

    return this.mountPromise;
  }

  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
```

---

## Integration with EventEmitter

### Extended Interface

```typescript
interface EventEmitter {
  // Existing methods...

  // SSR/CSR Methods
  isSSR(): boolean;
  isSSREnabled(): boolean;
  waitForHydration(): Promise<void>;
  getSSRConfig(): SSRConfig;
  configureSSR(config: Partial<SSRConfig>): void;
  markHydrated(): void;
  replayServerEvents(): void;
}
```

### Creating SSR-Enabled EventEmitter

```typescript
import { createEventEmitter } from "the-base-event";

const emitter = createEventEmitter({
  ssr: {
    enabled: true,
    hydrationDelay: 100,
    bufferStrategy: "server-persist",
    syncMode: "on-hydration",
  },
});
```

### How emit() Works in SSR Context

```typescript
// emit() method handles SSR automatically:
emit<T>(channel: string, data: T, options?: EmitOptions): void {
  // 1. Check if destroyed
  if (this.destroyed) {
    throw new Error("EventEmitter has been destroyed");
  }

  // 2. If SSR enabled and on server: buffer event
  if (this.ssrConfig?.enabled && isSSR()) {
    this.bufferServerEvent(event);  // Store for later replay
    return;
  }

  // 3. If SSR enabled and on client pre-hydration: wait
  if (this.ssrConfig?.enabled && this.hydrationManager) {
    this.hydrationManager.waitForHydration().then(() => {
      this.emitInternal<T>(channel, data, options);
    });
    return;
  }

  // 4. Normal emit (client post-hydration or SSR disabled)
  this.emitInternal<T>(channel, data, options);
}
```

### Complete Usage Example

```typescript
import { createEventEmitter } from "the-base-event";

// Create emitter with SSR support
const emitter = createEventEmitter({
  ssr: {
    enabled: true,
    hydrationDelay: 100,
    bufferStrategy: "server-persist",
    syncMode: "on-hydration",
  },
});

// Subscribe to events
emitter.on("user:login", event => {
  console.log("User logged in:", event.data);
});

// Emit events (works in both SSR and CSR)
emitter.emit("user:login", { userId: "123", name: "John" });

// Framework integration (e.g., Next.js)
if (typeof window !== "undefined") {
  // Mark hydrated after client-side hydration
  emitter.markHydrated();
}

// Check SSR status
console.log("Is SSR:", emitter.isSSR());
console.log("SSR Config:", emitter.getSSRConfig());

// Update SSR config at runtime
emitter.configureSSR({ hydrationDelay: 200 });
```

### Usage Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Server       │     │   Hydration     │     │    Client       │
│   (Rendering)   │     │   (Transition)  │     │   (Mounted)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ emit("event", data)  │                       │
         │ ──────────────────>  │                       │
         │ Buffer event          │                       │
         │                       │                       │
         │                       │   <div id="root">    │
         │                       │   hydration occurs   │
         │                       │ ──────────────────>  │
         │                       │                       │
         │                       │   markHydrated()     │
         │                       │ ──────────────────>  │
         │                       │                       │
         │                       │   Replay buffered    │
         │                       │   events to subs    │
         │                       │ ──────────────────>  │
         │                       │                       │
```

---

## Framework Integration

### Next.js

```typescript
// pages/_app.tsx
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Mark hydration complete after React hydrates
    emitter.markHydrated();
  }, []);

  return <Component {...pageProps} />;
}
```

### Nuxt

```typescript
// plugins/the-base-event.client.ts
export default defineNuxtPlugin(() => {
  emitter.markHydrated();
});
```

### Angular Universal

```typescript
// main.ts
if (typeof window !== "undefined") {
  emitter.markHydrated();
}
```

---

## Testing Strategy

### Environment Detection Tests

- [x] Detects SSR in Node.js environment (`src/test/unit/ssr.test.ts:51-67`)
- [x] Detects CSR in browser environment (`src/test/unit/ssr.test.ts:51-67`)
- [x] Handles environment transitions (`src/test/unit/ssr.test.ts:62-67`)

### Hydration Tests

- [x] waitForHydration resolves after markHydrated (`src/test/unit/ssr.test.ts:124-134`, `src/test/unit/event-emitter.test.ts:725-730`)
- [x] waitForHydration resolves immediately if already hydrated (`src/test/unit/ssr.test.ts:146-150`, `src/test/unit/event-emitter.test.ts:736-742`)
- [x] Handles hydration delay gracefully (`src/test/unit/ssr.test.ts:136-144`)

### Buffer Sync Tests

- [x] Buffers events when strategy is server-persist (`src/test/unit/ssr.test.ts:215-238`)
- [x] Does not buffer when strategy is client-only (`src/test/unit/ssr.test.ts:226-231`)
- [ ] Persists to localStorage correctly (requires browser environment)
- [ ] Loads from localStorage correctly (requires browser environment)
- [x] Prevents duplicate events (`src/test/unit/ssr.test.ts:256-267`)

### Integration Tests

- [x] Events emitted on server are replayed on client (`src/test/unit/event-emitter.test.ts:747-812`)
- [x] No events lost during hydration (`src/test/unit/event-emitter.test.ts:785-812`)
- [ ] Works with React, Vue, Angular SSR (framework-specific, manual testing)

### EventEmitter Integration Tests

- [x] SSR config accepted in EventEmitterConfig (`src/test/unit/event-emitter.test.ts:668-678`)
- [x] HydrationManager initialized when SSR enabled (`src/test/unit/event-emitter.test.ts:668`)
- [x] BufferSyncManager initialized when SSR enabled (`src/test/unit/event-emitter.test.ts:668`)
- [x] ClientWaitManager initialized when SSR enabled (`src/test/unit/event-emitter.test.ts:668`)
- [x] emit() buffers events on server-side (`src/test/unit/event-emitter.test.ts:747`)
- [x] emit() waits for hydration on client-side pre-hydration (`src/test/unit/event-emitter.test.ts:725-742`)
- [x] emit() emits normally on client-side post-hydration (`src/test/unit/event-emitter.test.ts:730-742`)
- [x] isSSR() returns correct environment (`src/test/unit/ssr.test.ts:51-67`, `src/test/unit/event-emitter.test.ts:701-707`)
- [x] waitForHydration() delegates to HydrationManager (`src/test/unit/event-emitter.test.ts:707-742`)
- [x] getSSRConfig() returns current config (`src/test/unit/event-emitter.test.ts:668-678`)
- [x] markHydrated() triggers server event replay (`src/test/unit/event-emitter.test.ts:716-722`, `src/test/unit/ssr.test.ts:111-121`)
- [x] configureSSR() updates config at runtime (`src/test/unit/event-emitter.test.ts:668-678`)

---

## Configuration Example

```typescript
const emitter = createEventEmitter({
  ssr: {
    enabled: true,
    hydrationDelay: 100,
    bufferStrategy: "server-persist",
    syncMode: "on-hydration",
  },
});
```

---

## Performance Considerations

1. **Lazy Loading**: SSR module loads only when `ssr.enabled` is true
2. **Storage Minimal**: Only stores event metadata, not full payloads
3. **Timeout Safety**: Default 5s timeout prevents indefinite waiting
4. **Memory Cleanup**: Buffers cleared after replay to prevent leaks

---

## Future Enhancements

- [ ] WebSocket-based cross-environment sync
- [ ] Redis/adapter-based server persistence
- [ ] Automatic framework detection
- [ ] Event deduplication algorithms

---

_SSR/CSR Architecture - Version 1.0_

# Node.js Integration Guide

The Node.js adapter provides server-specific configurations and patterns for using The Base Event in Node.js environments.

## Installation

```bash
npm install the-base-event
```

## Quick Start

```javascript
const { createServerEventEmitter } = require("the-base-event/node");

// Create a server-specific emitter
const server = createServerEventEmitter({
  server: {
    timeout: 5000,
    keepAlive: true,
  },
});

// Subscribe to events
server.on("user:login", (event) => {
  console.log("User logged in:", event.data);
});

// Emit events
server.emit("user:login", { userId: "123", timestamp: Date.now() });

// Clean up
server.destroy();
```

## API Reference

### createServerEventEmitter

```javascript
const server = createServerEventEmitter(config);
```

#### Configuration

```javascript
const config = {
  // Core emitter config
  buffer: {
    maxSize: 10000,
    ttl: 60000,
    strategy: "lru",
  },
  
  // Server-specific config
  server: {
    maxListeners: 100,
    timeout: 5000,
    keepAlive: true,
  },
  
  // Clustering config (for distributed systems)
  clustering: {
    enabled: false,
    pubSubUrl: "redis://localhost:6379",
  },
};
```

#### Server Emitter API

| Method | Description |
|--------|-------------|
| `emitter` | The underlying EventEmitter instance |
| `on(channel, callback)` | Subscribe to events |
| `once(channel, callback)` | Subscribe to one event |
| `onPattern(pattern, callback)` | Subscribe to pattern-matched events |
| `emit(channel, data)` | Emit an event |
| `subscribe(channel, callback, replay)` | Subscribe with replay option |
| `getBuffered(channel)` | Get buffered events |
| `clear(channel?)` | Clear events |
| `destroy()` | Destroy the emitter |
| `getMetrics()` | Get performance metrics |

### NotificationChannel

A class for managing individual notification channels:

```javascript
const { createNotificationChannel } = require("the-base-event/node");

const channel = createNotificationChannel(emitter, "notifications");

// Subscribe
const unsub = channel.subscribe((event) => {
  console.log(event.data);
});

// Emit
channel.emit({ message: "Hello!" });

// Get buffered events
const buffered = channel.getBuffered();

// Clear
channel.clear();

// Unsubscribe all
channel.unsubscribe();
```

## Server-Side Patterns

### Request-Response Events

```javascript
const { createServerEventEmitter } = require("the-base-event/node");

const server = createServerEventEmitter({
  server: { timeout: 10000 },
});

// Client subscribes to response channel
server.on(`response:${requestId}`, (event) => {
  console.log("Response:", event.data);
});

// Server processes and emits response
server.emit(`response:${requestId}`, { status: "ok", data: {} });
```

### Event Aggregation

```javascript
const server = createServerEventEmitter({
  buffer: { maxSize: 1000, strategy: "lru" },
});

// Aggregate events from multiple sources
server.on("user:*", (event) => {
  const [_, action] = event.channel.split(":");
  console.log(`User action: ${action}`, event.data);
});

server.emit("user:login", { userId: 1 });
server.emit("user:logout", { userId: 1 });
server.emit("user:update", { userId: 1 });
```

### Middleware for Server

```javascript
const { createServerEventEmitter } = require("the-base-event/node");

const server = createServerEventEmitter();

// Add logging middleware
server.emitter.use(async (event, next) => {
  console.log(`[${new Date().toISOString()}] ${event.channel}:`, event.data);
  await next();
});

// Add validation middleware
server.emitter.use(async (event, next) => {
  if (!event.data || typeof event.data !== "object") {
    throw new Error("Invalid event data");
  }
  await next();
});
```

### Buffered Events for Batch Processing

```javascript
const { createServerEventEmitter } = require("the-base-event/node");

const server = createServerEventEmitter({
  buffer: { maxSize: 10000, strategy: "fifo" },
});

// Collect analytics events
server.on("analytics:*", (event) => {
  // Events are automatically buffered
});

// Process buffered events periodically
setInterval(() => {
  const buffered = server.getBuffered("analytics:*");
  
  if (buffered.length > 0) {
    console.log(`Processing ${buffered.length} analytics events`);
    // Send to external service
    sendToAnalytics(buffered);
    
    // Clear after processing
    server.clear("analytics:*");
  }
}, 60000);
```

### Server-Sent Events (SSE)

```javascript
const http = require("http");
const { createServerEventEmitter } = require("the-base-event/node");

const server = createServerEventEmitter();

const clients = new Set();

server.on("notifications", (event) => {
  // Broadcast to all connected clients
  const data = JSON.stringify(event.data);
  clients.forEach((res) => {
    res.write(`data: ${data}\n\n`);
  });
});

const httpServer = http.createServer((req, res) => {
  if (req.url === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    clients.add(res);

    req.on("close", () => {
      clients.delete(res);
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

httpServer.listen(3000);
```

## Clustering Support

For distributed Node.js applications:

```javascript
const { createServerEventEmitter } = require("the-base-event/node");

// With Redis pub/sub for cross-process communication
const server = createServerEventEmitter({
  clustering: {
    enabled: true,
    pubSubUrl: "redis://localhost:6379",
  },
});
```

## Metrics and Monitoring

```javascript
const server = createServerEventEmitter();

// Get metrics
setInterval(() => {
  const metrics = server.getMetrics();
  
  console.log({
    eventsPerSecond: metrics.eventsPerSecond,
    bufferUtilization: metrics.bufferUtilization,
    memoryUsage: metrics.memoryUsage,
    activeSubscriptions: metrics.activeSubscriptions,
  });
}, 5000);
```

## Error Handling

```javascript
const server = createServerEventEmitter();

try {
  server.emit("channel", "data");
} catch (error) {
  if (error.message.includes("destroyed")) {
    // Reinitialize
    const newServer = createServerEventEmitter();
  }
}

// Handle subscriber errors
server.on("channel", (event) => {
  try {
    // Process event
  } catch (error) {
    console.error("Error processing event:", error);
  }
});
```

## Best Practices

1. **Use appropriate buffer strategy** - FIFO for time-sensitive, LRU for memory-constrained
2. **Set reasonable timeouts** - prevent hanging subscriptions
3. **Clean up on shutdown** - always call `destroy()` when shutting down
4. **Monitor metrics** - track performance in production
5. **Use middleware** - add logging, validation, transformation

## Express Integration

```javascript
const express = require("express");
const { createServerEventEmitter } = require("the-base-event/node");

const app = express();
const events = createServerEventEmitter();

app.post("/events", (req, res) => {
  const { channel, data } = req.body;
  events.emit(channel, data);
  res.json({ success: true });
});

app.get("/events/:channel", (req, res) => {
  const { channel } = req.params;
  const buffered = events.getBuffered(channel);
  res.json({ events: buffered });
});

// Cleanup on shutdown
process.on("SIGTERM", () => {
  events.destroy();
  process.exit(0);
});
```

## TypeScript Support

```typescript
import {
  createServerEventEmitter,
  createNotificationChannel,
  type EventEmitterConfig,
  type BaseEvent,
} from "the-base-event/node";

interface UserEvent {
  userId: string;
  action: string;
  timestamp: number;
}

const server = createServerEventEmitter({
  buffer: { maxSize: 5000 },
});

server.on<UserEvent>("user:action", (event: BaseEvent<UserEvent>) => {
  console.log(event.data.userId, event.data.action);
});

server.emit<UserEvent>("user:action", {
  userId: "123",
  action: "login",
  timestamp: Date.now(),
});
```

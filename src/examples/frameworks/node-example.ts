/**
 * Node.js example for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  createEventEmitter,
  createServerEventEmitter,
  NotificationChannel,
  createNotificationChannel,
  type EventEmitter,
  type EventCallback,
  type UnsubscribeFunction,
  type Middleware,
  type BaseEvent,
} from "@adapters/node";

interface LogEntry {
  level: "info" | "warn" | "error";
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

interface JobEvent {
  id: string;
  type: string;
  payload: unknown;
  priority: "high" | "medium" | "low";
}

const loggingMiddleware: Middleware<LogEntry> = async (event, next) => {
  console.log(`[${event.data.level.toUpperCase()}] ${event.data.message}`);
  await next();
};

const errorHandlingMiddleware: Middleware = async (event, next) => {
  try {
    await next();
  } catch (error) {
    console.error("Error processing event:", error);
  }
};

const eventEmitter = createEventEmitter({
  buffer: {
    maxSize: 10000,
    ttl: 60000,
    strategy: "fifo",
  },
  middleware: [loggingMiddleware, errorHandlingMiddleware],
});

eventEmitter.on<LogEntry>("log", event => {
  console.log("Log event received:", event.data);
});

eventEmitter.emit<LogEntry>("log", {
  level: "info",
  message: "Application started",
  timestamp: Date.now(),
});

const serverEmitter = createServerEventEmitter({
  server: {
    maxListeners: 100,
    timeout: 30000,
    keepAlive: true,
  },
  buffer: {
    maxSize: 5000,
    strategy: "priority",
  },
});

serverEmitter.on<JobEvent>("job:process", event => {
  console.log("Processing job:", event.data.id);
});

serverEmitter.once<JobEvent>("job:start", event => {
  console.log("Job started:", event.data.id);
});

serverEmitter.emit<JobEvent>("job:start", {
  id: "job-001",
  type: "data-processing",
  payload: { input: "/data/file.csv" },
  priority: "high",
});

serverEmitter.emit<JobEvent>("job:process", {
  id: "job-002",
  type: "email",
  payload: { to: "user@example.com", subject: "Hello" },
  priority: "medium",
});

const channel = createNotificationChannel<JobEvent>(
  serverEmitter.emitter,
  "notifications"
);

channel.subscribe(event => {
  console.log("Channel notification:", event.data);
});

channel.emit({
  id: "notif-001",
  type: "push",
  payload: { title: "New message" },
  priority: "low",
});

const buffered = channel.getBuffered();
console.log("Buffered events:", buffered.length);

const metrics = serverEmitter.getMetrics();
console.log("Metrics:", metrics);

const cleanupMiddleware: Middleware = async (event, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  if (duration > 100) {
    console.warn(`Slow event processing: ${event.channel} took ${duration}ms`);
  }
};

eventEmitter.use(cleanupMiddleware);

eventEmitter.onPattern("job:*", event => {
  console.log("Job pattern matched:", event.channel);
});

eventEmitter.onPattern("*.error", event => {
  console.log("Error event:", event.data);
});

function createEventBus(): {
  emit: <T>(channel: string, data: T) => void;
  subscribe: <T>(
    channel: string,
    callback: EventCallback<T>
  ) => UnsubscribeFunction;
  unsubscribe: (channel: string) => void;
  getBuffered: <T>(channel: string) => BaseEvent<T>[];
  destroy: () => void;
} {
  const emitter = createEventEmitter();

  return {
    emit: <T>(channel: string, data: T) => emitter.emit<T>(channel, data),
    subscribe: <T>(channel: string, callback: EventCallback<T>) =>
      emitter.on<T>(channel, callback),
    unsubscribe: (channel: string) => emitter.off(channel),
    getBuffered: <T>(channel: string) =>
      emitter.getBuffered(channel) as BaseEvent<T>[],
    destroy: () => emitter.destroy(),
  };
}

const eventBus = createEventBus();

eventBus.subscribe<LogEntry>("logs", event => {
  console.log("Bus log:", event.data);
});

eventBus.emit<LogEntry>("logs", {
  level: "info",
  message: "Event bus message",
  timestamp: Date.now(),
});

setInterval(() => {
  const currentMetrics = serverEmitter.getMetrics();
  console.log(
    `Events/sec: ${currentMetrics.eventsPerSecond}, ` +
      `Active subs: ${currentMetrics.activeSubscriptions}, ` +
      `Buffer util: ${(currentMetrics.bufferUtilization * 100).toFixed(1)}%`
  );
}, 10000);

process.on("SIGTERM", () => {
  serverEmitter.destroy();
  channel.unsubscribe();
  eventBus.destroy();
  console.log("Server shutdown complete");
});

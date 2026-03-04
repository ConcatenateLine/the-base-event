/**
 * Node.js Adapter Tests
 * Tests for Node.js server-specific functionality
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  createEventEmitter,
  createServerEventEmitter,
  createNotificationChannel,
  NotificationChannel,
  ServerEventEmitter,
} from "../../adapters/node/index";
import { EventEmitter } from "../../core";
import { waitForAsync, createSpyCallback } from "../setup";

describe("Node.js Adapter - createServerEventEmitter", () => {
  let serverEmitter: ReturnType<typeof createServerEventEmitter>;

  beforeEach(() => {
    serverEmitter = createServerEventEmitter();
  });

  afterEach(() => {
    serverEmitter.destroy();
  });

  describe("basic usage", () => {
    it("should subscribe to channel and receive events", async () => {
      const callback = createSpyCallback<string>();
      serverEmitter.on<string>("test-channel", callback);

      serverEmitter.emit<string>("test-channel", "hello");

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe("hello");
      expect(callback.mock.calls[0][0].channel).toBe("test-channel");
    });

    it("should emit events to subscribers", async () => {
      const callback = createSpyCallback<{ message: string }>();
      serverEmitter.on<{ message: string }>("test-channel", callback);

      serverEmitter.emit<{ message: string }>("test-channel", {
        message: "test",
      });

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toEqual({ message: "test" });
    });
  });

  describe("subscribe method with replay", () => {
    it("should replay buffered events when replay is true", async () => {
      serverEmitter.emit<string>("test-channel", "event-1");
      serverEmitter.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      const callback = createSpyCallback<string>();
      serverEmitter.subscribe<string>("test-channel", callback, true);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[0][0].data).toBe("event-1");
      expect(callback.mock.calls[1][0].data).toBe("event-2");
    });

    it("should not replay when replay is false", async () => {
      serverEmitter.emit<string>("test-channel", "event-1");
      serverEmitter.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      const callback = createSpyCallback<string>();
      serverEmitter.subscribe<string>("test-channel", callback, false);

      expect(callback).toHaveBeenCalledTimes(0);

      serverEmitter.emit<string>("test-channel", "new-event");

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe("new-event");
    });

    it("should default to replay true", async () => {
      serverEmitter.emit<string>("test-channel", "event-1");

      await waitForAsync(50);

      const callback = createSpyCallback<string>();
      serverEmitter.subscribe<string>("test-channel", callback);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("once subscriptions", () => {
    it("should handle once subscriptions", async () => {
      const callback = createSpyCallback<string>();
      serverEmitter.once<string>("test-channel", callback);

      serverEmitter.emit<string>("test-channel", "first");
      serverEmitter.emit<string>("test-channel", "second");

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe("first");
    });
  });

  describe("getBuffered", () => {
    it("should return buffered events", async () => {
      serverEmitter.emit<string>("test-channel", "event-1");
      serverEmitter.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      const buffered = serverEmitter.getBuffered<string>("test-channel");
      expect(buffered.length).toBe(2);
      expect(buffered[0].data).toBe("event-1");
      expect(buffered[1].data).toBe("event-2");
    });
  });

  describe("clear functionality", () => {
    it("should clear channel events", async () => {
      serverEmitter.emit<string>("test-channel", "event-1");
      serverEmitter.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      serverEmitter.clear("test-channel");

      const buffered = serverEmitter.getBuffered<string>("test-channel");
      expect(buffered.length).toBe(0);
    });

    it("should clear all channels when no channel specified", async () => {
      serverEmitter.emit<string>("channel-1", "event-1");
      serverEmitter.emit<string>("channel-2", "event-2");

      await waitForAsync(50);

      serverEmitter.clear();

      expect(serverEmitter.getBuffered<string>("channel-1").length).toBe(0);
      expect(serverEmitter.getBuffered<string>("channel-2").length).toBe(0);
    });
  });

  describe("metrics", () => {
    it("should provide metrics", () => {
      const metrics = serverEmitter.getMetrics();

      expect(metrics).toHaveProperty("eventsPerSecond");
      expect(metrics).toHaveProperty("bufferUtilization");
      expect(metrics).toHaveProperty("memoryUsage");
      expect(metrics).toHaveProperty("activeSubscriptions");
      expect(metrics).toHaveProperty("middlewareLatency");
    });

    it("should update metrics after emitting events", async () => {
      serverEmitter.emit<string>("test-channel", "event-1");

      await waitForAsync(50);

      const metrics = serverEmitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(0);
    });
  });

  describe("destroy", () => {
    it("should destroy emitter", () => {
      const callback = createSpyCallback<string>();
      serverEmitter.on<string>("test-channel", callback);

      serverEmitter.destroy();

      expect(() => {
        serverEmitter.emit<string>("test-channel", "after-destroy");
      }).toThrow();
    });
  });

  describe("ServerEventEmitter interface", () => {
    it("should have all required methods", () => {
      expect(typeof serverEmitter.on).toBe("function");
      expect(typeof serverEmitter.once).toBe("function");
      expect(typeof serverEmitter.onPattern).toBe("function");
      expect(typeof serverEmitter.emit).toBe("function");
      expect(typeof serverEmitter.subscribe).toBe("function");
      expect(typeof serverEmitter.getBuffered).toBe("function");
      expect(typeof serverEmitter.clear).toBe("function");
      expect(typeof serverEmitter.destroy).toBe("function");
      expect(typeof serverEmitter.getMetrics).toBe("function");
    });
  });
});

describe("Node.js Adapter - NotificationChannel", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = createEventEmitter();
  });

  afterEach(() => {
    emitter.destroy();
  });

  describe("basic usage", () => {
    it("should create a notification channel", () => {
      const channel = createNotificationChannel<string>(
        emitter,
        "test-channel"
      );

      expect(channel).toBeInstanceOf(NotificationChannel);
    });

    it("should subscribe and receive events", async () => {
      const channel = createNotificationChannel<string>(
        emitter,
        "test-channel"
      );

      const callback = createSpyCallback<string>();
      channel.subscribe(callback);

      channel.emit("hello");

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe("hello");
    });
  });

  describe("subscribe with replay", () => {
    beforeEach(() => {
      emitter.clear();
    });

    it("should replay buffered events when replay is true", async () => {
      emitter.emit<string>("test-channel", "event-1");
      emitter.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      const channel = createNotificationChannel<string>(
        emitter,
        "test-channel"
      );

      const callback = createSpyCallback<string>();
      channel.subscribe(callback, true);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should not replay when replay is false", async () => {
      emitter.emit<string>("test-channel", "event-1");

      await waitForAsync(50);

      const channel = createNotificationChannel<string>(
        emitter,
        "test-channel"
      );

      const callback = createSpyCallback<string>();
      channel.subscribe(callback, false);

      expect(callback).toHaveBeenCalledTimes(0);
    });
  });

  describe("once subscriptions", () => {
    it("should handle once subscriptions", async () => {
      const channel = createNotificationChannel<string>(
        emitter,
        "test-channel"
      );

      const callback = createSpyCallback<string>();
      channel.once(callback);

      channel.emit("first");
      channel.emit("second");

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe("first");
    });
  });

  describe("getBuffered", () => {
    it("should return buffered events", async () => {
      emitter.emit<string>("test-channel", "event-1");
      emitter.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      const channel = createNotificationChannel<string>(
        emitter,
        "test-channel"
      );
      const buffered = channel.getBuffered();

      expect(buffered.length).toBe(2);
    });
  });

  describe("clear", () => {
    it("should clear channel events", async () => {
      emitter.emit<string>("test-channel", "event-1");
      emitter.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      const channel = createNotificationChannel<string>(
        emitter,
        "test-channel"
      );
      channel.clear();

      const buffered = channel.getBuffered();
      expect(buffered.length).toBe(0);
    });
  });

  describe("unsubscribe", () => {
    it("should unsubscribe all subscriptions", async () => {
      const channel = createNotificationChannel<string>(
        emitter,
        "test-channel"
      );

      const callback = createSpyCallback<string>();
      channel.subscribe(callback);

      channel.emit("before-unsubscribe");

      await waitForAsync(50);
      expect(callback).toHaveBeenCalledTimes(1);

      channel.unsubscribe();

      channel.emit("after-unsubscribe");

      await waitForAsync(50);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple subscriptions", async () => {
      const channel = createNotificationChannel<string>(
        emitter,
        "test-channel"
      );

      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      channel.subscribe(callback1);
      channel.subscribe(callback2);

      channel.emit("hello");

      await waitForAsync(50);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      channel.unsubscribe();

      channel.emit("after-unsubscribe");

      await waitForAsync(50);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe("NotificationChannel interface", () => {
    it("should have all required methods", () => {
      const channel = createNotificationChannel<string>(
        emitter,
        "test-channel"
      );

      expect(typeof channel.subscribe).toBe("function");
      expect(typeof channel.once).toBe("function");
      expect(typeof channel.emit).toBe("function");
      expect(typeof channel.getBuffered).toBe("function");
      expect(typeof channel.clear).toBe("function");
      expect(typeof channel.unsubscribe).toBe("function");
    });
  });
});

describe("Node.js Adapter - createEventEmitter", () => {
  it("should create an EventEmitter instance", () => {
    const emitter = createEventEmitter();

    expect(emitter).toBeInstanceOf(EventEmitter);
    emitter.destroy();
  });

  it("should accept configuration options", () => {
    const emitter = createEventEmitter({
      buffer: {
        maxSize: 500,
        ttl: 60000,
      },
    });

    expect(emitter).toBeInstanceOf(EventEmitter);
    emitter.destroy();
  });
});

describe("Node.js Adapter - Server Configuration", () => {
  it("should accept server-specific config", () => {
    const serverEmitter = createServerEventEmitter({
      server: {
        maxListeners: 100,
        timeout: 5000,
        keepAlive: true,
      },
    });

    expect(serverEmitter.emitter).toBeDefined();
    serverEmitter.destroy();
  });

  it("should expose underlying emitter", () => {
    const serverEmitter = createServerEventEmitter();

    expect(serverEmitter.emitter).toBeInstanceOf(EventEmitter);
    serverEmitter.destroy();
  });
});

describe("Node.js Adapter - Default Export", () => {
  it("should have default export with required functions", () => {
    const nodeAdapter = require("../../adapters/node");

    expect(nodeAdapter.default).toBeDefined();
    expect(nodeAdapter.default.createEventEmitter).toBeDefined();
    expect(nodeAdapter.default.createServerEventEmitter).toBeDefined();
    expect(nodeAdapter.default.createNotificationChannel).toBeDefined();
    expect(nodeAdapter.default.EventEmitter).toBeDefined();
  });
});

describe("Node.js Adapter - Type Exports", () => {
  it("should accept server config", () => {
    const { createServerEventEmitter } = require("../../adapters/node/index");

    const serverEmitter = createServerEventEmitter({
      server: {
        maxListeners: 100,
        timeout: 5000,
        keepAlive: true,
      },
    });

    expect(serverEmitter.emitter).toBeDefined();
    serverEmitter.destroy();
  });
});

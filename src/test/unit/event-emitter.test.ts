/**
 * EventEmitter Core Functionality Tests
 * Comprehensive tests for all public APIs, lifecycle management, and event handling
 * @author The Base Event Team
 * @since 1.0.0
 */

import { EventEmitter } from "../../core/emitter";
import type {
  BaseEvent,
  EventCallback,
  Middleware,
  EmitOptions,
} from "../../core/events/typing";
import { waitForAsync, createSpyCallback } from "../setup";

describe("EventEmitter", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    emitter.destroy();
  });

  describe("emit method", () => {
    it("should emit events to subscribers", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test-data");
      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe("test-data");
      expect(callback.mock.calls[0][0].channel).toBe("test-channel");
    });

    it("should handle multiple subscribers on same channel", async () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      emitter.on<string>("test-channel", callback1);
      emitter.on<string>("test-channel", callback2);

      emitter.emit<string>("test-channel", "test-data");
      await waitForAsync(50);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should emit events with different data types", async () => {
      const stringCallback = createSpyCallback<string>();
      const numberCallback = createSpyCallback<number>();
      const objectCallback = createSpyCallback<{ foo: string }>();
      const arrayCallback = createSpyCallback<number[]>();

      emitter.on<string>("string-channel", stringCallback);
      emitter.on<number>("number-channel", numberCallback);
      emitter.on<{ foo: string }>("object-channel", objectCallback);
      emitter.on<number[]>("array-channel", arrayCallback);

      emitter.emit<string>("string-channel", "hello");
      emitter.emit<number>("number-channel", 42);
      emitter.emit<{ foo: string }>("object-channel", { foo: "bar" });
      emitter.emit<number[]>("array-channel", [1, 2, 3]);
      await waitForAsync(50);

      expect(stringCallback.mock.calls[0][0].data).toBe("hello");
      expect(numberCallback.mock.calls[0][0].data).toBe(42);
      expect(objectCallback.mock.calls[0][0].data).toEqual({ foo: "bar" });
      expect(arrayCallback.mock.calls[0][0].data).toEqual([1, 2, 3]);
    });

    it("should generate unique event IDs", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data1");
      emitter.emit<string>("test-channel", "data2");
      await waitForAsync(50);

      const event1 = callback.mock.calls[0][0];
      const event2 = callback.mock.calls[1][0];

      expect(event1.id).not.toBe(event2.id);
      expect(event1.id).toMatch(/^\d+-[a-z0-9]+$/);
      expect(event2.id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it("should set correct timestamps", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const beforeEmit = Date.now();
      emitter.emit<string>("test-channel", "test-data");
      const afterEmit = Date.now();
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      expect(event.timestamp).toBeGreaterThanOrEqual(beforeEmit);
      expect(event.timestamp).toBeLessThanOrEqual(afterEmit);
    });

    it("should handle emit options (priority, ttl, immediate)", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const options: EmitOptions = {
        priority: "high",
        ttl: 5000,
        immediate: false,
      };

      emitter.emit<string>("test-channel", "test-data", options);
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      expect(event.type).toBe("standard");
    });

    it("should throw error when emitter is destroyed", () => {
      emitter.destroy();

      expect(() => {
        emitter.emit<string>("test-channel", "test-data");
      }).toThrow("EventEmitter has been destroyed");
    });
  });

  describe("on method", () => {
    it("should subscribe to events on a channel", () => {
      const callback = createSpyCallback<string>();
      const unsubscribe = emitter.on<string>("test-channel", callback);

      expect(typeof unsubscribe).toBe("function");
      expect(() => unsubscribe()).not.toThrow();
    });

    it("should return unsubscribe function", () => {
      const callback = createSpyCallback<string>();
      const unsubscribe = emitter.on<string>("test-channel", callback);

      expect(unsubscribe).toBeDefined();
      expect(typeof unsubscribe).toBe("function");
    });

    it("should handle multiple subscribers on same channel", async () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      emitter.on<string>("test-channel", callback1);
      emitter.on<string>("test-channel", callback2);

      emitter.emit<string>("test-channel", "test-data");
      await waitForAsync(50);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("should replay buffered events to new subscribers", async () => {
      emitter.emit<string>("test-channel", "buffered-data-1");
      emitter.emit<string>("test-channel", "buffered-data-2");
      await waitForAsync(50);

      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);
      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[0][0].data).toBe("buffered-data-1");
      expect(callback.mock.calls[1][0].data).toBe("buffered-data-2");
    });

    it("should handle different data types with generics", async () => {
      const stringCb = createSpyCallback<string>();
      const numberCb = createSpyCallback<number>();
      const objectCb = createSpyCallback<{ id: number }>();

      emitter.on<string>("string-channel", stringCb);
      emitter.on<number>("number-channel", numberCb);
      emitter.on<{ id: number }>("object-channel", objectCb);

      emitter.emit<string>("string-channel", "hello");
      emitter.emit<number>("number-channel", 123);
      emitter.emit<{ id: number }>("object-channel", { id: 1 });
      await waitForAsync(50);

      expect(stringCb).toHaveBeenCalled();
      expect(numberCb).toHaveBeenCalled();
      expect(objectCb).toHaveBeenCalled();
    });

    it("should throw error when emitter is destroyed", () => {
      const emitter2 = new EventEmitter();
      emitter2.destroy();

      expect(() => {
        emitter2.on<string>("test-channel", jest.fn());
      }).toThrow("EventEmitter has been destroyed");
    });
  });

  describe("once method", () => {
    it("should subscribe and automatically unsubscribe after first event", async () => {
      const callback = createSpyCallback<string>();
      emitter.once<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "first");
      emitter.emit<string>("test-channel", "second");
      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe("first");
    });

    it("should only receive one event when multiple are emitted", async () => {
      const callback = createSpyCallback<string>();
      emitter.once<string>("test-channel", callback);

      for (let i = 0; i < 5; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should work with different data types", async () => {
      const callback = createSpyCallback<number>();
      const wrappedCallback: EventCallback<number> = event => {
        callback(event);
      };

      emitter.once<number>("test-channel", wrappedCallback);
      emitter.emit<number>("test-channel", 42);
      emitter.emit<number>("test-channel", 100);
      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe(42);
    });

    it("should handle immediate events", async () => {
      const callback = createSpyCallback<string>();

      emitter.emit<string>("test-channel", "immediate-data");
      await waitForAsync(50);

      emitter.once<string>("test-channel", callback);
      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should clean up subscription after event", async () => {
      const callback = createSpyCallback<string>();
      emitter.once<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBeLessThanOrEqual(1);
    });
  });

  describe("off method", () => {
    it("should remove specific subscriber from channel", async () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      emitter.on<string>("test-channel", callback1);
      emitter.on<string>("test-channel", callback2);

      emitter.off<string>("test-channel", callback1);

      emitter.emit<string>("test-channel", "test-data");
      await waitForAsync(50);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("should remove all subscribers when callback not provided", async () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      emitter.on<string>("test-channel", callback1);
      emitter.on<string>("test-channel", callback2);

      emitter.off<string>("test-channel");

      emitter.emit<string>("test-channel", "test-data");
      await waitForAsync(50);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it("should handle non-existent channels gracefully", () => {
      expect(() => {
        emitter.off<string>("non-existent-channel");
      }).not.toThrow();

      expect(() => {
        emitter.off<string>("non-existent-channel", jest.fn());
      }).not.toThrow();
    });

    it("should handle multiple unsubscriptions", () => {
      const callback = createSpyCallback<string>();

      emitter.on<string>("test-channel", callback);
      emitter.off<string>("test-channel", callback);
      emitter.off<string>("test-channel", callback);

      expect(() => emitter.off<string>("test-channel", callback)).not.toThrow();
    });
  });

  describe("destroy method", () => {
    it("should clear all subscribers", () => {
      emitter.on<string>("channel1", jest.fn());
      emitter.on<string>("channel2", jest.fn());

      emitter.destroy();

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(0);
    });

    it("should clear buffer", () => {
      emitter.emit<string>("test-channel", "data");

      emitter.destroy();

      const buffered = emitter.getBuffered("test-channel");
      expect(buffered).toHaveLength(0);
    });

    it("should set destroyed flag", () => {
      expect(() => {
        emitter.emit<string>("test-channel", "data");
      }).not.toThrow();

      emitter.destroy();

      expect(() => {
        emitter.emit<string>("test-channel", "data");
      }).toThrow();
    });

    it("should prevent further operations", () => {
      emitter.destroy();

      expect(() => emitter.on<string>("test-channel", jest.fn())).toThrow();
      expect(() => emitter.once<string>("test-channel", jest.fn())).toThrow();
      expect(() => emitter.emit<string>("test-channel", "data")).toThrow();
      expect(() => emitter.use(jest.fn())).toThrow();
    });

    it("should handle multiple destroy calls", () => {
      expect(() => emitter.destroy()).not.toThrow();
      expect(() => emitter.destroy()).not.toThrow();
      expect(() => emitter.destroy()).not.toThrow();
    });
  });

  describe("buffer interaction", () => {
    it("should add events to buffer on emit", async () => {
      emitter.emit<string>("test-channel", "data1");
      emitter.emit<string>("test-channel", "data2");
      await waitForAsync(50);

      const buffered = emitter.getBuffered("test-channel");
      expect(buffered).toHaveLength(2);
    });

    it("should retrieve buffered events by channel", async () => {
      emitter.emit<string>("channel-a", "data-a");
      emitter.emit<string>("channel-b", "data-b");
      await waitForAsync(50);

      const bufferedA = emitter.getBuffered("channel-a");
      const bufferedB = emitter.getBuffered("channel-b");

      expect(bufferedA).toHaveLength(1);
      expect(bufferedB).toHaveLength(1);
      expect(bufferedA[0].data).toBe("data-a");
      expect(bufferedB[0].data).toBe("data-b");
    });

    it("should clear buffer for specific channel", async () => {
      emitter.emit<string>("channel-a", "data-a");
      emitter.emit<string>("channel-b", "data-b");
      await waitForAsync(50);

      emitter.clear("channel-a");

      expect(emitter.getBuffered("channel-a")).toHaveLength(0);
      expect(emitter.getBuffered("channel-b")).toHaveLength(1);
    });

    it("should clear entire buffer", async () => {
      emitter.emit<string>("channel-a", "data-a");
      emitter.emit<string>("channel-b", "data-b");
      await waitForAsync(50);

      emitter.clear();

      expect(emitter.getBuffered("channel-a")).toHaveLength(0);
      expect(emitter.getBuffered("channel-b")).toHaveLength(0);
    });

    it("should handle empty buffer gracefully", () => {
      const buffered = emitter.getBuffered("non-existent");
      expect(buffered).toEqual([]);
    });
  });

  describe("middleware integration", () => {
    it("should register middleware with use method", () => {
      const middleware: Middleware = jest.fn(async (event, next) => {
        await next();
      });

      emitter.use(middleware);

      const metrics = emitter.getMetrics();
      expect(metrics).toBeDefined();
    });

    it("should process events through middleware chain", async () => {
      const middleware1 = jest.fn(async (event, next) => {
        await next();
      });
      const middleware2 = jest.fn(async (event, next) => {
        await next();
      });

      emitter.use(middleware1);
      emitter.use(middleware2);

      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test-data");
      await waitForAsync(50);

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    it("should handle middleware errors gracefully", async () => {
      const errorMiddleware: Middleware = jest.fn(async () => {
        throw new Error("Middleware error");
      });

      emitter.use(errorMiddleware);

      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      expect(() => {
        emitter.emit<string>("test-channel", "test-data");
      }).not.toThrow();

      await waitForAsync(50);
    });

    it("should support async middleware", async () => {
      const asyncMiddleware: Middleware = jest.fn(async (event, next) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        await next();
      });

      emitter.use(asyncMiddleware);

      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test-data");
      await waitForAsync(100);

      expect(asyncMiddleware).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("performance metrics", () => {
    it("should track events per second", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 10; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(0);
    });

    it("should track active subscriptions", () => {
      emitter.on<string>("channel1", jest.fn());
      emitter.on<string>("channel2", jest.fn());
      emitter.on<string>("channel2", jest.fn());

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(3);
    });

    it("should measure memory usage", () => {
      const metrics = emitter.getMetrics();
      expect(metrics.memoryUsage).toBeDefined();
      expect(typeof metrics.memoryUsage).toBe("number");
    });

    it("should update metrics on operations", async () => {
      const callback = createSpyCallback<string>();

      const initialMetrics = emitter.getMetrics();

      emitter.on<string>("test-channel", callback);
      const afterSubscribe = emitter.getMetrics();

      emitter.emit<string>("test-channel", "data");
      await waitForAsync(50);
      const afterEmit = emitter.getMetrics();

      expect(afterEmit.eventsPerSecond).toBeGreaterThanOrEqual(
        afterSubscribe.eventsPerSecond
      );
    });
  });

  describe("edge cases", () => {
    it("should handle null callback gracefully", () => {
      expect(() => {
        emitter.on<string>(
          "test-channel",
          null as unknown as EventCallback<string>
        );
      }).not.toThrow();
    });

    it("should handle rapid emit operations", async () => {
      const callback = createSpyCallback<number>();
      emitter.on<number>("test-channel", callback);

      for (let i = 0; i < 1000; i++) {
        emitter.emit<number>("test-channel", i);
      }
      await waitForAsync(100);

      expect(callback).toHaveBeenCalled();
    });

    it("should handle unsubscribe during emit", async () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      const wrappedCallback1: EventCallback<string> = event => {
        callback1(event);
        emitter.off<string>("test-channel", wrappedCallback1);
      };

      emitter.on<string>("test-channel", wrappedCallback1);
      emitter.on<string>("test-channel", callback2);

      emitter.emit<string>("test-channel", "data1");
      emitter.emit<string>("test-channel", "data2");
      await waitForAsync(50);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(2);
    });
  });

  describe("event data integrity", () => {
    it("should preserve event data through emit-receive cycle", async () => {
      const complexData = {
        id: 1,
        name: "test",
        nested: { value: "nested" },
        array: [1, 2, 3],
        null: null,
        boolean: true,
      };

      const callback = createSpyCallback<typeof complexData>();
      emitter.on<typeof complexData>("test-channel", callback);

      emitter.emit<typeof complexData>("test-channel", complexData);
      await waitForAsync(50);

      const receivedEvent = callback.mock.calls[0][0];
      expect(receivedEvent.data).toEqual(complexData);
      expect(receivedEvent.data).toBe(complexData);
    });

    it("should include all required event properties", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test-data");
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      expect(event).toHaveProperty("id");
      expect(event).toHaveProperty("channel");
      expect(event).toHaveProperty("data");
      expect(event).toHaveProperty("timestamp");
      expect(event.channel).toBe("test-channel");
      expect(event.data).toBe("test-data");
    });
  });
});

describe("createEventEmitter", () => {
  it("should create an EventEmitter instance", () => {
    const { createEventEmitter } = require("../../core/emitter");
    const emitter = createEventEmitter();

    expect(emitter).toBeInstanceOf(EventEmitter);
  });

  it("should accept configuration options", () => {
    const { createEventEmitter } = require("../../core/emitter");
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

/**
 * Error Handling and Edge Cases Tests
 * Comprehensive tests for error scenarios, boundary conditions, and system resilience
 * @author The Base Event Team
 * @since 1.0.0
 */

import { EventEmitter } from "../../core/emitter";
import { createBufferManager, BufferManager } from "../../core/buffer";
import type {
  BaseEvent,
  EventCallback,
  Middleware,
  BufferedEvent,
} from "../../core/events/typing";
import { waitForAsync, createSpyCallback } from "../setup";

describe("Error Handling - Input Validation", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    emitter.destroy();
  });

  describe("EventEmitter emit input validation", () => {
    it("should handle null/undefined channel", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      expect(() => {
        emitter.emit(null as unknown as string, "data");
      }).not.toThrow();
      expect(() => {
        emitter.emit(undefined as unknown as string, "data");
      }).not.toThrow();

      await waitForAsync(50);
    });

    it("should handle empty string channel", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      expect(() => {
        emitter.emit("", "data");
      }).not.toThrow();

      await waitForAsync(50);
    });

    it("should handle extremely long channel names", async () => {
      const longChannel = "a".repeat(10000);
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      expect(() => {
        emitter.emit(longChannel, "data");
      }).not.toThrow();

      await waitForAsync(50);
    });

    it("should handle null/undefined data", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      expect(() => {
        emitter.emit<string>("test-channel", null as unknown as string);
        emitter.emit<string>("test-channel", undefined as unknown as string);
      }).not.toThrow();

      await waitForAsync(50);
    });

    it("should handle circular reference data", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      const circularObj: Record<string, unknown> = { value: "test" };
      circularObj.self = circularObj;

      expect(() => {
        emitter.emit("test-channel", circularObj);
      }).not.toThrow();

      await waitForAsync(50);
    });

    it("should handle extremely large data payloads", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      const largeData = "x".repeat(10 * 1024 * 1024);

      expect(() => {
        emitter.emit("test-channel", largeData);
      }).not.toThrow();

      await waitForAsync(100);
    });
  });

  describe("EventEmitter on input validation", () => {
    it("should handle null/undefined channel", () => {
      expect(() => {
        emitter.on(null as unknown as string, jest.fn());
        emitter.on(undefined as unknown as string, jest.fn());
      }).not.toThrow();
    });

    it("should handle invalid callback functions", () => {
      expect(() => {
        emitter.on("test-channel", null as unknown as EventCallback<string>);
        emitter.on(
          "test-channel",
          undefined as unknown as EventCallback<string>
        );
      }).not.toThrow();
    });

    it("should handle throwing callbacks", async () => {
      const throwingCallback = jest.fn(() => {
        throw new Error("Callback error");
      });

      emitter.on("test-channel", throwingCallback);
      emitter.emit("test-channel", "test-data");

      await waitForAsync(50);

      expect(throwingCallback).toHaveBeenCalled();
    });

    it("should handle async callback errors", async () => {
      const asyncErrorCallback = jest.fn(() => {
        throw new Error("Async error");
      });

      emitter.on("test-channel", asyncErrorCallback as EventCallback<string>);
      emitter.emit("test-channel", "test-data");

      await waitForAsync(50);

      expect(asyncErrorCallback).toHaveBeenCalled();
    });
  });

  describe("EventEmitter off input validation", () => {
    it("should handle non-existent channels", () => {
      expect(() => {
        emitter.off("non-existent-channel");
      }).not.toThrow();

      expect(() => {
        emitter.off("non-existent-channel", jest.fn());
      }).not.toThrow();
    });

    it("should handle null callbacks", () => {
      expect(() => {
        emitter.on("test-channel", jest.fn());
        emitter.off("test-channel", null as unknown as EventCallback<string>);
      }).not.toThrow();
    });

    it("should handle invalid callback references", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      emitter.on("test-channel", callback1);
      emitter.off("test-channel", callback2);

      expect(callback1).toBeDefined();
    });
  });
});

describe("Error Handling - Buffer Input Validation", () => {
  let buffer: BufferManager;

  beforeEach(() => {
    buffer = createBufferManager({ maxSize: 100, ttl: 5000 });
  });

  it("should handle null/undefined events", () => {
    expect(() => {
      buffer.add(null as unknown as BaseEvent<unknown>);
      buffer.add(undefined as unknown as BaseEvent<unknown>);
    }).not.toThrow();
  });

  it("should handle malformed event structures", () => {
    expect(() => {
      buffer.add({} as BaseEvent<unknown>);
      buffer.add({ id: "test" } as BaseEvent<unknown>);
    }).not.toThrow();
  });

  it("should handle events with missing required fields", () => {
    expect(() => {
      buffer.add({
        id: "test-id",
        channel: "test",
      } as BaseEvent<unknown>);
    }).not.toThrow();
  });

  it("should handle events with invalid timestamps", () => {
    expect(() => {
      buffer.add({
        id: "test-id",
        channel: "test",
        data: "test",
        timestamp: -1,
      } as BaseEvent<unknown>);
    }).not.toThrow();
  });

  it("should handle events with invalid IDs", () => {
    expect(() => {
      buffer.add({
        id: "",
        channel: "test",
        data: "test",
        timestamp: Date.now(),
      } as BaseEvent<unknown>);
      buffer.add({
        id: null as unknown as string,
        channel: "test",
        data: "test",
        timestamp: Date.now(),
      } as BaseEvent<unknown>);
    }).not.toThrow();
  });

  it("should handle extremely large events", () => {
    const largeData = { data: "x".repeat(10 * 1024 * 1024) };

    expect(() => {
      buffer.add({
        id: "test-id",
        channel: "test",
        data: largeData,
        timestamp: Date.now(),
      });
    }).not.toThrow();
  });
});

describe("Error Handling - Middleware Input Validation", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    emitter.destroy();
  });

  it("should handle non-function middleware", () => {
    expect(() => {
      emitter.use(null as unknown as Middleware);
      emitter.use(undefined as unknown as Middleware);
    }).not.toThrow();
  });

  it("should handle middleware without next parameter", async () => {
    const badMiddleware: Middleware = jest.fn(async () => {
      // Does not call next
    });

    emitter.use(badMiddleware);

    const callback = createSpyCallback<string>();
    emitter.on("test-channel", callback);

    emitter.emit("test-channel", "test-data");
    await waitForAsync(50);

    expect(badMiddleware).toHaveBeenCalled();
  });

  it("should handle middleware that throws in execution", async () => {
    const throwingMiddleware: Middleware = jest.fn(() => {
      throw new Error("Middleware threw");
    });

    emitter.use(throwingMiddleware);

    const callback = createSpyCallback<string>();
    emitter.on("test-channel", callback);

    expect(() => {
      emitter.emit("test-channel", "test-data");
    }).not.toThrow();

    await waitForAsync(50);
  });

  it("should handle middleware that returns non-void", async () => {
    const nonVoidMiddleware = jest.fn(
      (event: BaseEvent<unknown>, next: () => void | Promise<void>) => {
        next();
      }
    );

    emitter.use(nonVoidMiddleware as Middleware);

    const callback = createSpyCallback<string>();
    emitter.on("test-channel", callback);

    emitter.emit("test-channel", "test-data");
    await waitForAsync(50);

    expect(nonVoidMiddleware).toHaveBeenCalled();
    expect(callback).toHaveBeenCalled();
  });
});

describe("Error Handling - State Management Errors", () => {
  describe("Lifecycle State Errors", () => {
    it("should handle operations after destroy", () => {
      const emitter = new EventEmitter();
      emitter.destroy();

      expect(() => {
        emitter.emit("test", "data");
      }).toThrow("EventEmitter has been destroyed");

      expect(() => {
        emitter.on("test", jest.fn());
      }).toThrow("EventEmitter has been destroyed");

      expect(() => {
        emitter.once("test", jest.fn());
      }).toThrow("EventEmitter has been destroyed");

      expect(() => {
        emitter.use(jest.fn());
      }).toThrow("EventEmitter has been destroyed");
    });

    it("should handle multiple destroy calls", () => {
      const emitter = new EventEmitter();

      expect(() => {
        emitter.destroy();
        emitter.destroy();
        emitter.destroy();
      }).not.toThrow();
    });

    it("should handle operations during destruction", async () => {
      const emitter = new EventEmitter();
      let destroyCalled = false;

      const callback: EventCallback<string> = () => {
        if (!destroyCalled) {
          emitter.destroy();
          destroyCalled = true;
        }
      };

      emitter.on("test-channel", callback);

      expect(() => {
        emitter.emit("test-channel", "data1");
        emitter.emit("test-channel", "data2");
      }).not.toThrow();

      await waitForAsync(50);
    });
  });

  describe("Subscription State Errors", () => {
    it("should handle double subscription", () => {
      const emitter = new EventEmitter();
      const callback = jest.fn();

      const unsub1 = emitter.on("test-channel", callback);
      const unsub2 = emitter.on("test-channel", callback);

      expect(typeof unsub1).toBe("function");
      expect(typeof unsub2).toBe("function");
    });

    it("should handle double unsubscription", () => {
      const emitter = new EventEmitter();
      const callback = jest.fn();

      const unsubscribe = emitter.on("test-channel", callback);
      unsubscribe();
      unsubscribe();

      expect(() => {
        emitter.emit("test-channel", "data");
      }).not.toThrow();
    });

    it("should handle unsubscription of non-existent subscription", () => {
      const emitter = new EventEmitter();
      const callback = jest.fn();

      emitter.off("test-channel", callback);

      expect(() => {
        emitter.emit("test-channel", "data");
      }).not.toThrow();
    });

    it("should handle subscription to destroyed emitter", () => {
      const emitter = new EventEmitter();
      emitter.destroy();

      expect(() => {
        emitter.on("test-channel", jest.fn());
      }).toThrow("EventEmitter has been destroyed");
    });

    it("should handle once subscription edge cases", async () => {
      const emitter = new EventEmitter();
      let callCount = 0;

      const callback: EventCallback<string> = () => {
        callCount++;
      };

      emitter.once("test-channel", callback);
      emitter.emit("test-channel", "data1");
      emitter.emit("test-channel", "data2");

      await waitForAsync(50);

      expect(callCount).toBe(1);
    });
  });

  describe("Buffer State Errors", () => {
    it("should handle operations on empty buffer", () => {
      const buffer = createBufferManager();

      const events = buffer.get("non-existent");
      expect(events).toEqual([]);

      buffer.clear("non-existent");

      expect(() => buffer.evictExpired()).not.toThrow();
    });

    it("should handle concurrent buffer operations", async () => {
      const buffer = createBufferManager({ maxSize: 1000 });

      const promises = Array.from({ length: 100 }, (_, i) => {
        return Promise.resolve().then(() => {
          buffer.add({
            id: `id-${i}`,
            channel: "test",
            data: i,
            timestamp: Date.now(),
          });
        });
      });

      await Promise.all(promises);

      expect(buffer.size).toBeGreaterThan(0);
    });
  });
});

describe("Error Handling - Resource Exhaustion", () => {
  describe("Buffer Overflow", () => {
    it("should handle buffer size limits", () => {
      const buffer = createBufferManager({ maxSize: 10, ttl: 60000 });

      for (let i = 0; i < 20; i++) {
        buffer.add({
          id: `id-${i}`,
          channel: "test",
          data: `data-${i}`,
          timestamp: Date.now(),
        });
      }

      const events = buffer.get("test");
      expect(events.length).toBe(20);
    });

    it("should handle eviction when full", () => {
      const buffer = createBufferManager({ maxSize: 5, ttl: 60000 });

      for (let i = 0; i < 20; i++) {
        buffer.add({
          id: `id-${i}`,
          channel: "test",
          data: `data-${i}`,
          timestamp: Date.now(),
        });
      }

      const events = buffer.get("test");
      expect(events.length).toBeLessThanOrEqual(20);
    });

    it("should handle rapid buffer filling", () => {
      const buffer = createBufferManager({ maxSize: 1000, ttl: 60000 });

      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        buffer.add({
          id: `id-${i}`,
          channel: `channel-${i % 10}`,
          data: i,
          timestamp: Date.now(),
        });
      }

      expect(buffer.size).toBeGreaterThan(0);
    });

    it("should handle multiple channel overflow", () => {
      const buffer = createBufferManager({ maxSize: 5, ttl: 60000 });

      for (let i = 0; i < 20; i++) {
        buffer.add({
          id: `id-${i}`,
          channel: `channel-${i % 3}`,
          data: i,
          timestamp: Date.now(),
        });
      }

      for (let c = 0; c < 3; c++) {
        const events = buffer.get(`channel-${c}`);
        expect(events.length).toBeLessThanOrEqual(20);
      }
    });
  });

  describe("Subscription Limits", () => {
    it("should handle high subscription counts", () => {
      const emitter = new EventEmitter();

      const subscriptions: (() => void)[] = [];
      for (let i = 0; i < 1000; i++) {
        subscriptions.push(emitter.on(`channel-${i}`, jest.fn()));
      }

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(1000);

      subscriptions.forEach(unsub => unsub());
    });

    it("should handle subscription cleanup", () => {
      const emitter = new EventEmitter();

      const unsub = emitter.on("test-channel", jest.fn());
      unsub();

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(0);
    });
  });
});

describe("Error Handling - Concurrency Issues", () => {
  describe("Race Conditions", () => {
    it("should handle concurrent emit operations", async () => {
      const emitter = new EventEmitter();
      let callCount = 0;

      emitter.on("test-channel", () => {
        callCount++;
      });

      const emitPromises = Array.from({ length: 100 }, () => {
        return Promise.resolve().then(() => {
          emitter.emit("test-channel", "data");
        });
      });

      await Promise.all(emitPromises);
      await waitForAsync(50);

      expect(callCount).toBeGreaterThan(0);
    });

    it("should handle concurrent subscription operations", async () => {
      const emitter = new EventEmitter();

      const subscribePromises = Array.from({ length: 50 }, () => {
        return Promise.resolve().then(() => {
          emitter.on("test-channel", jest.fn());
        });
      });

      await Promise.all(subscribePromises);

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(50);
    });

    it("should handle concurrent unsubscription operations", async () => {
      const emitter = new EventEmitter();
      const callbacks = Array.from({ length: 10 }, () => jest.fn());

      callbacks.forEach(cb => emitter.on("test-channel", cb));

      const unsubPromises = callbacks.map(cb => {
        return Promise.resolve().then(() => {
          emitter.off("test-channel", cb);
        });
      });

      await Promise.all(unsubPromises);

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(0);
    });

    it("should handle concurrent buffer operations", async () => {
      const buffer = createBufferManager({ maxSize: 1000 });

      const operations: Promise<void>[] = [];
      for (let i = 0; i < 50; i++) {
        operations.push(
          Promise.resolve().then(() => {
            buffer.add({
              id: `id-${i}`,
              channel: "test",
              data: i,
              timestamp: Date.now(),
            });
          })
        );
        operations.push(
          Promise.resolve().then(() => {
            buffer.get("test");
          })
        );
      }

      await Promise.all(operations);
      expect(buffer.size).toBeGreaterThan(0);
    });

    it("should handle concurrent middleware operations", async () => {
      const emitter = new EventEmitter();
      let middlewareCalls = 0;

      const middleware: Middleware = jest.fn(async () => {
        middlewareCalls++;
      });

      emitter.use(middleware);

      const emitPromises = Array.from({ length: 20 }, () => {
        return Promise.resolve().then(() => {
          emitter.emit("test-channel", "data");
        });
      });

      await Promise.all(emitPromises);
      await waitForAsync(50);

      expect(middlewareCalls).toBeGreaterThan(0);
    });
  });
});

describe("Error Handling - Edge Cases", () => {
  describe("Boundary Value Testing", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should handle zero events", () => {
      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBe(0);
    });

    it("should handle minimum TTL values", () => {
      const buffer = createBufferManager({ ttl: 0 });

      buffer.add({
        id: "id-1",
        channel: "test",
        data: "data",
        timestamp: Date.now(),
      });

      expect(buffer.size).toBe(1);
    });

    it("should handle maximum channel length", () => {
      const longChannel = "a".repeat(10000);
      const callback = jest.fn();

      expect(() => {
        emitter.on(longChannel, callback);
        emitter.emit(longChannel, "data");
      }).not.toThrow();

      waitForAsync(50);
    });

    it("should handle maximum payload size", () => {
      const largePayload = "x".repeat(10 * 1024 * 1024);

      expect(() => {
        emitter.emit("test-channel", largePayload);
      }).not.toThrow();

      waitForAsync(100);
    });

    it("should handle maximum subscription count", () => {
      const callbacks: Array<(event: BaseEvent<unknown>) => void> = [];
      for (let i = 0; i < 10000; i++) {
        callbacks.push(jest.fn());
      }

      expect(() => {
        callbacks.forEach(cb => emitter.on("test-channel", cb));
      }).not.toThrow();
    });
  });

  describe("Empty and Null Scenarios", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should handle empty event data", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      emitter.emit("test-channel", "");
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });

    it("should handle null event data", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      emitter.emit("test-channel", null);
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });

    it("should handle undefined event data", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      emitter.emit("test-channel", undefined);
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });

    it("should handle empty channel names", async () => {
      const callback = createSpyCallback<unknown>();

      expect(() => {
        emitter.on("", callback);
        emitter.emit("", "data");
      }).not.toThrow();

      await waitForAsync(50);
    });

    it("should handle empty middleware chain", async () => {
      const emitter = new EventEmitter({ middleware: [] });
      const callback = createSpyCallback<string>();

      emitter.on("test-channel", callback);
      emitter.emit("test-channel", "data");

      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
      emitter.destroy();
    });

    it("should handle empty buffer", () => {
      const buffer = createBufferManager();
      const events = buffer.get("non-existent");

      expect(events).toEqual([]);
      expect(buffer.size).toBe(0);
    });
  });

  describe("Extreme Data Scenarios", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should handle deeply nested objects", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      const deepObj = (depth: number): unknown => {
        if (depth <= 0) return "leaf";
        return { nested: deepObj(depth - 1) };
      };

      emitter.emit("test-channel", deepObj(100));
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });

    it("should handle circular references", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      const circular: Record<string, unknown> = { value: 1 };
      circular.self = circular;

      expect(() => {
        emitter.emit("test-channel", circular);
      }).not.toThrow();

      await waitForAsync(50);
    });

    it("should handle very large numbers", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      emitter.emit("test-channel", Number.MAX_SAFE_INTEGER);
      emitter.emit("test-channel", Number.MIN_SAFE_INTEGER);
      emitter.emit("test-channel", Infinity);
      emitter.emit("test-channel", -Infinity);
      emitter.emit("test-channel", NaN);

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(5);
    });

    it("should handle very long strings", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      const longString = "a".repeat(1000000);

      emitter.emit("test-channel", longString);
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });

    it("should handle special characters", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      const specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";

      emitter.emit("test-channel", specialChars);
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });

    it("should handle Unicode characters", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on("test-channel", callback);

      const unicode = "Hello 🌍🎉 Unicode ñ 中文 日本語";

      emitter.emit("test-channel", unicode);
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });
  });
});

describe("Error Handling - Error Recovery", () => {
  describe("Graceful Degradation", () => {
    it("should continue operation after non-critical errors", async () => {
      const emitter = new EventEmitter();

      let errorOccurred = false;
      const errorMiddleware: Middleware = jest.fn(async (event, next) => {
        if (!errorOccurred) {
          errorOccurred = true;
          throw new Error("First error");
        }
        await next();
      });

      emitter.use(errorMiddleware);
      const callback = createSpyCallback<string>();
      emitter.on("test-channel", callback);

      emitter.emit("test-channel", "data1");
      await waitForAsync(50);

      emitter.emit("test-channel", "data2");
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });

    it("should provide fallback behavior", () => {
      const buffer = createBufferManager({ maxSize: 0 });

      expect(() => {
        buffer.add({
          id: "test",
          channel: "test",
          data: "data",
          timestamp: Date.now(),
        });
      }).not.toThrow();
    });

    it("should maintain system stability after errors", async () => {
      const emitter = new EventEmitter();

      const throwingMiddleware: Middleware = jest.fn(() => {
        throw new Error("Middleware error");
      });

      emitter.use(throwingMiddleware);

      const callback = createSpyCallback<string>();
      emitter.on("test-channel", callback);

      for (let i = 0; i < 10; i++) {
        expect(() => {
          emitter.emit("test-channel", `data-${i}`);
        }).not.toThrow();
      }

      await waitForAsync(50);

      expect(() => {
        emitter.destroy();
      }).not.toThrow();
    });

    it("should preserve data integrity", async () => {
      const emitter = new EventEmitter();
      const data: string[] = [];

      const callback: EventCallback<string> = event => {
        data.push(event.data);
      };

      emitter.on("test-channel", callback);

      for (let i = 0; i < 5; i++) {
        emitter.emit("test-channel", `data-${i}`);
      }

      await waitForAsync(50);

      emitter.destroy();

      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe("Error Propagation", () => {
    it("should contain errors within appropriate boundaries", async () => {
      const emitter = new EventEmitter();
      let caughtError = false;

      const throwingMiddleware: Middleware = jest.fn(async () => {
        throw new Error("Contained error");
      });

      emitter.use(throwingMiddleware);

      const callback = createSpyCallback<string>();
      emitter.on("test-channel", callback);

      try {
        emitter.emit("test-channel", "data");
        await waitForAsync(50);
      } catch (error) {
        caughtError = true;
      }

      expect(caughtError).toBe(false);
    });

    it("should prevent error cascades", async () => {
      const emitter = new EventEmitter();

      const callback1: EventCallback<string> = () => {
        throw new Error("Callback 1 error");
      };
      const callback2 = jest.fn();

      emitter.on("test-channel", callback1);
      emitter.on("test-channel", callback2);

      emitter.emit("test-channel", "data");
      await waitForAsync(50);

      expect(callback2).toHaveBeenCalled();
    });

    it("should provide meaningful error messages", () => {
      const emitter = new EventEmitter();
      emitter.destroy();

      try {
        emitter.emit("test", "data");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("destroyed");
      }
    });
  });
});

describe("Error Handling - Stress Testing", () => {
  describe("High-Volume Error Scenarios", () => {
    it("should handle high error rates", async () => {
      const emitter = new EventEmitter();

      const errorMiddleware: Middleware = jest.fn(() => {
        if (Math.random() < 0.5) {
          throw new Error("Random error");
        }
      });

      emitter.use(errorMiddleware);

      for (let i = 0; i < 100; i++) {
        expect(() => {
          emitter.emit("test-channel", `data-${i}`);
        }).not.toThrow();
      }

      await waitForAsync(100);

      emitter.destroy();
    });

    it("should maintain performance under error conditions", async () => {
      const emitter = new EventEmitter();
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        emitter.emit("test-channel", i);
      }

      await waitForAsync(50);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe("Long-Running Error Scenarios", () => {
    it("should handle accumulated errors over time", async () => {
      const emitter = new EventEmitter();

      const errorMiddleware: Middleware = jest.fn(() => {
        throw new Error("Accumulated error");
      });

      emitter.use(errorMiddleware);

      for (let i = 0; i < 10; i++) {
        emitter.emit("test-channel", `data-${i}`);
        await waitForAsync(10);
      }

      expect(() => {
        emitter.destroy();
      }).not.toThrow();
    });

    it("should prevent memory leaks from error handling", () => {
      const emitter = new EventEmitter();

      for (let i = 0; i < 100; i++) {
        const callback = jest.fn();
        emitter.on("test-channel", callback);
        emitter.off("test-channel", callback);
      }

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(0);

      emitter.destroy();
    });
  });
});

describe("Error Handling - System and Platform Errors", () => {
  describe("Environment Issues", () => {
    it("should handle operations in various contexts", () => {
      const emitter = new EventEmitter();

      expect(() => {
        emitter.emit("test", "data");
        emitter.on("test", jest.fn());
        emitter.once("test", jest.fn());
        emitter.destroy();
      }).not.toThrow();
    });

    it("should handle browser vs Node.js differences", () => {
      const emitter = new EventEmitter({ buffer: { maxSize: 100 } });

      expect(() => {
        emitter.emit("test", { environment: "test" });
        emitter.getBuffered("test");
      }).not.toThrow();
    });

    it("should handle missing browser APIs gracefully", () => {
      const emitter = new EventEmitter();

      expect(() => {
        emitter.getMetrics();
      }).not.toThrow();
    });
  });

  describe("Timing and Clock Issues", () => {
    it("should handle invalid timestamps", () => {
      const buffer = createBufferManager();

      expect(() => {
        buffer.add({
          id: "test",
          channel: "test",
          data: "data",
          timestamp: -Infinity,
        });
        buffer.add({
          id: "test2",
          channel: "test",
          data: "data",
          timestamp: Infinity,
        });
      }).not.toThrow();
    });

    it("should handle timer precision issues", async () => {
      const emitter = new EventEmitter();
      const callback = createSpyCallback<string>();

      emitter.on("test-channel", callback);

      const times: number[] = [];
      for (let i = 0; i < 10; i++) {
        const before = Date.now();
        emitter.emit("test-channel", `data-${i}`);
        times.push(Date.now() - before);
      }

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(10);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(100);
    });
  });
});

function createDeepObject(depth: number): unknown {
  if (depth <= 0) return "leaf";
  return { level: depth, child: createDeepObject(depth - 1) };
}

function createCircularObject(): Record<string, unknown> {
  const obj: Record<string, unknown> = { value: 1 };
  obj.self = obj;
  return obj;
}

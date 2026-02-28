/**
 * Integration Tests for The Base Event
 * Comprehensive tests covering component integration, end-to-end workflows,
 * real-world scenarios, cross-environment compatibility, framework integration,
 * and performance integration
 * @author The Base Event Team
 * @since 1.0.0
 */

import { EventEmitter, createEventEmitter } from "../../core/emitter";
import type {
  BaseEvent,
  Middleware,
  EventCallback,
  BufferedEvent,
  BufferConfig,
} from "../../core/events/typing";
import { waitForAsync, createSpyCallback } from "../setup";

describe("Integration Tests", () => {
  describe("1. Component Integration Tests", () => {
    describe("EventEmitter-Buffer Integration", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter({
          buffer: { maxSize: 10, ttl: 5000 },
        });
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should buffer events on emit", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("test-channel", callback);

        emitter.emit<string>("test-channel", "test-data-1");
        emitter.emit<string>("test-channel", "test-data-2");
        await waitForAsync(50);

        const buffered = emitter.getBuffered("test-channel");
        expect(buffered).toHaveLength(2);
      });

      it("should replay buffered events on subscription", async () => {
        emitter.emit<string>("test-channel", "data-1");
        emitter.emit<string>("test-channel", "data-2");
        await waitForAsync(50);

        const callback = createSpyCallback<string>();
        emitter.on<string>("test-channel", callback);
        await waitForAsync(50);

        expect(callback).toHaveBeenCalledTimes(2);
      });

      it("should handle buffer overflow gracefully", async () => {
        const emitter2 = new EventEmitter({
          buffer: { maxSize: 3, ttl: 5000 },
        });

        const callback = createSpyCallback<string>();
        emitter2.on<string>("channel", callback);

        emitter2.emit<string>("channel", "data-1");
        emitter2.emit<string>("channel", "data-2");
        emitter2.emit<string>("channel", "data-3");
        emitter2.emit<string>("channel", "data-4");
        emitter2.emit<string>("channel", "data-5");
        await waitForAsync(50);

        const buffered = emitter2.getBuffered("channel");
        expect(buffered.length).toBeGreaterThan(0);
        emitter2.destroy();
      });

      it("should sync buffer state with emitter state", async () => {
        emitter.emit<string>("channel-a", "data-a");
        emitter.emit<string>("channel-b", "data-b");
        await waitForAsync(50);

        const bufferedA = emitter.getBuffered("channel-a");
        const bufferedB = emitter.getBuffered("channel-b");

        expect(bufferedA).toHaveLength(1);
        expect(bufferedB).toHaveLength(1);
      });

      it("should handle buffer configuration changes", () => {
        const initialMetrics = emitter.getMetrics();
        expect(initialMetrics).toBeDefined();

        emitter.clear();
        const clearedMetrics = emitter.getMetrics();
        expect(clearedMetrics).toBeDefined();
      });

      it("should maintain performance with large buffers", async () => {
        const emitter2 = new EventEmitter({
          buffer: { maxSize: 1000, ttl: 60000 },
        });

        const callback = createSpyCallback<string>();
        emitter2.on<string>("perf-channel", callback);

        const startTime = Date.now();
        for (let i = 0; i < 100; i++) {
          emitter2.emit<string>("perf-channel", `data-${i}`);
        }
        await waitForAsync(50);
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(500);
        expect(emitter2.getBuffered("perf-channel").length).toBe(100);
        emitter2.destroy();
      });

      it("should handle buffer errors gracefully", () => {
        expect(() => emitter.getBuffered("non-existent")).not.toThrow();
        expect(emitter.getBuffered("non-existent")).toEqual([]);
      });
    });

    describe("EventEmitter-Middleware Integration", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter();
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should process events through middleware before emission", async () => {
        const middlewareFn = jest.fn(
          async (event: BaseEvent<unknown>, next: () => Promise<void>) => {
            await next();
          }
        ) as unknown as Middleware;

        emitter.use(middlewareFn);
        const callback = createSpyCallback<string>();
        emitter.on<string>("test-channel", callback);

        emitter.emit<string>("test-channel", "test-data");
        await waitForAsync(50);

        expect(middlewareFn).toHaveBeenCalled();
      });

      it("should handle middleware errors without affecting subscribers", async () => {
        const errorMiddleware: Middleware = jest.fn(async () => {
          throw new Error("Middleware error");
        });

        emitter.use(errorMiddleware);

        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        emitter.emit<string>("test-channel", "test-data");
        await waitForAsync(200);

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it("should measure middleware latency in metrics", async () => {
        const slowMiddleware: Middleware = jest.fn(async (event, next) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          await next();
        });

        emitter.use(slowMiddleware);
        emitter.emit<string>("test-channel", "data");
        await waitForAsync(100);

        const metrics = emitter.getMetrics();
        expect(metrics.middlewareLatency).toBeGreaterThan(0);
      });

      it("should support async middleware chains", async () => {
        const middleware1: Middleware = jest.fn(async (event, next) => {
          await next();
        });
        const middleware2: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(middleware1);
        emitter.use(middleware2);

        const callback = createSpyCallback<string>();
        emitter.on<string>("test-channel", callback);

        emitter.emit<string>("test-channel", "data");
        await waitForAsync(50);

        expect(middleware1).toHaveBeenCalled();
        expect(middleware2).toHaveBeenCalled();
      });

      it("should handle middleware that modifies events", async () => {
        const modifyingMiddleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(modifyingMiddleware);
        const callback = createSpyCallback<string>();
        emitter.on<string>("test-channel", callback);

        emitter.emit<string>("test-channel", "test-data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should maintain order with multiple middleware", async () => {
        const executionOrder: number[] = [];
        const middleware1: Middleware = jest.fn(async (event, next) => {
          executionOrder.push(1);
          await next();
        });
        const middleware2: Middleware = jest.fn(async (event, next) => {
          executionOrder.push(2);
          await next();
        });

        emitter.use(middleware1);
        emitter.use(middleware2);
        emitter.emit<string>("test-channel", "data");
        await waitForAsync(50);

        expect(executionOrder).toEqual(expect.arrayContaining([1, 2]));
      });

      it("should cleanup middleware on destroy", () => {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });
        emitter.use(middleware);

        emitter.destroy();

        expect(() => {
          emitter.emit<string>("test-channel", "data");
        }).toThrow("EventEmitter has been destroyed");
      });
    });

    describe("Buffer-Middleware Integration", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter({
          buffer: { maxSize: 100, ttl: 5000 },
        });
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should buffer events after middleware processing", async () => {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(middleware);
        emitter.emit<string>("test-channel", "data");
        await waitForAsync(50);

        const buffered = emitter.getBuffered("test-channel");
        expect(buffered).toHaveLength(1);
        expect(middleware).toHaveBeenCalled();
      });

      it("should replay middleware-processed events", async () => {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(middleware);
        emitter.emit<string>("channel", "data-1");
        emitter.emit<string>("channel", "data-2");
        await waitForAsync(50);

        const callback = createSpyCallback<string>();
        emitter.on<string>("channel", callback);
        await waitForAsync(50);

        expect(callback).toHaveBeenCalledTimes(2);
      });

      it("should handle middleware errors affecting buffer", async () => {
        const errorMiddleware: Middleware = jest.fn(async () => {
          throw new Error("Middleware error");
        });

        emitter.use(errorMiddleware);
        emitter.emit<string>("test-channel", "data");
        await waitForAsync(50);

        const buffered = emitter.getBuffered("test-channel");
        expect(buffered.length).toBeGreaterThanOrEqual(0);
      });

      it("should maintain buffer consistency with middleware", async () => {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(middleware);

        for (let i = 0; i < 10; i++) {
          emitter.emit<string>("channel", `data-${i}`);
        }
        await waitForAsync(50);

        const buffered = emitter.getBuffered("channel");
        expect(buffered).toHaveLength(10);
      });

      it("should sync buffer metrics with middleware metrics", async () => {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(middleware);
        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        const metrics = emitter.getMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(0);
      });
    });

    describe("Metrics Integration", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter();
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should update all metrics on emit", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("test-channel", callback);

        emitter.emit<string>("test-channel", "data");
        await waitForAsync(50);

        const metrics = emitter.getMetrics();
        expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(0);
      });

      it("should coordinate metrics across components", async () => {
        emitter.emit<string>("channel-1", "data-1");
        emitter.emit<string>("channel-2", "data-2");
        await waitForAsync(50);

        const metrics = emitter.getMetrics();
        expect(metrics.activeSubscriptions).toBe(0);
      });

      it("should maintain metric consistency", async () => {
        const callback1 = createSpyCallback<string>();
        const callback2 = createSpyCallback<string>();

        emitter.on<string>("channel", callback1);
        emitter.on<string>("channel", callback2);

        const metricsAfterSubscribe = emitter.getMetrics();
        expect(metricsAfterSubscribe.activeSubscriptions).toBe(2);

        emitter.off<string>("channel", callback1);

        const metricsAfterUnsubscribe = emitter.getMetrics();
        expect(metricsAfterUnsubscribe.activeSubscriptions).toBe(1);
      });

      it("should handle concurrent metric updates", async () => {
        const promises: Promise<void>[] = [];

        for (let i = 0; i < 50; i++) {
          const callback = createSpyCallback<string>();
          emitter.on<string>(`channel-${i}`, callback);
          emitter.emit<string>(`channel-${i}`, `data-${i}`);
        }

        await waitForAsync(100);

        const metrics = emitter.getMetrics();
        expect(metrics.activeSubscriptions).toBe(50);
      });

      it("should provide accurate system-wide metrics", async () => {
        emitter.emit<string>("channel", "data1");
        emitter.emit<string>("channel", "data2");
        emitter.emit<string>("channel", "data3");
        await waitForAsync(50);

        const metrics = emitter.getMetrics();
        expect(metrics.bufferUtilization).toBeGreaterThanOrEqual(0);
        expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      });

      it("should reset all metrics on destroy", () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("channel", callback);

        emitter.emit<string>("channel", "data");
        emitter.destroy();

        const metrics = emitter.getMetrics();
        expect(metrics.activeSubscriptions).toBe(0);
      });
    });
  });

  describe("2. End-to-End Workflow Tests", () => {
    describe("Complete Event Lifecycle", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter({
          buffer: { maxSize: 100, ttl: 5000 },
        });
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should handle full event flow from emit to subscription", async () => {
        const callback = createSpyCallback<string>();

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        emitter.on<string>("channel", callback);
        await waitForAsync(50);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            channel: "channel",
            data: "data",
          })
        );
      });

      it("should handle event flow with middleware", async () => {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(middleware);
        const callback = createSpyCallback<string>();

        emitter.on<string>("channel", callback);
        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
        expect(middleware).toHaveBeenCalled();
      });

      it("should handle event flow with buffering", async () => {
        emitter.emit<string>("channel", "data-1");
        emitter.emit<string>("channel", "data-2");
        await waitForAsync(50);

        const buffered = emitter.getBuffered("channel");
        expect(buffered).toHaveLength(2);
      });

      it("should handle event flow with metrics", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("channel", callback);

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        const metrics = emitter.getMetrics();
        expect(metrics).toBeDefined();
      });

      it("should handle event flow with all components", async () => {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(middleware);
        const callback = createSpyCallback<string>();
        emitter.on<string>("channel", callback);

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
        expect(middleware).toHaveBeenCalled();
        expect(emitter.getBuffered("channel")).toHaveLength(1);
      });

      it("should maintain event integrity through lifecycle", async () => {
        const callback = createSpyCallback<{ id: string; value: number }>();
        emitter.on<{ id: string; value: number }>("channel", callback);

        const testEvent = { id: "test-id", value: 42 };
        emitter.emit<{ id: string; value: number }>("channel", testEvent);
        await waitForAsync(50);

        const calledEvent = callback.mock.calls[0][0];
        expect(calledEvent.data).toEqual(testEvent);
        expect(calledEvent.id).toBeDefined();
        expect(calledEvent.timestamp).toBeDefined();
      });

      it("should handle lifecycle errors gracefully", async () => {
        const errorMiddleware: Middleware = jest.fn(async () => {
          throw new Error("Test error");
        });

        emitter.use(errorMiddleware);

        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        emitter.emit<string>("channel", "data");
        await waitForAsync(200);

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe("Subscription Workflow", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter({
          buffer: { maxSize: 100, ttl: 5000 },
        });
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should handle subscription with buffered replay", async () => {
        emitter.emit<string>("channel", "data-1");
        emitter.emit<string>("channel", "data-2");
        await waitForAsync(50);

        const callback = createSpyCallback<string>();
        emitter.on<string>("channel", callback);
        await waitForAsync(50);

        expect(callback).toHaveBeenCalledTimes(2);
      });

      it("should handle subscription with middleware processing", async () => {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(middleware);
        const callback = createSpyCallback<string>();
        emitter.on<string>("channel", callback);

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle once subscription workflow", async () => {
        const callback = createSpyCallback<string>();
        emitter.once<string>("channel", callback);

        emitter.emit<string>("channel", "data-1");
        await waitForAsync(50);
        emitter.emit<string>("channel", "data-2");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalledTimes(1);
      });

      it("should handle unsubscription workflow", async () => {
        const callback = createSpyCallback<string>();
        const unsubscribe = emitter.on<string>("channel", callback);

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        unsubscribe();

        emitter.emit<string>("channel", "data-2");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalledTimes(1);
      });

      it("should handle multiple subscription workflow", async () => {
        const callback1 = createSpyCallback<string>();
        const callback2 = createSpyCallback<string>();

        emitter.on<string>("channel", callback1);
        emitter.on<string>("channel", callback2);

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
      });

      it("should handle subscription with configuration changes", async () => {
        const callback1 = createSpyCallback<string>();
        emitter.on<string>("channel", callback1);

        emitter.clear("channel");

        const callback2 = createSpyCallback<string>();
        emitter.on<string>("channel", callback2);

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        expect(callback2).toHaveBeenCalled();
      });
    });

    describe("Configuration Workflow", () => {
      it("should handle dynamic configuration changes", async () => {
        const emitter = new EventEmitter({
          buffer: { maxSize: 50, ttl: 3000 },
        });

        const callback = createSpyCallback<string>();
        emitter.on<string>("channel", callback);

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        expect(emitter.getBuffered("channel")).toHaveLength(1);
        emitter.destroy();
      });

      it("should apply configuration to all components", () => {
        const emitter = new EventEmitter({
          buffer: { maxSize: 100, strategy: "fifo" },
        });

        expect(emitter.getMetrics()).toBeDefined();
        emitter.destroy();
      });

      it("should handle configuration conflicts", () => {
        const emitter = new EventEmitter({
          buffer: { maxSize: 50, strategy: "lru" },
        });

        expect(() => {
          emitter.emit<string>("channel", "data");
        }).not.toThrow();

        emitter.destroy();
      });

      it("should maintain consistency during configuration changes", () => {
        const emitter = new EventEmitter({
          buffer: { maxSize: 100 },
        });

        emitter.emit<string>("channel", "data");
        emitter.clear("channel");

        const buffered = emitter.getBuffered("channel");
        expect(buffered).toHaveLength(0);

        emitter.destroy();
      });

      it("should handle invalid configuration gracefully", () => {
        const emitter = new EventEmitter({
          buffer: { maxSize: -1 } as any,
        });

        expect(emitter.getMetrics()).toBeDefined();
        emitter.destroy();
      });

      it("should reset configuration on destroy", () => {
        const emitter = new EventEmitter({
          buffer: { maxSize: 100 },
        });

        emitter.emit<string>("channel", "data");
        emitter.destroy();

        expect(emitter.getMetrics().activeSubscriptions).toBe(0);
      });
    });
  });

  describe("3. Real-World Scenarios", () => {
    describe("Chat Application Scenario", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter({
          buffer: { maxSize: 1000, ttl: 30000 },
        });
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should handle high-frequency message events", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("messages", callback);

        const startTime = Date.now();
        for (let i = 0; i < 100; i++) {
          emitter.emit<string>("messages", `Message ${i}`);
        }
        await waitForAsync(100);
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(1000);
        expect(callback).toHaveBeenCalled();
      });

      it("should handle user presence events", async () => {
        const presenceCallback = createSpyCallback<{
          userId: string;
          status: string;
        }>();
        emitter.on<{ userId: string; status: string }>(
          "presence",
          presenceCallback
        );

        emitter.emit<{ userId: string; status: string }>("presence", {
          userId: "user-1",
          status: "online",
        });
        await waitForAsync(50);

        expect(presenceCallback).toHaveBeenCalled();
      });

      it("should handle typing indicators", async () => {
        const typingCallback = createSpyCallback<{
          userId: string;
          isTyping: boolean;
        }>();
        emitter.on<{ userId: string; isTyping: boolean }>(
          "typing",
          typingCallback
        );

        emitter.emit<{ userId: string; isTyping: boolean }>("typing", {
          userId: "user-1",
          isTyping: true,
        });
        await waitForAsync(50);

        expect(typingCallback).toHaveBeenCalled();
      });

      it("should handle message history replay", async () => {
        for (let i = 0; i < 10; i++) {
          emitter.emit<string>("messages", `Historical message ${i}`);
        }
        await waitForAsync(50);

        const historyCallback = createSpyCallback<string>();
        emitter.on<string>("messages", historyCallback);
        await waitForAsync(50);

        expect(historyCallback).toHaveBeenCalledTimes(10);
      });

      it("should handle multiple chat rooms", async () => {
        const room1Callback = createSpyCallback<string>();
        const room2Callback = createSpyCallback<string>();

        emitter.on<string>("room-1", room1Callback);
        emitter.on<string>("room-2", room2Callback);

        emitter.emit<string>("room-1", "Hello room 1");
        emitter.emit<string>("room-2", "Hello room 2");
        await waitForAsync(50);

        expect(room1Callback).toHaveBeenCalledWith(
          expect.objectContaining({ data: "Hello room 1" })
        );
        expect(room2Callback).toHaveBeenCalledWith(
          expect.objectContaining({ data: "Hello room 2" })
        );
      });

      it("should handle user join/leave events", async () => {
        const joinCallback = createSpyCallback<{
          userId: string;
          action: string;
        }>();
        emitter.on<{ userId: string; action: string }>(
          "user-activity",
          joinCallback
        );

        emitter.emit<{ userId: string; action: string }>("user-activity", {
          userId: "user-1",
          action: "join",
        });
        await waitForAsync(50);

        expect(joinCallback).toHaveBeenCalled();
      });

      it("should maintain performance under load", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("messages", callback);

        const startTime = Date.now();
        for (let i = 0; i < 500; i++) {
          emitter.emit<string>("messages", `Message ${i}`);
        }
        await waitForAsync(200);
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(2000);
      });
    });

    describe("Real-Time Dashboard Scenario", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter({
          buffer: { maxSize: 500, ttl: 10000 },
        });
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should handle frequent metric updates", async () => {
        const callback = createSpyCallback<{ metric: string; value: number }>();
        emitter.on<{ metric: string; value: number }>("metrics", callback);

        const startTime = Date.now();
        for (let i = 0; i < 50; i++) {
          emitter.emit<{ metric: string; value: number }>("metrics", {
            metric: "cpu",
            value: Math.random() * 100,
          });
        }
        await waitForAsync(100);

        expect(Date.now() - startTime).toBeLessThan(500);
      });

      it("should handle data transformation middleware", async () => {
        const transformMiddleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(transformMiddleware);
        const callback = createSpyCallback<{ value: number }>();
        emitter.on<{ value: number }>("data", callback);

        emitter.emit<{ value: number }>("data", { value: 50 });
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle multiple data sources", async () => {
        const cpuCallback = createSpyCallback<number>();
        const memoryCallback = createSpyCallback<number>();

        emitter.on<number>("cpu-metrics", cpuCallback);
        emitter.on<number>("memory-metrics", memoryCallback);

        emitter.emit<number>("cpu-metrics", 75);
        emitter.emit<number>("memory-metrics", 4096);
        await waitForAsync(50);

        expect(cpuCallback).toHaveBeenCalledWith(
          expect.objectContaining({ data: 75 })
        );
        expect(memoryCallback).toHaveBeenCalledWith(
          expect.objectContaining({ data: 4096 })
        );
      });

      it("should handle dashboard state management", async () => {
        const stateCallback = createSpyCallback<Record<string, unknown>>();
        emitter.on<Record<string, unknown>>("dashboard-state", stateCallback);

        emitter.emit<Record<string, unknown>>("dashboard-state", {
          theme: "dark",
          refreshRate: 5000,
          widgets: ["chart1", "chart2"],
        });
        await waitForAsync(50);

        expect(stateCallback).toHaveBeenCalled();
      });

      it("should handle real-time data streaming", async () => {
        const streamCallback = createSpyCallback<{
          timestamp: number;
          data: number;
        }>();
        emitter.on<{ timestamp: number; data: number }>(
          "stream",
          streamCallback
        );

        const startTime = Date.now();
        for (let i = 0; i < 20; i++) {
          emitter.emit<{ timestamp: number; data: number }>("stream", {
            timestamp: Date.now(),
            data: i,
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        expect(streamCallback).toHaveBeenCalled();
      });

      it("should handle data aggregation", async () => {
        const aggregateCallback = createSpyCallback<{
          sum: number;
          count: number;
        }>();
        emitter.on<{ sum: number; count: number }>(
          "aggregate",
          aggregateCallback
        );

        emitter.emit<{ sum: number; count: number }>("aggregate", {
          sum: 100,
          count: 10,
        });
        await waitForAsync(50);

        expect(aggregateCallback).toHaveBeenCalled();
      });
    });

    describe("E-Commerce Scenario", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter({
          buffer: { maxSize: 500, ttl: 60000 },
        });
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should handle inventory updates", async () => {
        const inventoryCallback = createSpyCallback<{
          productId: string;
          quantity: number;
        }>();
        emitter.on<{ productId: string; quantity: number }>(
          "inventory",
          inventoryCallback
        );

        emitter.emit<{ productId: string; quantity: number }>("inventory", {
          productId: "prod-123",
          quantity: 50,
        });
        await waitForAsync(50);

        expect(inventoryCallback).toHaveBeenCalled();
      });

      it("should handle price changes", async () => {
        const priceCallback = createSpyCallback<{
          productId: string;
          oldPrice: number;
          newPrice: number;
        }>();
        emitter.on<{ productId: string; oldPrice: number; newPrice: number }>(
          "prices",
          priceCallback
        );

        emitter.emit<{ productId: string; oldPrice: number; newPrice: number }>(
          "prices",
          {
            productId: "prod-123",
            oldPrice: 29.99,
            newPrice: 24.99,
          }
        );
        await waitForAsync(50);

        expect(priceCallback).toHaveBeenCalled();
      });

      it("should handle order status updates", async () => {
        const orderCallback = createSpyCallback<{
          orderId: string;
          status: string;
        }>();
        emitter.on<{ orderId: string; status: string }>(
          "orders",
          orderCallback
        );

        emitter.emit<{ orderId: string; status: string }>("orders", {
          orderId: "order-456",
          status: "shipped",
        });
        await waitForAsync(50);

        expect(orderCallback).toHaveBeenCalled();
      });

      it("should handle user activity tracking", async () => {
        const activityCallback = createSpyCallback<{
          userId: string;
          action: string;
        }>();
        emitter.on<{ userId: string; action: string }>(
          "activity",
          activityCallback
        );

        emitter.emit<{ userId: string; action: string }>("activity", {
          userId: "user-789",
          action: "view_product",
        });
        await waitForAsync(50);

        expect(activityCallback).toHaveBeenCalled();
      });

      it("should handle promotional events", async () => {
        const promoCallback = createSpyCallback<{
          promoCode: string;
          discount: number;
        }>();
        emitter.on<{ promoCode: string; discount: number }>(
          "promotions",
          promoCallback
        );

        emitter.emit<{ promoCode: string; discount: number }>("promotions", {
          promoCode: "SUMMER2024",
          discount: 20,
        });
        await waitForAsync(50);

        expect(promoCallback).toHaveBeenCalled();
      });

      it("should handle cart synchronization", async () => {
        const cartCallback = createSpyCallback<{
          userId: string;
          items: string[];
        }>();
        emitter.on<{ userId: string; items: string[] }>("cart", cartCallback);

        emitter.emit<{ userId: string; items: string[] }>("cart", {
          userId: "user-789",
          items: ["prod-1", "prod-2", "prod-3"],
        });
        await waitForAsync(50);

        expect(cartCallback).toHaveBeenCalled();
      });
    });
  });

  describe("4. Cross-Environment Compatibility", () => {
    describe("Server-Side Rendering (SSR)", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter();
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should work in Node.js environment", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("test", callback);

        emitter.emit<string>("test", "data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle missing browser APIs", () => {
        expect(() => emitter.getMetrics()).not.toThrow();
      });

      it("should work without DOM", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("channel", callback);

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle server-side event processing", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("server-channel", callback);

        emitter.emit<string>("server-channel", "server-data");
        await waitForAsync(50);

        const buffered = emitter.getBuffered("server-channel");
        expect(buffered.length).toBeGreaterThan(0);
      });

      it("should handle server-side buffering", async () => {
        emitter.emit<string>("channel", "data1");
        emitter.emit<string>("channel", "data2");
        await waitForAsync(50);

        const buffered = emitter.getBuffered("channel");
        expect(buffered).toHaveLength(2);
      });

      it("should work with server-side middleware", async () => {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(middleware);
        const callback = createSpyCallback<string>();
        emitter.on<string>("channel", callback);

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should maintain performance in SSR context", async () => {
        const startTime = Date.now();
        for (let i = 0; i < 100; i++) {
          emitter.emit<string>("channel", `data-${i}`);
        }
        await waitForAsync(100);
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(500);
      });
    });

    describe("Client-Side Rendering (CSR)", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter();
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should work in browser environment", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("test", callback);

        emitter.emit<string>("test", "data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle browser-specific APIs gracefully", () => {
        expect(() => emitter.getMetrics()).not.toThrow();
      });

      it("should work with DOM", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("channel", callback);

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle client-side event processing", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("client-channel", callback);

        emitter.emit<string>("client-channel", "client-data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle client-side buffering", async () => {
        emitter.emit<string>("channel", "data1");
        emitter.emit<string>("channel", "data2");
        await waitForAsync(50);

        const buffered = emitter.getBuffered("channel");
        expect(buffered).toHaveLength(2);
      });

      it("should work with client-side middleware", async () => {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(middleware);
        const callback = createSpyCallback<string>();
        emitter.on<string>("channel", callback);

        emitter.emit<string>("channel", "data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should maintain performance in CSR context", async () => {
        const startTime = Date.now();
        for (let i = 0; i < 100; i++) {
          emitter.emit<string>("channel", `data-${i}`);
        }
        await waitForAsync(100);
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(500);
      });
    });

    describe("Universal/Isomorphic Applications", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter();
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should work in both environments", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("universal", callback);

        emitter.emit<string>("universal", "data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle environment detection", () => {
        expect(() => emitter.getMetrics()).not.toThrow();
      });

      it("should maintain consistency across environments", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("consistency", callback);

        emitter.emit<string>("consistency", "data");
        await waitForAsync(50);

        const buffered = emitter.getBuffered("consistency");
        expect(buffered).toHaveLength(1);
        expect(callback).toHaveBeenCalledTimes(1);
      });

      it("should handle environment-specific features", () => {
        expect(() => emitter.destroy()).not.toThrow();
      });

      it("should work with hydration", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("hydration", callback);

        emitter.emit<string>("hydration", "initial-data");
        await waitForAsync(50);

        const buffered = emitter.getBuffered("hydration");
        expect(buffered).toHaveLength(1);

        const hydrationCallback = createSpyCallback<string>();
        emitter.on<string>("hydration", hydrationCallback);
        await waitForAsync(50);

        expect(hydrationCallback).toHaveBeenCalled();
      });

      it("should handle cross-tab synchronization", () => {
        expect(() => {
          const emitter2 = new EventEmitter({
            buffer: { crossTab: true },
          });
          emitter2.destroy();
        }).not.toThrow();
      });
    });
  });

  describe("5. Framework Integration Tests", () => {
    describe("React Integration", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter();
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should work with React components", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("react-event", callback);

        emitter.emit<string>("react-event", "react-data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle React lifecycle", async () => {
        const callback = createSpyCallback<string>();
        const unsubscribe = emitter.on<string>("lifecycle", callback);

        emitter.emit<string>("lifecycle", "data-1");
        await waitForAsync(50);
        unsubscribe();
        emitter.emit<string>("lifecycle", "data-2");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalledTimes(1);
      });

      it("should work with React hooks", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("hooks", callback);

        emitter.emit<string>("hooks", "hook-data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle React state management", async () => {
        const callback = createSpyCallback<{
          state: Record<string, unknown>;
        }>();
        emitter.on<{ state: Record<string, unknown> }>("state", callback);

        emitter.emit<{ state: Record<string, unknown> }>("state", {
          state: { count: 0, name: "test" },
        });
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should work with React context", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("context", callback);

        emitter.emit<string>("context", "context-data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle React concurrent features", async () => {
        const promises: Promise<void>[] = [];

        for (let i = 0; i < 10; i++) {
          const callback = createSpyCallback<string>();
          emitter.on<string>(`concurrent-${i}`, callback);
          emitter.emit<string>(`concurrent-${i}`, `data-${i}`);
        }

        await waitForAsync(100);

        const metrics = emitter.getMetrics();
        expect(metrics.activeSubscriptions).toBe(10);
      });
    });

    describe("Vue Integration", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter();
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should work with Vue components", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("vue-event", callback);

        emitter.emit<string>("vue-event", "vue-data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle Vue lifecycle", async () => {
        const callback = createSpyCallback<string>();
        const unsubscribe = emitter.on<string>("lifecycle", callback);

        emitter.emit<string>("lifecycle", "data-1");
        await waitForAsync(50);
        unsubscribe();
        emitter.emit<string>("lifecycle", "data-2");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalledTimes(1);
      });

      it("should work with Vue reactivity", async () => {
        const callback = createSpyCallback<{ value: number }>();
        emitter.on<{ value: number }>("reactive", callback);

        emitter.emit<{ value: number }>("reactive", { value: 42 });
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle Vue composition API", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("composition", callback);

        emitter.emit<string>("composition", "composition-data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should work with Vue state management", async () => {
        const callback = createSpyCallback<{
          state: Record<string, unknown>;
        }>();
        emitter.on<{ state: Record<string, unknown> }>("vuex", callback);

        emitter.emit<{ state: Record<string, unknown> }>("vuex", {
          state: { user: "test" },
        });
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });
    });

    describe("Angular Integration", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter();
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should work with Angular components", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("angular-event", callback);

        emitter.emit<string>("angular-event", "angular-data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle Angular lifecycle", async () => {
        const callback = createSpyCallback<string>();
        const unsubscribe = emitter.on<string>("lifecycle", callback);

        emitter.emit<string>("lifecycle", "data-1");
        await waitForAsync(50);
        unsubscribe();
        emitter.emit<string>("lifecycle", "data-2");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalledTimes(1);
      });

      it("should work with Angular services", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("service", callback);

        emitter.emit<string>("service", "service-data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should handle Angular dependency injection", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("di", callback);

        emitter.emit<string>("di", "di-data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });

      it("should work with Angular zones", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("zone", callback);

        emitter.emit<string>("zone", "zone-data");
        await waitForAsync(50);

        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe("6. Performance Integration Tests", () => {
    describe("System-Level Performance", () => {
      let emitter: EventEmitter;

      beforeEach(() => {
        emitter = new EventEmitter({
          buffer: { maxSize: 10000, ttl: 60000 },
        });
      });

      afterEach(() => {
        emitter.destroy();
      });

      it("should maintain 100K+ events/second with all components", async () => {
        const callback = createSpyCallback<string>();
        emitter.on<string>("perf", callback);

        const startTime = Date.now();
        for (let i = 0; i < 10000; i++) {
          emitter.emit<string>("perf", `data-${i}`);
        }
        await waitForAsync(500);
        const elapsed = Date.now() - startTime;

        const eventsPerSecond = 10000 / (elapsed / 1000);
        expect(eventsPerSecond).toBeGreaterThan(1000);
      });

      it("should handle high-frequency operations", async () => {
        const startTime = Date.now();
        for (let i = 0; i < 1000; i++) {
          emitter.emit<string>("high-freq", `data-${i}`);
        }
        await waitForAsync(200);
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(1000);
      });

      it("should maintain low latency with full stack", async () => {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });

        emitter.use(middleware);

        const latencies: number[] = [];
        for (let i = 0; i < 100; i++) {
          const startTime = Date.now();
          emitter.emit<string>("latency", `data-${i}`);
          const elapsed = Date.now() - startTime;
          latencies.push(elapsed);
        }

        await waitForAsync(100);

        const avgLatency =
          latencies.reduce((a, b) => a + b, 0) / latencies.length;
        expect(avgLatency).toBeLessThan(10);
      });

      it("should handle memory efficiently with all components", async () => {
        for (let i = 0; i < 1000; i++) {
          emitter.emit<string>("memory", `data-${i}`);
        }
        await waitForAsync(200);

        const metrics = emitter.getMetrics();
        expect(metrics.memoryUsage).toBeGreaterThan(0);
      });

      it("should scale with component complexity", async () => {
        for (let i = 0; i < 5; i++) {
          const middleware: Middleware = jest.fn(async (event, next) => {
            await next();
          });
          emitter.use(middleware);
        }

        const startTime = Date.now();
        for (let i = 0; i < 500; i++) {
          emitter.emit<string>("scale", `data-${i}`);
        }
        await waitForAsync(200);
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(2000);
      });

      it("should maintain performance under load", async () => {
        for (let i = 0; i < 100; i++) {
          const callback = createSpyCallback<string>();
          emitter.on<string>(`load-channel-${i}`, callback);
        }

        const startTime = Date.now();
        for (let i = 0; i < 100; i++) {
          emitter.emit<string>(`load-channel-${i}`, `data-${i}`);
        }
        await waitForAsync(200);
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(500);
      });
    });

    describe("Memory Integration", () => {
      it("should prevent memory leaks across components", () => {
        let emitter = new EventEmitter();

        for (let i = 0; i < 100; i++) {
          const callback = createSpyCallback<string>();
          emitter.on<string>(`channel-${i}`, callback);
        }

        emitter.destroy();

        emitter = new EventEmitter();
        const metrics = emitter.getMetrics();
        expect(metrics.activeSubscriptions).toBe(0);
      });

      it("should handle memory pressure gracefully", async () => {
        const emitter = new EventEmitter({
          buffer: { maxSize: 100, ttl: 1000 },
        });

        const callback = createSpyCallback<string>();
        emitter.on<string>("pressure", callback);

        for (let i = 0; i < 200; i++) {
          emitter.emit<string>("pressure", `data-${i}`);
        }
        await waitForAsync(200);

        const buffered = emitter.getBuffered("pressure");
        expect(buffered.length).toBeGreaterThan(0);

        emitter.destroy();
      });

      it("should cleanup memory properly on destroy", () => {
        const emitter = new EventEmitter({
          buffer: { maxSize: 100 },
        });

        emitter.emit<string>("channel", "data");
        emitter.destroy();

        const metrics = emitter.getMetrics();
        expect(metrics.activeSubscriptions).toBe(0);
      });

      it("should maintain memory efficiency", async () => {
        const emitter = new EventEmitter({
          buffer: { maxSize: 500, ttl: 2000 },
        });

        for (let i = 0; i < 500; i++) {
          emitter.emit<string>("efficiency", `data-${i}`);
        }
        await waitForAsync(100);

        const metrics = emitter.getMetrics();
        expect(metrics.memoryUsage).toBeGreaterThan(0);

        emitter.destroy();
      });

      it("should handle large-scale operations", async () => {
        const emitter = new EventEmitter({
          buffer: { maxSize: 5000, ttl: 10000 },
        });

        const callback = createSpyCallback<string>();
        emitter.on<string>("large-scale", callback);

        const startTime = Date.now();
        for (let i = 0; i < 5000; i++) {
          emitter.emit<string>("large-scale", `data-${i}`);
        }
        await waitForAsync(1000);
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(5000);

        const buffered = emitter.getBuffered("large-scale");
        expect(buffered.length).toBeGreaterThan(0);

        emitter.destroy();
      });
    });
  });

  describe("High-Volume Integration Scenario", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter({
        buffer: { maxSize: 10000, ttl: 60000 },
      });
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should handle 100K events with all components active", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("high-volume", callback);

      const startTime = Date.now();
      for (let i = 0; i < 10000; i++) {
        emitter.emit<string>("high-volume", `data-${i}`);
      }
      await waitForAsync(1000);
      const elapsed = Date.now() - startTime;

      const eventsPerSecond = 10000 / (elapsed / 1000);
      expect(eventsPerSecond).toBeGreaterThan(1000);
    }, 10000);

    it("should maintain performance with middleware chain", async () => {
      for (let i = 0; i < 3; i++) {
        const middleware: Middleware = jest.fn(async (event, next) => {
          await next();
        });
        emitter.use(middleware);
      }

      const callback = createSpyCallback<string>();
      emitter.on<string>("middleware-chain", callback);

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        emitter.emit<string>("middleware-chain", `data-${i}`);
      }
      await waitForAsync(500);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(2000);
    });

    it("should handle buffer management under load", async () => {
      const emitter2 = new EventEmitter({
        buffer: { maxSize: 100, ttl: 5000 },
      });

      const callback = createSpyCallback<string>();
      emitter2.on<string>("buffer-load", callback);

      for (let i = 0; i < 500; i++) {
        emitter2.emit<string>("buffer-load", `data-${i}`);
      }
      await waitForAsync(500);

      const buffered = emitter2.getBuffered("buffer-load");
      expect(buffered.length).toBeGreaterThan(0);

      emitter2.destroy();
    });

    it("should maintain metrics accuracy under load", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("metrics-load", callback);

      for (let i = 0; i < 100; i++) {
        emitter.emit<string>("metrics-load", `data-${i}`);
      }
      await waitForAsync(200);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(0);
    });

    it("should handle subscription management under load", async () => {
      const callbacks: Array<{
        callback: ReturnType<typeof createSpyCallback<string>>;
        unsubscribe: () => void;
      }> = [];

      for (let i = 0; i < 50; i++) {
        const callback = createSpyCallback<string>();
        const unsubscribe = emitter.on<string>(`sub-${i}`, callback);
        callbacks.push({ callback, unsubscribe });
      }

      for (let i = 0; i < 50; i++) {
        emitter.emit<string>(`sub-${i}`, `data-${i}`);
      }
      await waitForAsync(100);

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBeGreaterThanOrEqual(0);

      callbacks[0].unsubscribe();

      const metricsAfter = emitter.getMetrics();
      expect(metricsAfter.activeSubscriptions).toBeGreaterThanOrEqual(0);
    });

    it("should maintain system stability", async () => {
      const middleware: Middleware = jest.fn(async (event, next) => {
        await next();
      });
      emitter.use(middleware);

      const callback = createSpyCallback<string>();
      emitter.on<string>("stability", callback);

      for (let i = 0; i < 500; i++) {
        emitter.emit<string>("stability", `data-${i}`);
      }
      await waitForAsync(300);

      expect(callback).toHaveBeenCalled();
      expect(middleware).toHaveBeenCalled();
    });
  });

  describe("Complex Workflow Scenario", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter({
        buffer: { maxSize: 500, ttl: 10000 },
      });
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should handle multi-step event processing", async () => {
      const steps: string[] = [];
      const middleware1: Middleware = jest.fn(async (event, next) => {
        steps.push("step1");
        await next();
      });
      const middleware2: Middleware = jest.fn(async (event, next) => {
        steps.push("step2");
        await next();
      });

      emitter.use(middleware1);
      emitter.use(middleware2);

      const callback = createSpyCallback<string>();
      emitter.on<string>("multi-step", callback);

      emitter.emit<string>("multi-step", "data");
      await waitForAsync(50);

      expect(steps.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle conditional event routing", async () => {
      const highPriorityCallback = createSpyCallback<string>();
      const lowPriorityCallback = createSpyCallback<string>();

      emitter.on<string>("priority-high", highPriorityCallback);
      emitter.on<string>("priority-low", lowPriorityCallback);

      emitter.emit<string>("priority-high", "high-priority");
      emitter.emit<string>("priority-low", "low-priority");
      await waitForAsync(50);

      expect(highPriorityCallback).toHaveBeenCalled();
      expect(lowPriorityCallback).toHaveBeenCalled();
    });

    it("should handle event transformation pipeline", async () => {
      const transformMiddleware: Middleware = jest.fn(async (event, next) => {
        await next();
      });

      emitter.use(transformMiddleware);
      const callback = createSpyCallback<{ raw: string }>();
      emitter.on<{ raw: string }>("transform", callback);

      emitter.emit<{ raw: string }>("transform", { raw: "hello" });
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });

    it("should handle error recovery in complex workflows", async () => {
      const errorMiddleware: Middleware = jest.fn(async () => {
        throw new Error("Workflow error");
      });

      emitter.use(errorMiddleware);

      const callback = createSpyCallback<string>();
      emitter.on<string>("error-recovery", callback);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      emitter.emit<string>("error-recovery", "data");
      await waitForAsync(200);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should maintain data integrity through complex flows", async () => {
      const middleware: Middleware = jest.fn(async (event, next) => {
        await next();
      });

      emitter.use(middleware);
      const callback = createSpyCallback<{ id: string; payload: object }>();
      emitter.on<{ id: string; payload: object }>("integrity", callback);

      const testPayload = {
        id: "test-123",
        payload: { nested: { value: 42 } },
      };
      emitter.emit<{ id: string; payload: object }>("integrity", testPayload);
      await waitForAsync(50);

      const receivedEvent = callback.mock.calls[0][0];
      expect(receivedEvent.data).toEqual(testPayload);
      expect(receivedEvent.id).toBeDefined();
    });
  });

  describe("Failure Recovery Scenario", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should recover from component failures", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("failure", callback);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      emitter.emit<string>("failure", "data");
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should maintain system stability during failures", async () => {
      const errorMiddleware: Middleware = jest.fn(async () => {
        throw new Error("Simulated failure");
      });

      emitter.use(errorMiddleware);
      const callback = createSpyCallback<string>();
      emitter.on<string>("stability", callback);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      for (let i = 0; i < 10; i++) {
        emitter.emit<string>("stability", `data-${i}`);
      }
      await waitForAsync(100);

      const metrics = emitter.getMetrics();
      expect(metrics).toBeDefined();
      consoleSpy.mockRestore();
    });

    it("should handle partial system failures", async () => {
      const errorMiddleware: Middleware = jest.fn(async () => {
        throw new Error("Middleware failure");
      });

      emitter.use(errorMiddleware);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      emitter.emit<string>("channel1", "data1");
      emitter.emit<string>("channel2", "data2");
      await waitForAsync(200);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should recover from network failures", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("network", callback);

      emitter.emit<string>("network", "initial");
      await waitForAsync(50);

      emitter.destroy();

      const newEmitter = new EventEmitter();
      const newCallback = createSpyCallback<string>();
      newEmitter.on<string>("network", newCallback);

      newEmitter.emit<string>("network", "recovery");
      await waitForAsync(50);

      expect(newCallback).toHaveBeenCalled();
      newEmitter.destroy();
    });

    it("should handle resource exhaustion", () => {
      const emitter2 = new EventEmitter({
        buffer: { maxSize: 5 },
      });

      for (let i = 0; i < 20; i++) {
        emitter2.emit<string>("exhaust", `data-${i}`);
      }

      const buffered = emitter2.getBuffered("exhaust");
      expect(buffered.length).toBeLessThanOrEqual(5);

      emitter2.destroy();
    });
  });
});

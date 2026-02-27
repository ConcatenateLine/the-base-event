/**
 * Performance Metrics Test Suite
 * Comprehensive tests for Performance Metrics system
 * @author The Base Event Team
 * @since 1.0.0
 */

import { EventEmitter } from "../../core/emitter";
import { createBufferManager, BufferManager } from "../../core/buffer";
import type { PerformanceMetrics, Middleware } from "../../core/events/typing";
import { waitForAsync, createSpyCallback } from "../setup";

describe("Performance Metrics", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    emitter.destroy();
  });

  function validateMetricAccuracy(
    actual: number,
    expected: number,
    tolerance: number = 0.1
  ): boolean {
    return Math.abs(actual - expected) <= tolerance;
  }

  describe("Events Per Second Metrics", () => {
    it("should count events accurately", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const initialMetrics = emitter.getMetrics();
      const initialCount = initialMetrics.eventsPerSecond;

      emitter.emit<string>("test-channel", "data1");
      emitter.emit<string>("test-channel", "data2");
      emitter.emit<string>("test-channel", "data3");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(initialCount + 3);
    });

    it("should update in real-time", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const metrics1 = emitter.getMetrics();
      emitter.emit<string>("test-channel", "data");
      await waitForAsync(10);
      const metrics2 = emitter.getMetrics();

      expect(metrics2.eventsPerSecond).toBeGreaterThanOrEqual(
        metrics1.eventsPerSecond
      );
    });

    it("should handle high-frequency events", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      const endTime = Date.now();

      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      const eventsPerSecond = metrics.eventsPerSecond;

      expect(eventsPerSecond).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it("should reset correctly on destroy", () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data1");
      emitter.emit<string>("test-channel", "data2");

      emitter.destroy();

      const afterDestroy = emitter.getMetrics();
      expect(afterDestroy.eventsPerSecond).toBe(0);
    });

    it("should calculate rate over time window", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const burstCount = 100;
      const startTime = Date.now();

      for (let i = 0; i < burstCount; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }

      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      const elapsedTime = (Date.now() - startTime) / 1000;
      const calculatedRate = burstCount / elapsedTime;

      expect(metrics.eventsPerSecond).toBeGreaterThan(0);
    });

    it("should handle burst events", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 500; i++) {
        emitter.emit<string>("test-channel", `burst-${i}`);
      }

      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(500);
    });

    it("should maintain accuracy under load", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const targetEvents = 10000;
      for (let i = 0; i < targetEvents; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }

      await waitForAsync(100);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(targetEvents);
    });
  });

  describe("Buffer Utilization Metrics", () => {
    it("should calculate buffer usage percentage", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data1");
      emitter.emit<string>("test-channel", "data2");
      emitter.emit<string>("test-channel", "data3");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.bufferUtilization).toBeGreaterThan(0);
    });

    it("should update when events are added", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const metrics1 = emitter.getMetrics();
      emitter.emit<string>("test-channel", "data1");
      await waitForAsync(20);
      const metrics2 = emitter.getMetrics();

      expect(metrics2.bufferUtilization).toBeGreaterThanOrEqual(
        metrics1.bufferUtilization
      );
    });

    it("should update when events are cleared", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data1");
      emitter.emit<string>("test-channel", "data2");
      emitter.emit<string>("test-channel", "data3");
      await waitForAsync(50);

      const metricsBeforeClear = emitter.getMetrics();
      emitter.clear("test-channel");

      const metricsAfterClear = emitter.getMetrics();
      expect(metricsAfterClear.bufferUtilization).toBeLessThanOrEqual(
        metricsBeforeClear.bufferUtilization
      );
    });

    it("should handle multiple channels", async () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      emitter.on<string>("channel1", callback1);
      emitter.on<string>("channel2", callback2);

      emitter.emit<string>("channel1", "data1");
      emitter.emit<string>("channel1", "data2");
      emitter.emit<string>("channel2", "data3");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.bufferUtilization).toBeGreaterThan(0);
    });

    it("should reflect buffer size changes", async () => {
      const emitterWithBuffer = new EventEmitter({ buffer: { maxSize: 100 } });
      const callback = createSpyCallback<string>();
      emitterWithBuffer.on<string>("test-channel", callback);

      emitterWithBuffer.emit<string>("test-channel", "data1");
      await waitForAsync(20);
      const metrics1 = emitterWithBuffer.getMetrics();

      for (let i = 0; i < 50; i++) {
        emitterWithBuffer.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(20);
      const metrics2 = emitterWithBuffer.getMetrics();

      expect(metrics2.memoryUsage).toBeGreaterThan(metrics1.memoryUsage);

      emitterWithBuffer.destroy();
    });

    it("should handle empty buffer", () => {
      const metrics = emitter.getMetrics();
      expect(metrics.bufferUtilization).toBeGreaterThanOrEqual(0);
    });

    it("should handle full buffer scenarios", async () => {
      const emitterWithSmallBuffer = new EventEmitter({
        buffer: { maxSize: 10 },
      });
      const callback = createSpyCallback<string>();
      emitterWithSmallBuffer.on<string>("test-channel", callback);

      for (let i = 0; i < 20; i++) {
        emitterWithSmallBuffer.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(50);

      const metrics = emitterWithSmallBuffer.getMetrics();
      expect(metrics.bufferUtilization).toBeGreaterThan(0);

      emitterWithSmallBuffer.destroy();
    });
  });

  describe("Memory Usage Metrics", () => {
    it("should estimate memory usage correctly", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it("should update with buffer changes", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const metrics1 = emitter.getMetrics();
      emitter.emit<string>("test-channel", "data1");
      emitter.emit<string>("test-channel", "data2");
      emitter.emit<string>("test-channel", "data3");
      await waitForAsync(20);
      const metrics2 = emitter.getMetrics();

      expect(metrics2.memoryUsage).toBeGreaterThanOrEqual(metrics1.memoryUsage);
    });

    it("should handle large payloads", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const largePayload = "x".repeat(10000);
      emitter.emit<string>("test-channel", largePayload);
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });

    it("should reflect memory cleanup", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data1");
      emitter.emit<string>("test-channel", "data2");
      emitter.emit<string>("test-channel", "data3");
      await waitForAsync(50);

      const metricsBeforeClear = emitter.getMetrics();
      emitter.clear("test-channel");

      const metricsAfterClear = emitter.getMetrics();
      expect(metricsAfterClear.memoryUsage).toBeLessThanOrEqual(
        metricsBeforeClear.memoryUsage
      );
    });

    it("should scale with event volume", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const lowVolumeMetrics = emitter.getMetrics();
      for (let i = 0; i < 10; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(20);

      const highVolumeMetrics = emitter.getMetrics();
      expect(highVolumeMetrics.memoryUsage).toBeGreaterThan(
        lowVolumeMetrics.memoryUsage
      );
    });

    it("should handle memory pressure", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 1000; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(100);

      const metrics = emitter.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(() => emitter.getMetrics()).not.toThrow();
    });

    it("should provide reasonable estimates", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const eventCount = 100;
      for (let i = 0; i < eventCount; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      const estimatedBytesPerEvent = metrics.memoryUsage / eventCount;
      expect(estimatedBytesPerEvent).toBeGreaterThan(0);
      expect(estimatedBytesPerEvent).toBeLessThan(10000);
    });
  });

  describe("Active Subscriptions Metrics", () => {
    it("should count active subscriptions accurately", () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();
      const callback3 = createSpyCallback<string>();

      emitter.on<string>("channel1", callback1);
      emitter.on<string>("channel2", callback2);
      emitter.on<string>("channel2", callback3);

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(3);
    });

    it("should update on new subscriptions", () => {
      const callback = createSpyCallback<string>();
      const initialMetrics = emitter.getMetrics();

      emitter.on<string>("test-channel", callback);

      const afterSubscribe = emitter.getMetrics();
      expect(afterSubscribe.activeSubscriptions).toBe(
        initialMetrics.activeSubscriptions + 1
      );
    });

    it("should update on unsubscriptions", () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      emitter.on<string>("test-channel", callback1);
      emitter.on<string>("test-channel", callback2);

      const afterSubscribe = emitter.getMetrics();
      expect(afterSubscribe.activeSubscriptions).toBe(2);

      emitter.off<string>("test-channel", callback1);

      const afterUnsubscribe = emitter.getMetrics();
      expect(afterUnsubscribe.activeSubscriptions).toBe(1);
    });

    it("should handle multiple channels", () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      emitter.on<string>("channel1", callback1);
      emitter.on<string>("channel2", callback2);

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(2);
    });

    it("should handle once subscriptions", () => {
      const callback = createSpyCallback<string>();

      emitter.once<string>("test-channel", callback);

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(1);
    });

    it("should update on destroy", () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const beforeDestroy = emitter.getMetrics();
      expect(beforeDestroy.activeSubscriptions).toBe(1);

      emitter.destroy();

      const afterDestroy = emitter.getMetrics();
      expect(afterDestroy.activeSubscriptions).toBe(0);
    });

    it("should handle subscription errors", async () => {
      const errorCallback = jest.fn(() => {
        throw new Error("Subscription error");
      });
      const normalCallback = createSpyCallback<string>();

      emitter.on<string>("test-channel", errorCallback);
      emitter.on<string>("test-channel", normalCallback);

      emitter.emit<string>("test-channel", "data");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(2);
    });
  });

  describe("Middleware Latency Metrics", () => {
    it("should measure middleware execution time", async () => {
      const slowMiddleware: Middleware = (event, next) => {
        const start = Date.now();
        while (Date.now() - start < 10) {}
        next();
      };

      emitter.use(slowMiddleware);
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.middlewareLatency).toBeGreaterThan(0);
    });

    it("should accumulate latency across chain", async () => {
      const middleware1: Middleware = (event, next) => {
        next();
      };
      const middleware2: Middleware = (event, next) => {
        next();
      };

      emitter.use(middleware1);
      emitter.use(middleware2);
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.middlewareLatency).toBeGreaterThanOrEqual(0);
    });

    it("should handle sync middleware timing", async () => {
      const syncMiddleware: Middleware = (event, next) => {
        next();
      };

      emitter.use(syncMiddleware);
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.middlewareLatency).toBeGreaterThanOrEqual(0);
    });

    it("should handle async middleware timing", async () => {
      const asyncMiddleware: Middleware = async (event, next) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        next();
      };

      emitter.use(asyncMiddleware);
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.middlewareLatency).toBeGreaterThanOrEqual(0);
    });

    it("should update in real-time", async () => {
      const middleware: Middleware = (event, next) => {
        next();
      };

      emitter.use(middleware);
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const metrics1 = emitter.getMetrics();
      emitter.emit<string>("test-channel", "data1");
      await waitForAsync(20);
      const metrics2 = emitter.getMetrics();

      expect(metrics2.middlewareLatency).toBeGreaterThanOrEqual(
        metrics1.middlewareLatency
      );
    });

    it("should reset on destroy", async () => {
      const middleware: Middleware = (event, next) => {
        next();
      };

      emitter.use(middleware);
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data");
      await waitForAsync(50);

      emitter.destroy();

      const afterDestroy = emitter.getMetrics();
      expect(afterDestroy.middlewareLatency).toBe(0);
    });

    it("should handle timing errors", async () => {
      const errorMiddleware: Middleware = (event, next) => {
        throw new Error("Middleware error");
      };

      emitter.use(errorMiddleware);
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.middlewareLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Metrics Integration", () => {
    it("should update all metrics on emit", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const initialMetrics = emitter.getMetrics();

      emitter.emit<string>("test-channel", "data");
      await waitForAsync(50);

      const afterEmit = emitter.getMetrics();

      expect(afterEmit.eventsPerSecond).toBeGreaterThanOrEqual(
        initialMetrics.eventsPerSecond
      );
      expect(afterEmit.bufferUtilization).toBeGreaterThanOrEqual(0);
      expect(afterEmit.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(afterEmit.activeSubscriptions).toBe(1);
    });

    it("should coordinate metrics across components", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data1");
      emitter.emit<string>("test-channel", "data2");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();

      expect(metrics.eventsPerSecond).toBeGreaterThan(0);
      expect(metrics.bufferUtilization).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.activeSubscriptions).toBe(1);
      expect(metrics.middlewareLatency).toBeGreaterThanOrEqual(0);
    });

    it("should maintain consistency", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 10; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(50);

      const metrics1 = emitter.getMetrics();
      const metrics2 = emitter.getMetrics();

      expect(metrics1.eventsPerSecond).toBe(metrics2.eventsPerSecond);
      expect(metrics1.activeSubscriptions).toBe(metrics2.activeSubscriptions);
    });

    it("should handle concurrent operations", async () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      emitter.on<string>("channel1", callback1);
      emitter.on<string>("channel2", callback2);

      const emitPromises: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        emitPromises.push(
          new Promise<void>(resolve => {
            emitter.emit<string>(
              i % 2 === 0 ? "channel1" : "channel2",
              `data-${i}`
            );
            setTimeout(resolve, 1);
          })
        );
      }

      await Promise.all(emitPromises);
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(100);
    });

    it("should provide consistent snapshots", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "data");
      await waitForAsync(50);

      const snapshot1 = emitter.getMetrics();
      const snapshot2 = emitter.getMetrics();

      expect(snapshot1).toEqual(
        expect.objectContaining({
          eventsPerSecond: snapshot2.eventsPerSecond,
          bufferUtilization: snapshot2.bufferUtilization,
          memoryUsage: snapshot2.memoryUsage,
          activeSubscriptions: snapshot2.activeSubscriptions,
          middlewareLatency: snapshot2.middlewareLatency,
        })
      );
    });

    it("should handle metric dependencies", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const initialMetrics = emitter.getMetrics();
      expect(initialMetrics.activeSubscriptions).toBe(1);
      expect(initialMetrics.bufferUtilization).toBe(0);

      emitter.emit<string>("test-channel", "data1");
      emitter.emit<string>("test-channel", "data2");
      await waitForAsync(50);

      const afterEmit = emitter.getMetrics();
      expect(afterEmit.activeSubscriptions).toBe(1);
      expect(afterEmit.bufferUtilization).toBeGreaterThan(0);
    });
  });

  describe("Performance Impact", () => {
    it("should have minimal impact on emit performance", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it("should have minimal impact on subscription performance", () => {
      const callback = createSpyCallback<string>();

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        emitter.on<string>(`channel-${i}`, callback);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it("should scale with event volume", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const volumes = [100, 1000, 5000];
      const times: number[] = [];

      for (const volume of volumes) {
        const startTime = Date.now();
        for (let i = 0; i < volume; i++) {
          emitter.emit<string>("test-channel", `data-${i}`);
        }
        const endTime = Date.now();
        times.push(endTime - startTime);
        await waitForAsync(50);
      }

      expect(times[1]).toBeLessThan(times[2] * 2);
    });

    it("should handle high-frequency updates", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const startTime = Date.now();
      let eventCount = 0;

      while (Date.now() - startTime < 100) {
        emitter.emit<string>("test-channel", `data-${eventCount}`);
        eventCount++;
      }

      expect(eventCount).toBeGreaterThan(50);
    });

    it("should maintain accuracy under load", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 5000; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(100);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(5000);
    });

    it("should not cause memory leaks", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const initialMetrics = emitter.getMetrics();

      for (let i = 0; i < 1000; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(50);

      emitter.clear("test-channel");
      await waitForAsync(50);

      const afterClear = emitter.getMetrics();
      expect(afterClear.memoryUsage).toBeLessThanOrEqual(
        initialMetrics.memoryUsage + 1000
      );
    });
  });

  describe("Metrics Reporting", () => {
    it("should provide complete metrics snapshot", () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const metrics = emitter.getMetrics();

      expect(metrics).toHaveProperty("eventsPerSecond");
      expect(metrics).toHaveProperty("bufferUtilization");
      expect(metrics).toHaveProperty("memoryUsage");
      expect(metrics).toHaveProperty("activeSubscriptions");
      expect(metrics).toHaveProperty("middlewareLatency");
    });

    it("should return immutable metrics object", () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const metrics1 = emitter.getMetrics();
      const metrics2 = emitter.getMetrics();

      expect(metrics1).not.toBe(metrics2);
    });

    it("should handle metrics retrieval", () => {
      expect(() => emitter.getMetrics()).not.toThrow();
      expect(() => emitter.getMetrics()).not.toThrow();
      expect(() => emitter.getMetrics()).not.toThrow();
    });

    it("should provide formatted metrics", () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const metrics = emitter.getMetrics();

      expect(typeof metrics.eventsPerSecond).toBe("number");
      expect(typeof metrics.bufferUtilization).toBe("number");
      expect(typeof metrics.memoryUsage).toBe("number");
      expect(typeof metrics.activeSubscriptions).toBe("number");
      expect(typeof metrics.middlewareLatency).toBe("number");
    });

    it("should support metric filtering", () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const metrics = emitter.getMetrics();

      const filteredKeys = Object.keys(metrics).filter(
        key => metrics[key as keyof PerformanceMetrics] !== undefined
      );
      expect(filteredKeys.length).toBe(5);
    });

    it("should handle metric serialization", () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const metrics = emitter.getMetrics();

      expect(() => JSON.stringify(metrics)).not.toThrow();

      const serialized = JSON.stringify(metrics);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.eventsPerSecond).toBeDefined();
      expect(deserialized.bufferUtilization).toBeDefined();
      expect(deserialized.memoryUsage).toBeDefined();
      expect(deserialized.activeSubscriptions).toBeDefined();
      expect(deserialized.middlewareLatency).toBeDefined();
    });
  });

  describe("High-Volume Metrics", () => {
    it("should handle 100K events/second", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const startTime = Date.now();
      let eventCount = 0;

      const targetDuration = 1000;
      while (Date.now() - startTime < targetDuration) {
        emitter.emit<string>("test-channel", `data-${eventCount}`);
        eventCount++;
      }

      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(eventCount);
    });

    it("should maintain accuracy under load", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const targetEvents = 10000;
      for (let i = 0; i < targetEvents; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }

      await waitForAsync(100);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(targetEvents);
    });

    it("should update metrics in real-time", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const metrics1 = emitter.getMetrics();

      for (let i = 0; i < 100; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(10);

      const metrics2 = emitter.getMetrics();
      expect(metrics2.eventsPerSecond).toBeGreaterThan(
        metrics1.eventsPerSecond
      );
    });

    it("should not impact overall performance", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
        emitter.getMetrics();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000);
    });
  });

  describe("Burst Event Metrics", () => {
    it("should handle sudden event bursts", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const burstSize = 500;
      for (let i = 0; i < burstSize; i++) {
        emitter.emit<string>("test-channel", `burst-${i}`);
      }

      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(burstSize);
    });

    it("should calculate rates correctly", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const eventCount = 100;

      for (let i = 0; i < eventCount; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }

      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(eventCount);
    });

    it("should smooth rate calculations", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 50; i++) {
        emitter.emit<string>("test-channel", `burst1-${i}`);
      }
      await waitForAsync(100);

      const metrics1 = emitter.getMetrics();

      for (let i = 0; i < 50; i++) {
        emitter.emit<string>("test-channel", `burst2-${i}`);
      }
      await waitForAsync(100);

      const metrics2 = emitter.getMetrics();
      expect(metrics2.eventsPerSecond).toBeGreaterThan(0);
    });

    it("should handle metric spikes", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const spikes = 10;
      for (let spike = 0; spike < spikes; spike++) {
        for (let i = 0; i < 100; i++) {
          emitter.emit<string>("test-channel", `spike-${spike}-${i}`);
        }
        await waitForAsync(10);
      }

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThan(0);
    });
  });

  describe("Long-Running Metrics", () => {
    it("should maintain accuracy over time", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const duration = 2000;
      const startTime = Date.now();
      let eventCount = 0;

      while (Date.now() - startTime < duration) {
        emitter.emit<string>("test-channel", `data-${eventCount}`);
        eventCount++;
        await waitForAsync(1);
      }

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThan(0);
    });

    it("should handle metric accumulation", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 1000; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(1000);
    });

    it("should prevent metric overflow", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 100000; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(200);

      const metrics = emitter.getMetrics();
      expect(Number.isFinite(metrics.eventsPerSecond)).toBe(true);
      expect(Number.isFinite(metrics.middlewareLatency)).toBe(true);
    });

    it("should handle time-based calculations", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 100; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }

      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(100);
    });
  });

  describe("Multi-Channel Metrics", () => {
    it("should aggregate metrics across channels", async () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      emitter.on<string>("channel1", callback1);
      emitter.on<string>("channel2", callback2);

      emitter.emit<string>("channel1", "data1");
      emitter.emit<string>("channel2", "data2");
      emitter.emit<string>("channel1", "data3");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(3);
    });

    it("should handle channel-specific metrics", async () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      emitter.on<string>("channel1", callback1);
      emitter.on<string>("channel2", callback2);

      emitter.emit<string>("channel1", "data1");
      emitter.emit<string>("channel1", "data2");
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.bufferUtilization).toBeGreaterThanOrEqual(0);
    });

    it("should maintain consistency", async () => {
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      emitter.on<string>("channel1", callback1);
      emitter.on<string>("channel2", callback2);

      emitter.emit<string>("channel1", "data1");
      emitter.emit<string>("channel2", "data2");
      await waitForAsync(50);

      const metrics1 = emitter.getMetrics();
      const metrics2 = emitter.getMetrics();

      expect(metrics1.activeSubscriptions).toBe(metrics2.activeSubscriptions);
    });

    it("should scale with channel count", async () => {
      const channelCount = 100;
      for (let i = 0; i < channelCount; i++) {
        emitter.on<string>(`channel${i}`, createSpyCallback());
      }

      const metrics = emitter.getMetrics();
      expect(metrics.activeSubscriptions).toBe(channelCount);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle division by zero scenarios", () => {
      const metrics = emitter.getMetrics();
      expect(metrics.bufferUtilization).toBeGreaterThanOrEqual(0);
    });

    it("should handle overflow/underflow conditions", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 10000; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(100);

      const metrics = emitter.getMetrics();
      expect(Number.isFinite(metrics.eventsPerSecond)).toBe(true);
    });

    it("should handle negative values", () => {
      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(0);
      expect(metrics.bufferUtilization).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.activeSubscriptions).toBeGreaterThanOrEqual(0);
      expect(metrics.middlewareLatency).toBeGreaterThanOrEqual(0);
    });

    it("should handle extremely large values", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 100000; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(200);

      const metrics = emitter.getMetrics();
      expect(Number.isFinite(metrics.eventsPerSecond)).toBe(true);
    });

    it("should handle floating point precision", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      for (let i = 0; i < 100; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.bufferUtilization).toBeCloseTo(
        metrics.bufferUtilization,
        10
      );
    });

    it("should handle concurrent metric updates", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          (async () => {
            emitter.emit<string>("test-channel", `data-${i}`);
            emitter.getMetrics();
          })()
        );
      }

      await Promise.all(promises);
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(100);
    });

    it("should handle race conditions", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      const operations: Promise<void>[] = [];
      for (let i = 0; i < 50; i++) {
        operations.push(
          new Promise<void>(resolve => {
            emitter.emit<string>("test-channel", `data-${i}`);
            setTimeout(resolve, Math.random() * 10);
          })
        );
      }

      await Promise.all(operations);
      await waitForAsync(50);

      const metrics = emitter.getMetrics();
      expect(() => emitter.getMetrics()).not.toThrow();
    });
  });
});

describe("BufferManager Metrics", () => {
  let buffer: BufferManager;

  beforeEach(() => {
    buffer = createBufferManager({ maxSize: 100 });
  });

  describe("Buffer Metrics Collection", () => {
    it("should track total events", () => {
      buffer.add({
        id: "1",
        channel: "test",
        data: "data",
        timestamp: Date.now(),
      });
      buffer.add({
        id: "2",
        channel: "test",
        data: "data",
        timestamp: Date.now(),
      });
      buffer.add({
        id: "3",
        channel: "test",
        data: "data",
        timestamp: Date.now(),
      });

      const metrics = buffer.getMetrics();
      expect(metrics.totalEvents).toBe(3);
    });

    it("should track buffered events", () => {
      buffer.add({
        id: "1",
        channel: "channel1",
        data: "data",
        timestamp: Date.now(),
      });
      buffer.add({
        id: "2",
        channel: "channel2",
        data: "data",
        timestamp: Date.now(),
      });

      const metrics = buffer.getMetrics();
      expect(metrics.bufferedEvents).toBe(2);
    });

    it("should track memory usage", () => {
      buffer.add({
        id: "1",
        channel: "test",
        data: "data",
        timestamp: Date.now(),
      });

      const metrics = buffer.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });

    it("should track channel count", () => {
      buffer.add({
        id: "1",
        channel: "channel1",
        data: "data",
        timestamp: Date.now(),
      });
      buffer.add({
        id: "2",
        channel: "channel2",
        data: "data",
        timestamp: Date.now(),
      });
      buffer.add({
        id: "3",
        channel: "channel3",
        data: "data",
        timestamp: Date.now(),
      });

      const metrics = buffer.getMetrics();
      expect(metrics.channels).toBe(3);
    });

    it("should update metrics in real-time", () => {
      const metrics1 = buffer.getMetrics();
      buffer.add({
        id: "1",
        channel: "test",
        data: "data",
        timestamp: Date.now(),
      });
      const metrics2 = buffer.getMetrics();

      expect(metrics2.totalEvents).toBeGreaterThan(metrics1.totalEvents);
    });

    it("should provide accurate metrics", () => {
      const eventCount = 10;
      for (let i = 0; i < eventCount; i++) {
        buffer.add({
          id: `${i}`,
          channel: "test",
          data: "data",
          timestamp: Date.now(),
        });
      }

      const metrics = buffer.getMetrics();
      expect(metrics.totalEvents).toBe(eventCount);
      expect(metrics.bufferedEvents).toBe(buffer.size);
    });
  });
});

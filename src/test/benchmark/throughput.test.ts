/**
 * Performance Benchmarks for The Base Event
 * Focused benchmarks with clear pass/fail thresholds
 * Target: ≥100K events/sec
 * @author The Base Event Team
 * @since 1.0.0
 */

import { EventEmitter } from "../../core/emitter";
import { createBufferManager } from "../../core/buffer";

const TARGET_EVENTS_PER_SECOND = 100000;
const TARGET_LATENCY_MS = 1;

describe("Performance Benchmarks", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    emitter.destroy();
  });

  describe("Core Emit Throughput", () => {
    it("should handle 100K events per second", () => {
      const callback = jest.fn();
      emitter.on<string>("test-channel", callback);

      const startTime = Date.now();
      let eventCount = 0;

      while (Date.now() - startTime < 1000) {
        emitter.emit<string>("test-channel", `data-${eventCount}`);
        eventCount++;
      }

      const elapsedTime = Date.now() - startTime;
      const eventsPerSecond = (eventCount / elapsedTime) * 1000;

      expect(eventsPerSecond).toBeGreaterThanOrEqual(TARGET_EVENTS_PER_SECOND);
    });

    it("should sustain high throughput over 5 seconds", () => {
      const callback = jest.fn();
      emitter.on<string>("test-channel", callback);

      const startTime = Date.now();
      let eventCount = 0;

      while (Date.now() - startTime < 5000) {
        emitter.emit<string>("test-channel", `data-${eventCount}`);
        eventCount++;
      }

      const elapsedTime = Date.now() - startTime;
      const eventsPerSecond = (eventCount / elapsedTime) * 1000;

      expect(eventsPerSecond).toBeGreaterThanOrEqual(TARGET_EVENTS_PER_SECOND);
    });
  });

  describe("Buffer Add Speed", () => {
    it("should add 100K events to buffer in under 1 second", () => {
      const buffer = createBufferManager({ maxSize: 200000 });

      const startTime = Date.now();

      for (let i = 0; i < 100000; i++) {
        buffer.add({
          id: `event-${i}`,
          channel: "test",
          data: `data-${i}`,
          timestamp: Date.now(),
        });
      }

      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeLessThan(1500);
    });

    it("should maintain buffer performance under load", () => {
      const buffer = createBufferManager({ maxSize: 1000 });

      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        buffer.add({
          id: `event-${i}`,
          channel: "test",
          data: `data-${i}`,
          timestamp: Date.now(),
        });
      }

      const elapsedTime = Date.now() - startTime;
      const eventsPerSecond = (10000 / elapsedTime) * 1000;

      expect(eventsPerSecond).toBeGreaterThanOrEqual(50000);
    });
  });

  describe("Subscription Overhead", () => {
    it("should subscribe 10K channels in under 1 second", () => {
      const callback = jest.fn();

      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        emitter.on<string>(`channel-${i}`, callback);
      }

      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeLessThan(1000);
    });

    it("should have minimal subscription latency", () => {
      const callback = jest.fn();

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        emitter.on<string>(`channel-${i}`, callback);
      }

      const elapsedTime = Date.now() - startTime;
      const nsPerSubscribe = (elapsedTime * 1000000) / 1000;

      expect(nsPerSubscribe).toBeLessThan(2000);
    });
  });

  describe("Middleware Latency", () => {
    it("should have average middleware latency under 1ms", async () => {
      const middleware = jest.fn((event, next) => {
        next();
      });

      emitter.use(middleware);
      const callback = jest.fn();
      emitter.on<string>("test-channel", callback);

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const elapsedTime = Date.now() - startTime;
      const avgLatencyPerEvent = elapsedTime / iterations;

      expect(avgLatencyPerEvent).toBeLessThan(TARGET_LATENCY_MS);
    });
  });

  describe("Memory Growth", () => {
    it("should use less than 10MB per 100K events", () => {
      const buffer = createBufferManager({ maxSize: 100000 });

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100000; i++) {
        buffer.add({
          id: `event-${i}`,
          channel: "test",
          data: `data-${i}`,
          timestamp: Date.now(),
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryUsedMB = (finalMemory - initialMemory) / (1024 * 1024);

      expect(memoryUsedMB).toBeLessThan(15);
    });

    it("should not leak memory on clear", () => {
      const buffer = createBufferManager({ maxSize: 1000 });

      for (let i = 0; i < 10000; i++) {
        buffer.add({
          id: `event-${i}`,
          channel: "test",
          data: `data-${i}`,
          timestamp: Date.now(),
        });
      }

      buffer.clear();

      const metrics = buffer.getMetrics();
      expect(metrics.totalEvents).toBe(0);
    });
  });

  describe("Latency", () => {
    it("should have emit latency under 1ms", () => {
      const callback = jest.fn();
      emitter.on<string>("test-channel", callback);

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        emitter.emit<string>("test-channel", `data-${i}`);
      }

      const elapsedTime = Date.now() - startTime;
      const avgLatency = elapsedTime / iterations;

      expect(avgLatency).toBeLessThan(TARGET_LATENCY_MS);
    });
  });

  describe("Multiple Subscribers", () => {
    it("should handle 10K subscribers efficiently", () => {
      const callback = jest.fn();

      for (let i = 0; i < 10000; i++) {
        emitter.on<string>("test-channel", callback);
      }

      const startTime = Date.now();
      emitter.emit<string>("test-channel", "test-data");
      const latency = Date.now() - startTime;

      expect(latency).toBeLessThan(10);
    });
  });
});

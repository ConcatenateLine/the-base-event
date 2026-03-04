/**
 * React Adapter Tests
 * Tests for useNotificationChannel hook
 * @author The Base Event Team
 * @since 1.0.0
 */

import { EventEmitter, createEventEmitter } from "../../core";

describe("React Adapter - useNotificationChannel", () => {
  describe("exports", () => {
    it("should export useNotificationChannel", () => {
      const adapter = require("../../adapters/react") as {
        useNotificationChannel: unknown;
      };
      expect(adapter.useNotificationChannel).toBeDefined();
    });

    it("should export useNotificationSubscription", () => {
      const adapter = require("../../adapters/react") as {
        useNotificationSubscription: unknown;
      };
      expect(adapter.useNotificationSubscription).toBeDefined();
    });

    it("should export createEventEmitter", () => {
      const adapter = require("../../adapters/react") as {
        createEventEmitter: unknown;
      };
      expect(adapter.createEventEmitter).toBeDefined();
    });

    it("should export EventEmitter", () => {
      const adapter = require("../../adapters/react") as {
        EventEmitter: unknown;
      };
      expect(adapter.EventEmitter).toBeDefined();
    });
  });

  describe("EventEmitter", () => {
    it("should create an EventEmitter instance", () => {
      const { createEventEmitter } = require("../../adapters/react") as {
        createEventEmitter: () => EventEmitter;
      };
      const emitter = createEventEmitter();

      expect(emitter).toBeInstanceOf(EventEmitter);
      emitter.destroy();
    });

    it("should accept configuration options", () => {
      const { createEventEmitter } = require("../../adapters/react") as {
        createEventEmitter: (
          config?: { buffer: { maxSize: number; ttl: number } }
        ) => EventEmitter;
      };
      const emitter = createEventEmitter({
        buffer: {
          maxSize: 500,
          ttl: 60000,
        },
      });

      expect(emitter).toBeInstanceOf(EventEmitter);
      emitter.destroy();
    });

    it("should emit and subscribe to events", async () => {
      const { createEventEmitter } = require("../../adapters/react") as {
        createEventEmitter: () => EventEmitter;
      };
      const emitter = createEventEmitter();

      const callback = jest.fn();
      emitter.on("test-channel", callback);

      emitter.emit("test-channel", "hello");

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe("hello");

      emitter.destroy();
    });

    it("should handle multiple subscribers", async () => {
      const { createEventEmitter } = require("../../adapters/react") as {
        createEventEmitter: () => EventEmitter;
      };
      const emitter = createEventEmitter();

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      emitter.on("test-channel", callback1);
      emitter.on("test-channel", callback2);

      emitter.emit("test-channel", "hello");

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      emitter.destroy();
    });
  });

  describe("useNotificationChannel - type definitions", () => {
    it("should export useNotificationChannel function", () => {
      const reactAdapter = require("../../adapters/react/useNotificationChannel");

      expect(reactAdapter.useNotificationChannel).toBeDefined();
      expect(typeof reactAdapter.useNotificationChannel).toBe("function");
    });
  });
});

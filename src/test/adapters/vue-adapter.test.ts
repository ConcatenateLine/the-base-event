/**
 * Vue Adapter Tests
 * Tests for useNotificationChannel composable
 * @author The Base Event Team
 * @since 1.0.0
 */

import { EventEmitter, createEventEmitter } from "../../core";
import { waitForAsync } from "../setup";

describe("Vue Adapter - useNotificationChannel", () => {
  describe("exports", () => {
    it("should export useNotificationChannel", () => {
      const adapter = require("../../adapters/vue") as {
        useNotificationChannel: unknown;
      };
      expect(adapter.useNotificationChannel).toBeDefined();
    });

    it("should export useNotificationSubscription", () => {
      const adapter = require("../../adapters/vue") as {
        useNotificationSubscription: unknown;
      };
      expect(adapter.useNotificationSubscription).toBeDefined();
    });

    it("should export createEventEmitter", () => {
      const adapter = require("../../adapters/vue") as {
        createEventEmitter: unknown;
      };
      expect(adapter.createEventEmitter).toBeDefined();
    });

    it("should export EventEmitter", () => {
      const adapter = require("../../adapters/vue") as {
        EventEmitter: unknown;
      };
      expect(adapter.EventEmitter).toBeDefined();
    });
  });

  describe("EventEmitter", () => {
    it("should create an EventEmitter instance", () => {
      const { createEventEmitter } = require("../../adapters/vue") as {
        createEventEmitter: () => EventEmitter;
      };
      const emitter = createEventEmitter();

      expect(emitter).toBeInstanceOf(EventEmitter);
      emitter.destroy();
    });

    it("should accept configuration options", () => {
      const { createEventEmitter } = require("../../adapters/vue") as {
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
      const { createEventEmitter } = require("../../adapters/vue") as {
        createEventEmitter: () => EventEmitter;
      };
      const emitter = createEventEmitter();

      const callback = jest.fn();
      emitter.on("test-channel", callback);

      emitter.emit("test-channel", "hello");

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe("hello");

      emitter.destroy();
    });

    it("should handle multiple subscribers", async () => {
      const { createEventEmitter } = require("../../adapters/vue") as {
        createEventEmitter: () => EventEmitter;
      };
      const emitter = createEventEmitter();

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      emitter.on("test-channel", callback1);
      emitter.on("test-channel", callback2);

      emitter.emit("test-channel", "hello");

      await waitForAsync(50);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      emitter.destroy();
    });
  });

  describe("useNotificationChannel - internal logic", () => {
    it("should return proper shape with events/lastEvent/subscribe/emit/clear methods", () => {
      const {
        useNotificationChannel,
      } = require("../../adapters/vue/useNotificationChannel") as {
        useNotificationChannel: <T>(options: {
          channel: string;
          emitter?: EventEmitter;
          replay?: boolean;
        }) => {
          events: { value: unknown[] };
          lastEvent: { value: unknown | null };
          subscribe: (cb: (event: unknown) => void) => () => void;
          emit: (data: unknown) => void;
          clear: () => void;
          emitter: EventEmitter;
        };
      };

      const emitter = createEventEmitter();
      const result = useNotificationChannel<string>({
        channel: "test-channel",
        emitter,
        replay: false,
      });

      expect(result).toHaveProperty("events");
      expect(result).toHaveProperty("lastEvent");
      expect(result).toHaveProperty("subscribe");
      expect(typeof result.subscribe).toBe("function");
      expect(result).toHaveProperty("emit");
      expect(typeof result.emit).toBe("function");
      expect(result).toHaveProperty("clear");
      expect(typeof result.clear).toBe("function");
      expect(result).toHaveProperty("emitter");
      expect(result.emitter).toBe(emitter);

      emitter.destroy();
    });

    it("should handle replay option correctly - replay enabled", async () => {
      const emitter = createEventEmitter();
      emitter.emit<string>("test-channel", "event-1");
      emitter.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      const callback = jest.fn();
      const {
        useNotificationChannel,
      } = require("../../adapters/vue/useNotificationChannel") as {
        useNotificationChannel: <T>(options: {
          channel: string;
          emitter?: EventEmitter;
          replay?: boolean;
        }) => { subscribe: (cb: (event: unknown) => void) => () => void };
      };

      const result = useNotificationChannel<string>({
        channel: "test-channel",
        emitter,
        replay: true,
      });

      result.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[0][0].data).toBe("event-1");
      expect(callback.mock.calls[1][0].data).toBe("event-2");

      emitter.destroy();
    });

    it("should update lastEvent when receiving events", async () => {
      const emitter = createEventEmitter();

      const {
        useNotificationChannel,
      } = require("../../adapters/vue/useNotificationChannel") as {
        useNotificationChannel: <T>(options: {
          channel: string;
          emitter?: EventEmitter;
          replay?: boolean;
        }) => {
          lastEvent: { value: unknown | null };
          emit: (data: unknown) => void;
        };
      };

      const result = useNotificationChannel<string>({
        channel: "test-channel",
        emitter,
        replay: false,
      });

      expect(result.lastEvent.value).toBeNull();

      result.emit("first");

      await waitForAsync(50);

      expect(result.lastEvent.value).not.toBeNull();
      expect((result.lastEvent.value as { data: string }).data).toBe("first");

      result.emit("second");

      await waitForAsync(50);

      expect((result.lastEvent.value as { data: string }).data).toBe("second");

      emitter.destroy();
    });

    it("should handle multiple channel subscriptions", async () => {
      const emitter = createEventEmitter();

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const {
        useNotificationChannel,
      } = require("../../adapters/vue/useNotificationChannel") as {
        useNotificationChannel: <T>(options: {
          channel: string;
          emitter?: EventEmitter;
          replay?: boolean;
        }) => { subscribe: (cb: (event: unknown) => void) => () => void; emit: (data: unknown) => void };
      };

      const result1 = useNotificationChannel<string>({
        channel: "channel-1",
        emitter,
        replay: false,
      });

      const result2 = useNotificationChannel<number>({
        channel: "channel-2",
        emitter,
        replay: false,
      });

      result1.subscribe(callback1);
      result2.subscribe(callback2);

      result1.emit("hello");
      result2.emit(42);

      await waitForAsync(50);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback1.mock.calls[0][0].data).toBe("hello");
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback2.mock.calls[0][0].data).toBe(42);

      emitter.destroy();
    });

    it("should return buffered events in events array", async () => {
      const emitter = createEventEmitter();
      emitter.emit<string>("test-channel", "event-1");
      emitter.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      const {
        useNotificationChannel,
      } = require("../../adapters/vue/useNotificationChannel") as {
        useNotificationChannel: <T>(options: {
          channel: string;
          emitter?: EventEmitter;
          replay?: boolean;
        }) => { events: { value: unknown[] } };
      };

      const result = useNotificationChannel<string>({
        channel: "test-channel",
        emitter,
        replay: false,
      });

      expect(result.events.value.length).toBe(2);
      expect((result.events.value[0] as { data: string }).data).toBe("event-1");
      expect((result.events.value[1] as { data: string }).data).toBe("event-2");

      emitter.destroy();
    });

    it("should clear events using clear method", async () => {
      const emitter = createEventEmitter();
      emitter.emit<string>("test-channel", "event-1");

      await waitForAsync(50);

      const {
        useNotificationChannel,
      } = require("../../adapters/vue/useNotificationChannel") as {
        useNotificationChannel: <T>(options: {
          channel: string;
          emitter?: EventEmitter;
          replay?: boolean;
        }) => { events: { value: unknown[] }; lastEvent: { value: unknown | null }; clear: () => void };
      };

      const result = useNotificationChannel<string>({
        channel: "test-channel",
        emitter,
        replay: false,
      });

      expect(result.events.value.length).toBe(1);

      result.clear();

      expect(result.events.value.length).toBe(0);
      expect(result.lastEvent.value).toBeNull();

      emitter.destroy();
    });

    it("should limit stored events to 100", async () => {
      const emitter = createEventEmitter();

      const {
        useNotificationChannel,
      } = require("../../adapters/vue/useNotificationChannel") as {
        useNotificationChannel: <T>(options: {
          channel: string;
          emitter?: EventEmitter;
          replay?: boolean;
        }) => { events: { value: unknown[] }; emit: (data: unknown) => void };
      };

      const result = useNotificationChannel<string>({
        channel: "test-channel",
        emitter,
        replay: false,
      });

      for (let i = 0; i < 150; i++) {
        result.emit(`event-${i}`);
      }

      await waitForAsync(50);

      expect(result.events.value.length).toBe(100);
      expect((result.events.value[0] as { data: string }).data).toBe("event-50");
      expect((result.events.value[99] as { data: string }).data).toBe("event-149");

      emitter.destroy();
    });
  });

  describe("useNotificationSubscription - internal logic", () => {
    it("should return lastEvent ref", () => {
      const emitter = createEventEmitter();

      const {
        useNotificationSubscription,
      } = require("../../adapters/vue/useNotificationChannel") as {
        useNotificationSubscription: (options: {
          channel: string;
          emitter?: EventEmitter;
          onEvent?: (event: unknown) => void;
          replay?: boolean;
        }) => { value: unknown | null };
      };

      const result = useNotificationSubscription({
        channel: "test-channel",
        emitter,
        replay: false,
      });

      expect(result).toHaveProperty("value");

      emitter.destroy();
    });
  });
});

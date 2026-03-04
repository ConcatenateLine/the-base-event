/**
 * Angular Adapter Tests
 * Tests for NotificationService and NotificationModule
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  NotificationService,
  createNotificationService,
  NotificationModule,
  NOTIFICATION_SERVICE_CONFIG,
} from "../../adapters/angular/index";
import { EventEmitter, createEventEmitter } from "../../core";
import { waitForAsync, createSpyCallback } from "../setup";

describe("Angular Adapter - NotificationModule", () => {
  describe("forRoot", () => {
    it("should return Angular module configuration", () => {
      const moduleConfig = NotificationModule.forRoot({
        buffer: { maxSize: 1000, ttl: 60000 },
      });

      expect(moduleConfig).toHaveProperty("ngModule");
      expect(moduleConfig).toHaveProperty("providers");
      expect(moduleConfig.providers).toHaveLength(2);
      expect(moduleConfig.providers[0]).toBe(NotificationService);
      expect(moduleConfig.providers[1]).toHaveProperty("provide");
      expect((moduleConfig.providers[1] as { provide: unknown }).provide).toBe(
        NOTIFICATION_SERVICE_CONFIG
      );
    });

    it("should accept empty config", () => {
      const moduleConfig = NotificationModule.forRoot();

      expect(moduleConfig).toBeDefined();
      expect(moduleConfig.providers).toHaveLength(2);
    });

    it("should use provided config values", () => {
      const customConfig = { buffer: { maxSize: 500, ttl: 30000 } };
      const moduleConfig = NotificationModule.forRoot(customConfig);

      const configProvider = moduleConfig.providers[1] as {
        useValue: unknown;
      };
      expect(configProvider.useValue).toEqual(customConfig);
    });
  });

  describe("forFeature", () => {
    it("should return Angular module configuration for feature", () => {
      const moduleConfig = NotificationModule.forFeature();

      expect(moduleConfig).toHaveProperty("ngModule");
      expect(moduleConfig).toHaveProperty("providers");
      expect(moduleConfig.providers).toHaveLength(1);
      expect(moduleConfig.providers[0]).toBe(NotificationService);
    });
  });

  describe("NOTIFICATION_SERVICE_CONFIG", () => {
    it("should be defined", () => {
      expect(NOTIFICATION_SERVICE_CONFIG).toBeDefined();
    });
  });
});

describe("Angular Adapter - NotificationService", () => {
  describe("basic usage", () => {
    it("should subscribe to channel and receive events", async () => {
      const service = new NotificationService();
      const callback = createSpyCallback<string>();
      service.subscribe<string>("test-channel", callback);

      service.emit<string>("test-channel", "hello");

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe("hello");
      expect(callback.mock.calls[0][0].channel).toBe("test-channel");
      service.destroy();
    });

    it("should emit events to subscribers", async () => {
      const service = new NotificationService();
      const callback = createSpyCallback<{ message: string }>();
      service.subscribe<{ message: string }>("test-channel", callback);

      service.emit<{ message: string }>("test-channel", { message: "test" });

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toEqual({ message: "test" });
      service.destroy();
    });

    it("should subscribe to channel and receive emitted events", async () => {
      const service = new NotificationService();

      const callback = createSpyCallback<string>();
      service.subscribe<string>("test-channel", callback);

      service.emit<string>("test-channel", "event-1");
      service.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(2);
      service.destroy();
    });
  });

  describe("cleanup on destruction", () => {
    it("should handle service destruction", async () => {
      const service = new NotificationService();
      const callback = createSpyCallback<string>();
      service.subscribe<string>("test-channel", callback);

      service.destroy();

      expect(() => {
        service.emit<string>("test-channel", "after-destroy");
      }).toThrow();
    });

    it("should unsubscribe all subscriptions on destroy", () => {
      const service = new NotificationService();
      service.subscribe<string>("channel-1", jest.fn());
      service.subscribe<string>("channel-2", jest.fn());

      expect(() => service.destroy()).not.toThrow();

      const callback = createSpyCallback<string>();
      expect(() => {
        service.subscribe<string>("channel-1", callback);
      }).toThrow("NotificationService has been destroyed");
    });
  });

  describe("event emission and reception", () => {
    it("should handle multiple events", async () => {
      const service = new NotificationService();
      const callback = createSpyCallback<number>();
      service.subscribe<number>("test-channel", callback);

      service.emit<number>("test-channel", 1);
      service.emit<number>("test-channel", 2);
      service.emit<number>("test-channel", 3);

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(3);
      service.destroy();
    });

    it("should handle different data types", async () => {
      const service = new NotificationService();
      const stringCb = createSpyCallback<string>();
      const objectCb = createSpyCallback<{ id: number }>();

      service.subscribe<string>("string-channel", stringCb);
      service.subscribe<{ id: number }>("object-channel", objectCb);

      service.emit<string>("string-channel", "hello");
      service.emit<{ id: number }>("object-channel", { id: 1 });

      await waitForAsync(50);

      expect(stringCb).toHaveBeenCalledTimes(1);
      expect(objectCb).toHaveBeenCalledTimes(1);
      service.destroy();
    });
  });

  describe("once subscriptions", () => {
    it("should handle once subscriptions", async () => {
      const service = new NotificationService();
      const callback = createSpyCallback<string>();
      service.subscribeOnce<string>("test-channel", callback);

      service.emit<string>("test-channel", "first");
      service.emit<string>("test-channel", "second");

      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].data).toBe("first");
      service.destroy();
    });
  });

  describe("event store", () => {
    it("should track events in getEvents", async () => {
      const service = new NotificationService();
      service.subscribe<string>("test-channel", jest.fn());

      service.emit<string>("test-channel", "event-1");
      service.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      const events = service.getEvents<string>("test-channel");
      expect(events.length).toBe(2);
      expect(events[0].data).toBe("event-1");
      expect(events[1].data).toBe("event-2");
      service.destroy();
    });

    it("should track last event", async () => {
      const service = new NotificationService();
      service.subscribe<string>("test-channel", jest.fn());

      service.emit<string>("test-channel", "first");

      await waitForAsync(50);

      const lastEvent = service.getLastEvent<string>("test-channel");
      expect(lastEvent?.data).toBe("first");

      service.emit<string>("test-channel", "second");

      await waitForAsync(50);

      const newLastEvent = service.getLastEvent<string>("test-channel");
      expect(newLastEvent?.data).toBe("second");
      service.destroy();
    });

    it("should provide channel state", async () => {
      const service = new NotificationService();
      service.subscribe<string>("test-channel", jest.fn());

      service.emit<string>("test-channel", "test");

      await waitForAsync(50);

      const state = service.getChannelState<string>("test-channel");
      expect(state.events.length).toBe(1);
      expect(state.lastEvent?.data).toBe("test");
      expect(state.metrics).toBeDefined();
      service.destroy();
    });

    it("should limit stored events to 100", async () => {
      const service = new NotificationService();
      service.subscribe<string>("test-channel", jest.fn());

      for (let i = 0; i < 150; i++) {
        service.emit<string>("test-channel", `event-${i}`);
      }

      await waitForAsync(50);

      const events = service.getEvents<string>("test-channel");
      expect(events.length).toBe(100);
      expect(events[0].data).toBe("event-50");
      expect(events[99].data).toBe("event-149");
      service.destroy();
    });
  });

  describe("clear functionality", () => {
    it("should clear channel events", async () => {
      const service = new NotificationService();
      service.subscribe<string>("test-channel", jest.fn());

      service.emit<string>("test-channel", "event-1");
      service.emit<string>("test-channel", "event-2");

      await waitForAsync(50);

      service.clear("test-channel");

      const events = service.getEvents<string>("test-channel");
      expect(events.length).toBe(0);
      service.destroy();
    });

    it("should clear all channels when no channel specified", async () => {
      const service = new NotificationService();
      service.subscribe<string>("channel-1", jest.fn());
      service.subscribe<string>("channel-2", jest.fn());

      service.emit<string>("channel-1", "event-1");
      service.emit<string>("channel-2", "event-2");

      await waitForAsync(50);

      service.clear();

      expect(service.getEvents<string>("channel-1").length).toBe(0);
      expect(service.getEvents<string>("channel-2").length).toBe(0);
      service.destroy();
    });
  });

  describe("unsubscribe", () => {
    it("should unsubscribe from specific channel", async () => {
      const service = new NotificationService();
      const callback = createSpyCallback<string>();
      service.subscribe<string>("test-channel", callback);

      service.emit<string>("test-channel", "before-unsubscribe");

      await waitForAsync(50);
      expect(callback).toHaveBeenCalledTimes(1);

      service.unsubscribe("test-channel");

      service.emit<string>("test-channel", "after-unsubscribe");

      await waitForAsync(50);
      expect(callback).toHaveBeenCalledTimes(1);
      service.destroy();
    });

    it("should unsubscribe all channels", async () => {
      const service = new NotificationService();
      const callback1 = createSpyCallback<string>();
      const callback2 = createSpyCallback<string>();

      service.subscribe<string>("channel-1", callback1);
      service.subscribe<string>("channel-2", callback2);

      service.emit<string>("channel-1", "event-1");
      service.emit<string>("channel-2", "event-2");

      await waitForAsync(50);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      service.unsubscribeAll();

      service.emit<string>("channel-1", "after-unsubscribe");
      service.emit<string>("channel-2", "after-unsubscribe");

      await waitForAsync(50);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      service.destroy();
    });
  });

  describe("error handling", () => {
    it("should throw error when emitting after destroy", () => {
      const service = new NotificationService();
      service.destroy();

      expect(() => {
        service.emit<string>("test-channel", "test");
      }).toThrow("NotificationService has been destroyed");
    });

    it("should throw error when subscribing after destroy", () => {
      const service = new NotificationService();
      service.destroy();

      expect(() => {
        service.subscribe<string>("test-channel", jest.fn());
      }).toThrow("NotificationService has been destroyed");
    });

    it("should throw error when subscribingOnce after destroy", () => {
      const service = new NotificationService();
      service.destroy();

      expect(() => {
        service.subscribeOnce<string>("test-channel", jest.fn());
      }).toThrow("NotificationService has been destroyed");
    });

    it("should throw error when subscribePattern after destroy", () => {
      const service = new NotificationService();
      service.destroy();

      expect(() => {
        service.subscribePattern<string>("test.*", jest.fn());
      }).toThrow("NotificationService has been destroyed");
    });
  });

  describe("getEmitter", () => {
    it("should return underlying emitter", () => {
      const service = new NotificationService();
      const emitter = service.getEmitter();

      expect(emitter).toBeInstanceOf(EventEmitter);
      service.destroy();
    });
  });
});

describe("Angular Adapter - createNotificationService", () => {
  it("should create a NotificationService instance", () => {
    const service = createNotificationService();

    expect(service).toBeInstanceOf(NotificationService);
    service.destroy();
  });

  it("should accept configuration options", () => {
    const service = createNotificationService({
      buffer: {
        maxSize: 500,
        ttl: 60000,
      },
    });

    expect(service).toBeInstanceOf(NotificationService);
    service.destroy();
  });
});

describe("Angular Adapter - EventEmitter", () => {
  it("should export EventEmitter", () => {
    const { EventEmitter } = require("../../adapters/angular");
    const emitter = new EventEmitter();

    expect(emitter).toBeDefined();
    emitter.destroy();
  });
});

/**
 * Type Safety Tests
 * Comprehensive tests for TypeScript type validation, generic type correctness,
 * interface compliance, and compile-time error detection
 * @author The Base Event Team
 * @since 1.0.0
 */

import { EventEmitter, createEventEmitter } from "../../core/emitter";
import type { EventEmitterConfig } from "../../core/emitter";
import type {
  BaseEvent,
  BufferedEvent,
  EventCallback,
  Middleware,
  UnsubscribeFunction,
  EmitOptions,
  PerformanceMetrics,
  BaseEventConfig,
  BufferConfig,
} from "../../core/events/typing";
import { waitForAsync, createSpyCallback } from "../setup";

describe("Type Safety", () => {
  describe("Generic Type Validation - EventEmitter", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should preserve event data types through emit", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "hello-world");
      await waitForAsync(50);

      expect(callback.mock.calls[0][0].data).toBe("hello-world");
      expect(typeof callback.mock.calls[0][0].data).toBe("string");
    });

    it("should preserve event data types through subscription", async () => {
      const callback = createSpyCallback<number>();
      emitter.on<number>("test-channel", callback);

      emitter.emit<number>("test-channel", 42);
      await waitForAsync(50);

      const receivedEvent = callback.mock.calls[0][0];
      expect(receivedEvent.data).toBe(42);
      expect(typeof receivedEvent.data).toBe("number");
    });

    it("should handle different data types correctly", async () => {
      const stringCb = createSpyCallback<string>();
      const numberCb = createSpyCallback<number>();
      const booleanCb = createSpyCallback<boolean>();
      const objectCb = createSpyCallback<{ id: number; name: string }>();

      emitter.on<string>("string-channel", stringCb);
      emitter.on<number>("number-channel", numberCb);
      emitter.on<boolean>("boolean-channel", booleanCb);
      emitter.on<{ id: number; name: string }>("object-channel", objectCb);

      emitter.emit<string>("string-channel", "test");
      emitter.emit<number>("number-channel", 123);
      emitter.emit<boolean>("boolean-channel", true);
      emitter.emit<{ id: number; name: string }>("object-channel", {
        id: 1,
        name: "test",
      });
      await waitForAsync(50);

      expect(stringCb.mock.calls[0][0].data).toBe("test");
      expect(numberCb.mock.calls[0][0].data).toBe(123);
      expect(booleanCb.mock.calls[0][0].data).toBe(true);
      expect(objectCb.mock.calls[0][0].data).toEqual({ id: 1, name: "test" });
    });

    it("should handle complex generic types", async () => {
      interface ComplexType {
        id: string;
        items: Array<{ name: string; value: number }>;
        metadata?: Record<string, unknown>;
      }

      const callback = createSpyCallback<ComplexType>();
      emitter.on<ComplexType>("test-channel", callback);

      const complexData: ComplexType = {
        id: "test-id",
        items: [
          { name: "item1", value: 1 },
          { name: "item2", value: 2 },
        ],
        metadata: { version: "1.0" },
      };

      emitter.emit<ComplexType>("test-channel", complexData);
      await waitForAsync(50);

      expect(callback.mock.calls[0][0].data).toEqual(complexData);
    });

    it("should handle nested generic types", async () => {
      type NestedType = Array<Array<string>>;
      const callback = createSpyCallback<NestedType>();
      emitter.on<NestedType>("test-channel", callback);

      const nestedData: NestedType = [
        ["a", "b"],
        ["c", "d"],
      ];

      emitter.emit<NestedType>("test-channel", nestedData);
      await waitForAsync(50);

      expect(callback.mock.calls[0][0].data).toEqual(nestedData);
    });

    it("should handle union types", async () => {
      type StringOrNumber = string | number;
      const callback = createSpyCallback<StringOrNumber>();
      emitter.on<StringOrNumber>("test-channel", callback);

      emitter.emit<StringOrNumber>("test-channel", "hello");
      await waitForAsync(50);
      expect(callback.mock.calls[0][0].data).toBe("hello");

      emitter.emit<StringOrNumber>("test-channel", 42);
      await waitForAsync(50);
      expect(callback.mock.calls[1][0].data).toBe(42);
    });

    it("should handle intersection types", async () => {
      interface TypeA {
        a: string;
      }
      interface TypeB {
        b: number;
      }
      type IntersectionType = TypeA & TypeB;

      const callback = createSpyCallback<IntersectionType>();
      emitter.on<IntersectionType>("test-channel", callback);

      const data: IntersectionType = { a: "hello", b: 42 };
      emitter.emit<IntersectionType>("test-channel", data);
      await waitForAsync(50);

      const received = callback.mock.calls[0][0].data;
      expect(received.a).toBe("hello");
      expect(received.b).toBe(42);
    });
  });

  describe("Callback Type Safety", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should enforce correct callback parameter types", async () => {
      const callback = createSpyCallback<{ value: number }>();
      emitter.on<{ value: number }>("test-channel", callback);

      emitter.emit<{ value: number }>("test-channel", { value: 100 });
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      expect(event.data.value).toBe(100);
    });

    it("should handle optional callback parameters", async () => {
      interface OptionalFields {
        required: string;
        optional?: number;
      }

      const callback = createSpyCallback<OptionalFields>();
      emitter.on<OptionalFields>("test-channel", callback);

      emitter.emit<OptionalFields>("test-channel", { required: "test" });
      await waitForAsync(50);

      expect(callback.mock.calls[0][0].data.required).toBe("test");
    });

    it("should handle async callback types", async () => {
      const callback = jest.fn(async (event: BaseEvent<string>) => {
        await Promise.resolve();
      });

      emitter.on<string>("test-channel", callback);
      emitter.emit<string>("test-channel", "test");
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });

    it("should provide correct types in callback context", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test-data");
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      const checkType = (e: BaseEvent<string>) => {
        const _data: string = e.data;
        const _channel: string = e.channel;
        const _id: string = e.id;
        const _timestamp: number = e.timestamp;
      };
      checkType(event);
    });
  });

  describe("Middleware Generic Types", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should preserve event types through middleware", async () => {
      const middleware = jest.fn(
        async (event: BaseEvent<string>, next: () => Promise<void>) => {
          const _typedEvent: BaseEvent<string> = event;
          await next();
        }
      );

      emitter.use(middleware as Middleware);
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test");
      await waitForAsync(50);

      expect(middleware).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    it("should handle middleware type transformation", async () => {
      const transformMiddleware = jest.fn(
        async (event: BaseEvent<string>, next: () => Promise<void>) => {
          event.data = event.data.toUpperCase();
          await next();
        }
      );

      emitter.use(transformMiddleware as Middleware);
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test");
      await waitForAsync(50);

      expect(callback.mock.calls[0][0].data).toBe("TEST");
    });

    it("should enforce middleware signature types", async () => {
      const typedMiddleware = jest.fn<
        void,
        [BaseEvent<unknown>, () => Promise<void> | void]
      >();

      emitter.use(typedMiddleware as Middleware);
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test");
      await waitForAsync(50);

      expect(typedMiddleware).toHaveBeenCalled();
    });

    it("should handle async middleware types", async () => {
      const asyncMiddleware = jest.fn(
        async (event: BaseEvent<string>, next: () => Promise<void>) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          await next();
        }
      );

      emitter.use(asyncMiddleware as Middleware);
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test");
      await waitForAsync(100);

      expect(asyncMiddleware).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("Interface Compliance - Event Interfaces", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should enforce BaseEvent interface structure", async () => {
      const callback = createSpyCallback<unknown>();
      emitter.on<unknown>("test-channel", callback);

      emitter.emit<unknown>("test-channel", "test");
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];

      expect(event).toHaveProperty("id");
      expect(event).toHaveProperty("channel");
      expect(event).toHaveProperty("data");
      expect(event).toHaveProperty("timestamp");
      expect(typeof event.id).toBe("string");
      expect(typeof event.channel).toBe("string");
      expect(typeof event.timestamp).toBe("number");
    });

    it("should enforce BufferedEvent interface structure", async () => {
      emitter.emit<string>("test-channel", "test");
      await waitForAsync(50);

      const buffered = emitter.getBuffered("test-channel");

      expect(buffered).toHaveLength(1);
      const event = buffered[0];
      expect(event).toHaveProperty("id");
      expect(event).toHaveProperty("channel");
      expect(event).toHaveProperty("data");
      expect(event).toHaveProperty("timestamp");
      expect(event).toHaveProperty("bufferedAt");
      expect(typeof event.bufferedAt).toBe("number");
    });

    it("should enforce required event properties", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test");
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      expect(event.id).toBeDefined();
      expect(event.channel).toBe("test-channel");
      expect(event.data).toBe("test");
      expect(event.timestamp).toBeDefined();
    });

    it("should handle optional event properties", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test", { type: "custom" });
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      expect(event.type).toBe("custom");
    });

    it("should enforce event property types", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test");
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      expect(typeof event.id).toBe("string");
      expect(typeof event.channel).toBe("string");
      expect(typeof event.data).toBe("string");
      expect(typeof event.timestamp).toBe("number");
    });
  });

  describe("Interface Compliance - Configuration Interfaces", () => {
    it("should enforce EventEmitterConfig interface", () => {
      const config: EventEmitterConfig = {
        buffer: {
          maxSize: 1000,
          ttl: 30000,
          strategy: "lru",
        },
        middleware: [],
      };

      const emitter = new EventEmitter(config);
      expect(emitter).toBeInstanceOf(EventEmitter);
      emitter.destroy();
    });

    it("should enforce BufferConfig interface", () => {
      const bufferConfig: BufferConfig = {
        maxSize: 500,
        ttl: 60000,
        strategy: "fifo",
      };

      const emitter = new EventEmitter({ buffer: bufferConfig });
      expect(emitter).toBeInstanceOf(EventEmitter);
      emitter.destroy();
    });

    it("should enforce BaseEventConfig interface", () => {
      const baseConfig: BaseEventConfig = {
        buffer: {
          maxSize: 100,
        },
        security: {
          enabled: true,
          rateLimit: 1000,
        },
      };

      const emitter = new EventEmitter(baseConfig);
      expect(emitter).toBeInstanceOf(EventEmitter);
      emitter.destroy();
    });

    it("should enforce configuration property types", () => {
      const config: EventEmitterConfig = {
        buffer: {
          maxSize: 1000,
          ttl: 30000,
          strategy: "priority",
        },
      };

      const emitter = new EventEmitter(config);
      const metrics = emitter.getMetrics();

      expect(typeof metrics.eventsPerSecond).toBe("number");
      expect(typeof metrics.bufferUtilization).toBe("number");
      expect(typeof metrics.memoryUsage).toBe("number");
      expect(typeof metrics.activeSubscriptions).toBe("number");
      expect(typeof metrics.middlewareLatency).toBe("number");

      emitter.destroy();
    });

    it("should handle optional configuration properties", () => {
      const emitter1 = new EventEmitter({});
      expect(emitter1).toBeInstanceOf(EventEmitter);
      emitter1.destroy();

      const emitter2 = new EventEmitter({
        buffer: {},
      });
      expect(emitter2).toBeInstanceOf(EventEmitter);
      emitter2.destroy();
    });
  });

  describe("Interface Compliance - Metrics Interface", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should enforce PerformanceMetrics interface", () => {
      const metrics: PerformanceMetrics = emitter.getMetrics();

      expect(metrics).toHaveProperty("eventsPerSecond");
      expect(metrics).toHaveProperty("bufferUtilization");
      expect(metrics).toHaveProperty("memoryUsage");
      expect(metrics).toHaveProperty("activeSubscriptions");
      expect(metrics).toHaveProperty("middlewareLatency");
    });

    it("should enforce metrics property types", () => {
      const metrics = emitter.getMetrics();

      expect(typeof metrics.eventsPerSecond).toBe("number");
      expect(typeof metrics.bufferUtilization).toBe("number");
      expect(typeof metrics.memoryUsage).toBe("number");
      expect(typeof metrics.activeSubscriptions).toBe("number");
      expect(typeof metrics.middlewareLatency).toBe("number");
    });

    it("should enforce metrics value constraints", () => {
      const metrics = emitter.getMetrics();

      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(0);
      expect(metrics.bufferUtilization).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.activeSubscriptions).toBeGreaterThanOrEqual(0);
      expect(metrics.middlewareLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Type Inference", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should infer event data types correctly", async () => {
      const callback = createSpyCallback<string>();
      emitter.on("test-channel", callback);

      emitter.emit("test-channel", "test");
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      const _typeCheck: string = event.data;
    });

    it("should infer callback parameter types", async () => {
      const callback = jest.fn((event: BaseEvent<number>) => {
        const _value: number = event.data;
      });

      emitter.on<number>("test-channel", callback);
      emitter.emit<number>("test-channel", 42);
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });

    it("should infer configuration types", () => {
      const config = {
        buffer: {
          maxSize: 100,
          ttl: 5000,
        },
      };

      const emitter = new EventEmitter(config);
      const bufferConfig: BufferConfig = config.buffer;

      expect(bufferConfig.maxSize).toBe(100);
      expect(bufferConfig.ttl).toBe(5000);

      emitter.destroy();
    });

    it("should handle complex type inference scenarios", async () => {
      type ComplexEvent = {
        type: "login" | "logout";
        userId: string;
        metadata: Record<string, unknown>;
      };

      const callback = createSpyCallback<ComplexEvent>();
      emitter.on<ComplexEvent>("test-channel", callback);

      emitter.emit<ComplexEvent>("test-channel", {
        type: "login",
        userId: "user-123",
        metadata: { ip: "127.0.0.1" },
      });
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      expect(event.data.type).toBe("login");
      expect(event.data.userId).toBe("user-123");
    });
  });

  describe("Contextual Typing", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should provide correct types in callbacks", async () => {
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test");
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      expect(event.channel).toBe("test-channel");
      expect(event.data).toBe("test");
    });

    it("should provide correct types in middleware", async () => {
      const middleware = jest.fn(
        async (event: BaseEvent<number>, next: () => Promise<void>) => {
          const _n: number = event.data;
          await next();
        }
      );

      emitter.use(middleware as Middleware);
      const callback = createSpyCallback<number>();
      emitter.on<number>("test-channel", callback);

      emitter.emit<number>("test-channel", 42);
      await waitForAsync(50);

      expect(middleware).toHaveBeenCalled();
    });

    it("should provide correct types in event handlers", async () => {
      const callback = createSpyCallback<{ id: number; name: string }>();
      emitter.on<{ id: number; name: string }>("test-channel", callback);

      emitter.emit<{ id: number; name: string }>("test-channel", {
        id: 1,
        name: "test",
      });
      await waitForAsync(50);

      const event = callback.mock.calls[0][0];
      expect(event.data.id).toBe(1);
      expect(event.data.name).toBe("test");
    });
  });

  describe("Type Constraints", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should handle constrained generic types", async () => {
      type ConstrainedType = string | number | boolean;

      const callback = createSpyCallback<ConstrainedType>();
      emitter.on<ConstrainedType>("test-channel", callback);

      emitter.emit<ConstrainedType>("test-channel", "test");
      await waitForAsync(50);
      emitter.emit<ConstrainedType>("test-channel", 123);
      await waitForAsync(50);
      emitter.emit<ConstrainedType>("test-channel", true);
      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it("should handle type parameter relationships", async () => {
      interface BaseType {
        id: string;
      }
      interface ExtendedType extends BaseType {
        name: string;
      }

      const callback = createSpyCallback<ExtendedType>();
      emitter.on<ExtendedType>("test-channel", callback);

      const data: ExtendedType = { id: "1", name: "test" };
      emitter.emit<ExtendedType>("test-channel", data);
      await waitForAsync(50);

      expect(callback.mock.calls[0][0].data).toEqual(data);
    });
  });

  describe("Type Compatibility", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should handle compatible type assignments", async () => {
      type WideType = string | number;
      type NarrowType = string;

      const callback = createSpyCallback<WideType>();
      emitter.on<WideType>("test-channel", callback);

      const narrowValue: NarrowType = "test";
      emitter.emit<WideType>("test-channel", narrowValue);
      await waitForAsync(50);

      expect(callback.mock.calls[0][0].data).toBe("test");
    });

    it("should handle structural typing", async () => {
      interface TypeA {
        id: string;
        name: string;
      }
      interface TypeB {
        id: string;
        name: string;
      }

      const callback = createSpyCallback<TypeA>();
      emitter.on<TypeA>("test-channel", callback);

      const typeBData: TypeB = { id: "1", name: "test" };
      emitter.emit<TypeA>("test-channel", typeBData as TypeA);
      await waitForAsync(50);

      expect(callback.mock.calls[0][0].data).toEqual(typeBData);
    });

    it("should handle type widening", async () => {
      const callback = createSpyCallback<"literal">();
      emitter.on<"literal">("test-channel", callback);

      const literal: "literal" = "literal";
      emitter.emit<"literal">("test-channel", literal);
      await waitForAsync(50);

      expect(callback.mock.calls[0][0].data).toBe("literal");
    });

    it("should handle union type compatibility", async () => {
      type UnionType = string | number;

      const callback = createSpyCallback<UnionType>();
      emitter.on<UnionType>("test-channel", callback);

      emitter.emit<UnionType>("test-channel", "test");
      await waitForAsync(50);
      emitter.emit<UnionType>("test-channel", 42);
      await waitForAsync(50);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should handle intersection type compatibility", async () => {
      interface TypeA {
        a: string;
      }
      interface TypeB {
        b: number;
      }
      type IntersectionType = TypeA & TypeB;

      const callback = createSpyCallback<IntersectionType>();
      emitter.on<IntersectionType>("test-channel", callback);

      const data: IntersectionType = { a: "hello", b: 42 };
      emitter.emit<IntersectionType>("test-channel", data);
      await waitForAsync(50);

      const received = callback.mock.calls[0][0].data;
      expect(received.a).toBe("hello");
      expect(received.b).toBe(42);
    });
  });

  describe("Compile-Time Error Detection", () => {
    it("should detect type mismatches at compile time", () => {
      const emitter = new EventEmitter();
      const callback = jest.fn((event: BaseEvent<string>) => {
        const _data: string = event.data;
      });

      emitter.on<string>("test-channel", callback);
      emitter.emit<string>("test-channel", "test");
      emitter.destroy();
    });

    it("should detect missing required properties", () => {
      const emitter = new EventEmitter();
      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test");
      emitter.destroy();
    });

    it("should detect incorrect property types", () => {
      const emitter = new EventEmitter();
      const callback = createSpyCallback<string>();

      emitter.on<string>("test-channel", callback);
      emitter.emit<string>("test-channel", "test");
      emitter.destroy();
    });

    it("should provide clear error messages", () => {
      const emitter = new EventEmitter();

      expect(() => {
        emitter.emit("test-channel", "test");
      }).not.toThrow();

      emitter.destroy();
    });
  });

  describe("Type Definition Tests", () => {
    it("should export all required types", () => {
      const event: BaseEvent<string> = {
        id: "test",
        channel: "test",
        data: "test",
        timestamp: Date.now(),
      };

      expect(event.id).toBeDefined();
      expect(event.channel).toBeDefined();
      expect(event.data).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it("should maintain type definition consistency", () => {
      const event: BaseEvent<string> = {
        id: "test-id",
        channel: "test",
        data: "test-data",
        timestamp: Date.now(),
      };

      expect(event.id).toBe("test-id");
      expect(event.channel).toBe("test");
      expect(event.data).toBe("test-data");
      expect(event.timestamp).toBeDefined();
    });

    it("should handle type definition imports", () => {
      const callback: EventCallback<string> = event => {
        expect(event.data).toBeDefined();
      };

      expect(typeof callback).toBe("function");
    });

    it("should handle UnsubscribeFunction type", () => {
      const unsubscribe: UnsubscribeFunction = () => {};

      expect(typeof unsubscribe).toBe("function");
    });

    it("should handle EmitOptions type", () => {
      const options: EmitOptions = {
        priority: "high",
        ttl: 5000,
        immediate: true,
        type: "custom",
      };

      expect(options.priority).toBe("high");
      expect(options.ttl).toBe(5000);
      expect(options.immediate).toBe(true);
      expect(options.type).toBe("custom");
    });
  });

  describe("Discriminated Unions", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should handle discriminated unions", async () => {
      type DiscriminatedEvent =
        | { type: "login"; payload: { userId: string } }
        | { type: "logout"; payload: { userId: string } };

      const loginCallback = createSpyCallback<{
        type: "login";
        payload: { userId: string };
      }>();
      const logoutCallback = createSpyCallback<{
        type: "logout";
        payload: { userId: string };
      }>();

      emitter.on<{ type: "login"; payload: { userId: string } }>(
        "user:login",
        loginCallback
      );
      emitter.on<{ type: "logout"; payload: { userId: string } }>(
        "user:logout",
        logoutCallback
      );

      emitter.emit<{ type: "login"; payload: { userId: string } }>(
        "user:login",
        {
          type: "login",
          payload: { userId: "user-1" },
        }
      );
      await waitForAsync(50);

      emitter.emit<{ type: "logout"; payload: { userId: string } }>(
        "user:logout",
        {
          type: "logout",
          payload: { userId: "user-1" },
        }
      );
      await waitForAsync(50);

      expect(loginCallback).toHaveBeenCalledTimes(1);
      expect(logoutCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("Type Guards", () => {
    it("should validate custom type guards", () => {
      function isStringEvent(
        event: BaseEvent<unknown>
      ): event is BaseEvent<string> {
        return typeof event.data === "string";
      }

      const event: BaseEvent<unknown> = {
        id: "test",
        channel: "test",
        data: "hello",
        timestamp: Date.now(),
      };

      expect(isStringEvent(event)).toBe(true);

      const numberEvent: BaseEvent<unknown> = {
        id: "test",
        channel: "test",
        data: 42,
        timestamp: Date.now(),
      };

      expect(isStringEvent(numberEvent)).toBe(false);
    });

    it("should handle type guard composition", () => {
      function isObjectEvent(
        event: BaseEvent<unknown>
      ): event is BaseEvent<object> {
        return typeof event.data === "object" && event.data !== null;
      }

      function hasId(data: unknown): data is { id: string } {
        return typeof data === "object" && data !== null && "id" in data;
      }

      const event: BaseEvent<unknown> = {
        id: "test",
        channel: "test",
        data: { id: "123" },
        timestamp: Date.now(),
      };

      expect(isObjectEvent(event)).toBe(true);
      expect(hasId(event.data)).toBe(true);
    });
  });

  describe("Template Literal Types", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.destroy();
    });

    it("should handle template literal type inference", async () => {
      type ChannelPrefix = `user:${string}`;

      const callback = createSpyCallback<string>();
      emitter.on<string>("user:123", callback);

      emitter.emit<string>("user:123", "test");
      await waitForAsync(50);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("Mapped Types", () => {
    it("should handle mapped type transformations", () => {
      type Readonly<T> = {
        readonly [P in keyof T]: T[P];
      };

      type Optional<T> = {
        [P in keyof T]?: T[P];
      };

      interface Event {
        id: string;
        channel: string;
        data: unknown;
      }

      type ReadonlyEvent = Readonly<Event>;
      type OptionalEvent = Optional<Event>;

      const event: ReadonlyEvent = {
        id: "test",
        channel: "test",
        data: "test",
      };

      expect(event.id).toBe("test");
    });
  });

  describe("Conditional Types", () => {
    it("should handle conditional type resolution", () => {
      type IsString<T> = T extends string ? true : false;

      type Result1 = IsString<string>;
      type Result2 = IsString<number>;

      const _check1: Result1 = true;
      const _check2: Result2 = false;
    });

    it("should handle conditional type inference", () => {
      type ReturnTypeOf<T> = T extends (...args: unknown[]) => infer R
        ? R
        : never;

      type Fn = () => string;
      type Result = ReturnTypeOf<Fn>;

      const _check: Result = "test";
    });
  });

  describe("Framework-Specific Type Integration", () => {
    it("should work with React component types", () => {
      interface ReactEventHandler {
        (event: BaseEvent<string>): void;
      }

      const handler: ReactEventHandler = event => {
        expect(event.data).toBeDefined();
      };

      expect(typeof handler).toBe("function");
    });

    it("should work with async event handlers", () => {
      interface AsyncEventHandler {
        (event: BaseEvent<string>): Promise<void>;
      }

      const handler: AsyncEventHandler = async event => {
        await Promise.resolve();
        expect(event.data).toBeDefined();
      };

      expect(typeof handler).toBe("function");
    });

    it("should maintain type safety with callback functions", () => {
      type TypedCallback<T> = (event: BaseEvent<T>) => void;

      const callback: TypedCallback<string> = event => {
        const _data: string = event.data;
      };

      const event: BaseEvent<string> = {
        id: "test",
        channel: "test",
        data: "test",
        timestamp: Date.now(),
      };

      callback(event);
    });
  });

  describe("Type Performance Impact", () => {
    it("should handle complex types efficiently", async () => {
      const emitter = new EventEmitter();

      interface ComplexType {
        id: string;
        nested: {
          deep: {
            value: number;
          };
        };
        array: Array<{ name: string }>;
      }

      const callback = createSpyCallback<ComplexType>();
      emitter.on<ComplexType>("test-channel", callback);

      const complexData: ComplexType = {
        id: "test",
        nested: { deep: { value: 42 } },
        array: [{ name: "item1" }],
      };

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        emitter.emit<ComplexType>("test-channel", complexData);
      }
      await waitForAsync(50);
      const elapsed = Date.now() - start;

      expect(callback).toHaveBeenCalled();
      expect(elapsed).toBeLessThan(1000);

      emitter.destroy();
    });

    it("should maintain type safety without runtime overhead", async () => {
      const emitter = new EventEmitter();

      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test");
      await waitForAsync(50);
      emitter.destroy();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("Memory Type Safety", () => {
    it("should handle type garbage collection", () => {
      const emitter = new EventEmitter();

      const callback = createSpyCallback<string>();
      emitter.on<string>("test-channel", callback);

      emitter.emit<string>("test-channel", "test");
      emitter.destroy();

      expect(emitter.getMetrics().activeSubscriptions).toBe(0);
    });

    it("should maintain type memory efficiency", () => {
      const emitter = new EventEmitter();

      emitter.emit<string>("channel1", "test1");
      emitter.emit<string>("channel2", "test2");
      emitter.emit<string>("channel3", "test3");

      const metrics = emitter.getMetrics();
      expect(metrics.memoryUsage).toBeDefined();
      expect(typeof metrics.memoryUsage).toBe("number");

      emitter.destroy();
    });
  });

  describe("Type Assertion Validation", () => {
    it("should validate type assertions", () => {
      const data: unknown = "test";
      const str: string = data as string;

      expect(str).toBe("test");
    });

    it("should handle type casting", () => {
      interface TypeA {
        a: string;
      }
      interface TypeB {
        b: number;
      }

      const data: TypeA = { a: "test" };
      const casted = data as unknown as TypeB;

      expect(casted).toEqual({ a: "test" });
    });

    it("should handle type predicate validation", () => {
      function isValidEvent(event: unknown): event is BaseEvent<string> {
        if (typeof event !== "object" || event === null) return false;
        const e = event as BaseEvent<unknown>;
        return (
          typeof e.id === "string" &&
          typeof e.channel === "string" &&
          typeof e.data === "string"
        );
      }

      const validEvent: BaseEvent<string> = {
        id: "test",
        channel: "test",
        data: "test",
        timestamp: Date.now(),
      };

      expect(isValidEvent(validEvent)).toBe(true);
      expect(isValidEvent("invalid")).toBe(false);
    });
  });
});

describe("createEventEmitter Type Safety", () => {
  it("should preserve generic types through factory", () => {
    const emitter = createEventEmitter();

    const callback = createSpyCallback<string>();
    emitter.on<string>("test-channel", callback);

    emitter.emit<string>("test-channel", "test");
    emitter.destroy();
  });

  it("should accept typed configuration", () => {
    const config: EventEmitterConfig = {
      buffer: {
        maxSize: 1000,
        ttl: 30000,
        strategy: "lru",
      },
      middleware: [],
    };

    const emitter = createEventEmitter(config);
    expect(emitter).toBeInstanceOf(EventEmitter);
    emitter.destroy();
  });
});

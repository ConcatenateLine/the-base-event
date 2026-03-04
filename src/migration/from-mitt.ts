/**
 * Migration utility from mitt to The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  EventEmitter,
  createEventEmitter,
  type EventCallback,
  type UnsubscribeFunction,
} from "../core";

export interface MittEmitter {
  on(type: string, handler: MittHandler): void;
  off(type: string, handler: MittHandler): void;
  emit(type: string, data?: unknown): void;
  clear(): void;
  all: Map<string, Set<MittHandler>>;
}

export type MittHandler<T = unknown> = (event?: T) => void;

export interface MittMigrationConfig {
  preserveWildcards?: boolean;
  replayBuffered?: boolean;
  bufferConfig?: {
    maxSize?: number;
    ttl?: number;
    strategy?: "lru" | "fifo" | "priority";
  };
}

function isMittInstance(emitter: unknown): emitter is MittEmitter {
  if (typeof emitter !== "object" || emitter === null) return false;
  const maybeMitt = emitter as Record<string, unknown>;
  return (
    typeof maybeMitt.on === "function" &&
    typeof maybeMitt.off === "function" &&
    typeof maybeMitt.emit === "function"
  );
}

export function migrateFromMitt(
  mittEmitter: MittEmitter,
  config: MittMigrationConfig = {}
): EventEmitter {
  const {
    preserveWildcards = true,
    replayBuffered = true,
    bufferConfig,
  } = config;

  const eventEmitter = createEventEmitter({ buffer: bufferConfig });

  if (!mittEmitter.all || !mittEmitter.all.forEach) {
    return migrateHandlersOnly(mittEmitter, eventEmitter, preserveWildcards);
  }

  const handlerMap = new Map<MittHandler, string[]>();

  mittEmitter.all.forEach((handlers, type) => {
    for (const handler of handlers) {
      const existingTypes = handlerMap.get(handler) || [];
      existingTypes.push(type);
      handlerMap.set(handler, existingTypes);
    }
  });

  const wrappedHandlers = new Map<MittHandler, EventCallback<unknown>>();

  for (const [handler, types] of handlerMap) {
    const wrappedHandler: EventCallback<unknown> = event => {
      handler(event?.data);
    };

    wrappedHandlers.set(handler, wrappedHandler);

    if (preserveWildcards && (types.includes("*") || types.includes("**"))) {
      for (const type of types) {
        if (type === "*" || type === "**") {
          const pattern = type === "*" ? "*" : "**";
          eventEmitter.onPattern(pattern, wrappedHandler);
        } else {
          eventEmitter.on(type, wrappedHandler);
        }
      }
    } else {
      for (const type of types) {
        if (type === "*" || type === "**") continue;
        eventEmitter.on(type, wrappedHandler);
      }
    }
  }

  if (replayBuffered) {
    for (const [, types] of handlerMap) {
      for (const type of types) {
        if (type === "*" || type === "**") continue;
        const buffered = eventEmitter.getBuffered(type);
        for (const event of buffered) {
          const handler = [...handlerMap.entries()].find(([, t]) =>
            t.includes(type)
          )?.[0];
          if (handler) {
            try {
              handler(event.data);
            } catch (e) {
              console.error("Error replaying buffered event:", e);
            }
          }
        }
      }
    }
  }

  return eventEmitter;
}

function migrateHandlersOnly(
  mittEmitter: MittEmitter,
  eventEmitter: EventEmitter,
  preserveWildcards: boolean
): EventEmitter {
  const originalOn = mittEmitter.on.bind(mittEmitter);
  const originalOff = mittEmitter.off.bind(mittEmitter);
  const originalEmit = mittEmitter.emit.bind(mittEmitter);
  const originalClear = mittEmitter.clear.bind(mittEmitter);

  mittEmitter.on = function (type: string, handler: MittHandler): void {
    const wrappedHandler: EventCallback<unknown> = event => {
      handler(event?.data);
    };

    if (preserveWildcards && (type === "*" || type === "**")) {
      const pattern = type === "*" ? "*" : "**";
      eventEmitter.onPattern(pattern, wrappedHandler);
    } else {
      eventEmitter.on(type, wrappedHandler);
    }

    originalOn(type, handler);
  } as typeof mittEmitter.on;

  mittEmitter.off = function (type: string, handler: MittHandler): void {
    eventEmitter.off(type);
    originalOff(type, handler);
  } as typeof mittEmitter.off;

  mittEmitter.emit = function (type: string, data?: unknown): void {
    eventEmitter.emit(type, data);
    originalEmit(type, data);
  } as typeof mittEmitter.emit;

  mittEmitter.clear = function (): void {
    eventEmitter.clear();
    originalClear();
  } as typeof mittEmitter.clear;

  return eventEmitter;
}

export function createMittCompatLayer(
  eventEmitter: EventEmitter
): Pick<MittEmitter, "on" | "off" | "emit" | "clear"> {
  return {
    on<T>(type: string, handler: MittHandler<T>): void {
      eventEmitter.on<T>(type, event => {
        handler(event.data as T);
      });
    },
    off<T>(type: string, _handler: MittHandler<T>): void {
      eventEmitter.off<T>(type);
    },
    emit<T>(type: string, data?: T): void {
      eventEmitter.emit<T>(type, data);
    },
    clear(): void {
      eventEmitter.clear();
    },
  };
}

export function isMittEmitter(emitter: unknown): boolean {
  return isMittInstance(emitter);
}

export function wrapMittHandler<T>(
  handler: MittHandler<T>,
  mapData: boolean = true
): EventCallback<T> {
  if (mapData) {
    return event => {
      handler(event.data as T);
    };
  }
  return event => {
    handler(event as unknown as T);
  };
}

export function unwrapEventEmitterHandler<T>(
  handler: EventCallback<T>
): MittHandler<T> {
  return (event: T | undefined) => {
    if (event && typeof event === "object" && "data" in event) {
      const e = event as { data: unknown };
      handler({ channel: "", data: e.data, id: "", timestamp: 0 } as never);
    } else {
      handler({ channel: "", data: event, id: "", timestamp: 0 } as never);
    }
  };
}

export { EventEmitter, createEventEmitter };
export type { EventCallback, UnsubscribeFunction };

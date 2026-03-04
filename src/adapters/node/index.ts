/**
 * Node.js adapter for The Base Event
 * Provides server-specific configuration and patterns
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  EventEmitter,
  createEventEmitter,
  type EventEmitterConfig,
  type BaseEvent,
  type EventCallback,
  type UnsubscribeFunction,
  type Middleware,
} from "../../core";

export interface NodeEventEmitterConfig extends EventEmitterConfig {
  server?: {
    maxListeners?: number;
    timeout?: number;
    keepAlive?: boolean;
  };
}

export interface ServerEventEmitter {
  emitter: EventEmitter;
  on<T>(channel: string, callback: EventCallback<T>): UnsubscribeFunction;
  once<T>(channel: string, callback: EventCallback<T>): UnsubscribeFunction;
  onPattern<T>(
    pattern: string,
    callback: EventCallback<T>
  ): UnsubscribeFunction;
  emit<T>(channel: string, data: T): void;
  subscribe<T>(
    channel: string,
    callback: EventCallback<T>,
    replay?: boolean
  ): UnsubscribeFunction;
  getBuffered<T>(channel: string): BaseEvent<T>[];
  clear(channel?: string): void;
  destroy(): void;
  getMetrics(): {
    eventsPerSecond: number;
    bufferUtilization: number;
    memoryUsage: number;
    activeSubscriptions: number;
    middlewareLatency: number;
  };
}

function createServerEventEmitter(
  config?: NodeEventEmitterConfig
): ServerEventEmitter {
  const emitter = createEventEmitter(config);

  return {
    emitter,
    on: <T>(channel: string, callback: EventCallback<T>) =>
      emitter.on<T>(channel, callback),
    once: <T>(channel: string, callback: EventCallback<T>) =>
      emitter.once<T>(channel, callback),
    onPattern: <T>(pattern: string, callback: EventCallback<T>) =>
      emitter.onPattern<T>(pattern, callback),
    emit: <T>(channel: string, data: T) => emitter.emit<T>(channel, data),
    subscribe: <T>(
      channel: string,
      callback: EventCallback<T>,
      replay = true
    ) => {
      if (replay) {
        const buffered = emitter.getBuffered(channel);
        for (const event of buffered) {
          callback(event as BaseEvent<T>);
        }
      }
      return emitter.on<T>(channel, callback);
    },
    getBuffered: <T>(channel: string) =>
      emitter.getBuffered(channel) as BaseEvent<T>[],
    clear: (channel?: string) => emitter.clear(channel),
    destroy: () => emitter.destroy(),
    getMetrics: () => emitter.getMetrics(),
  };
}

export interface NotificationChannelOptions<T> {
  channel: string;
  replay?: boolean;
  onMessage?: (event: BaseEvent<T>) => void;
}

export class NotificationChannel<T = unknown> {
  private emitter: EventEmitter;
  private channel: string;
  private subscriptions: UnsubscribeFunction[] = [];

  constructor(emitter: EventEmitter, channel: string) {
    this.emitter = emitter;
    this.channel = channel;
  }

  subscribe(callback: EventCallback<T>, replay = true): UnsubscribeFunction {
    if (replay) {
      const buffered = this.emitter.getBuffered(this.channel);
      for (const event of buffered) {
        callback(event as BaseEvent<T>);
      }
    }

    const unsubscribe = this.emitter.on<T>(this.channel, callback);
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  once(callback: EventCallback<T>): UnsubscribeFunction {
    const unsubscribe = this.emitter.once<T>(this.channel, callback);
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  emit(data: T): void {
    this.emitter.emit<T>(this.channel, data);
  }

  getBuffered(): BaseEvent<T>[] {
    return this.emitter.getBuffered(this.channel) as BaseEvent<T>[];
  }

  clear(): void {
    this.emitter.clear(this.channel);
  }

  unsubscribe(): void {
    for (const unsub of this.subscriptions) {
      unsub();
    }
    this.subscriptions = [];
  }
}

export function createNotificationChannel<T = unknown>(
  emitter: EventEmitter,
  channel: string
): NotificationChannel<T> {
  return new NotificationChannel<T>(emitter, channel);
}

export { EventEmitter, createEventEmitter, createServerEventEmitter };
export type {
  EventEmitterConfig,
  BaseEvent,
  EventCallback,
  UnsubscribeFunction,
  Middleware,
};

export default {
  createEventEmitter,
  createServerEventEmitter,
  createNotificationChannel,
  EventEmitter,
};

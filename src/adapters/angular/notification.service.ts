/**
 * Angular service for notification channels
 * Provides Angular dependency injection and signals support
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
} from "../../core";

export interface NotificationServiceConfig extends EventEmitterConfig {
  provideSignals?: boolean;
}

export interface NotificationChannelState<T> {
  events: BaseEvent<T>[];
  lastEvent: BaseEvent<T> | null;
  metrics: {
    eventsPerSecond: number;
    activeSubscriptions: number;
  };
}

export class NotificationService {
  private emitter: EventEmitter;
  private subscriptions = new Map<string, UnsubscribeFunction>();
  private eventStore = new Map<string, BaseEvent[]>();
  private lastEventStore = new Map<string, BaseEvent | null>();
  private destroyed = false;

  constructor(config?: NotificationServiceConfig) {
    this.emitter = createEventEmitter(config);
  }

  getEmitter(): EventEmitter {
    return this.emitter;
  }

  subscribe<T>(
    channel: string,
    callback: EventCallback<T>,
    replay = true
  ): UnsubscribeFunction {
    if (this.destroyed) {
      throw new Error("NotificationService has been destroyed");
    }

    if (replay) {
      const buffered = this.emitter.getBuffered(channel);
      for (const event of buffered) {
        callback(event as BaseEvent<T>);
      }
    }

    const unsubscribe = this.emitter.on<T>(channel, (event) => {
      this.updateEventStore<T>(channel, event);
      callback(event);
    });

    this.subscriptions.set(channel, unsubscribe);
    return () => {
      unsubscribe();
      this.subscriptions.delete(channel);
    };
  }

  subscribeOnce<T>(
    channel: string,
    callback: EventCallback<T>
  ): UnsubscribeFunction {
    if (this.destroyed) {
      throw new Error("NotificationService has been destroyed");
    }

    return this.emitter.once<T>(channel, (event) => {
      this.updateEventStore<T>(channel, event);
      callback(event);
    });
  }

  subscribePattern<T>(
    pattern: string,
    callback: EventCallback<T>,
    replay = true
  ): UnsubscribeFunction {
    if (this.destroyed) {
      throw new Error("NotificationService has been destroyed");
    }

    if (replay) {
      const bufferedChannels = this.emitter.getBuffered("*");
      for (const event of bufferedChannels) {
        if (this.matchPattern(event.channel, pattern)) {
          callback(event as BaseEvent<T>);
        }
      }
    }

    return this.emitter.onPattern<T>(pattern, (event) => {
      this.updateEventStore<T>(event.channel, event);
      callback(event);
    });
  }

  private matchPattern(channel: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^.]+");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(channel);
  }

  emit<T>(channel: string, data: T): void {
    if (this.destroyed) {
      throw new Error("NotificationService has been destroyed");
    }

    this.emitter.emit<T>(channel, data);
  }

  getEvents<T>(channel: string): BaseEvent<T>[] {
    return (this.eventStore.get(channel) || []) as BaseEvent<T>[];
  }

  getLastEvent<T>(channel: string): BaseEvent<T> | null {
    return (this.lastEventStore.get(channel) || null) as BaseEvent<T> | null;
  }

  getChannelState<T>(channel: string): NotificationChannelState<T> {
    return {
      events: this.getEvents<T>(channel),
      lastEvent: this.getLastEvent<T>(channel),
      metrics: {
        eventsPerSecond: this.emitter.getMetrics().eventsPerSecond,
        activeSubscriptions: this.emitter.getMetrics().activeSubscriptions,
      },
    };
  }

  clear(channel?: string): void {
    if (channel) {
      this.emitter.clear(channel);
      this.eventStore.delete(channel);
      this.lastEventStore.delete(channel);
    } else {
      this.emitter.clear();
      this.eventStore.clear();
      this.lastEventStore.clear();
    }
  }

  unsubscribe(channel: string): void {
    const unsubscribe = this.subscriptions.get(channel);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(channel);
    }
  }

  unsubscribeAll(): void {
    for (const unsubscribe of this.subscriptions.values()) {
      unsubscribe();
    }
    this.subscriptions.clear();
  }

  destroy(): void {
    this.destroyed = true;
    this.unsubscribeAll();
    this.emitter.destroy();
    this.eventStore.clear();
    this.lastEventStore.clear();
  }

  private updateEventStore<T>(channel: string, event: BaseEvent<T>): void {
    if (!this.eventStore.has(channel)) {
      this.eventStore.set(channel, []);
    }

    const events = this.eventStore.get(channel)!;
    events.push(event);
    this.lastEventStore.set(channel, event);

    if (events.length > 100) {
      events.shift();
    }
  }
}

export function createNotificationService(
  config?: NotificationServiceConfig
): NotificationService {
  return new NotificationService(config);
}

export { EventEmitter, createEventEmitter };
export type { EventEmitterConfig, BaseEvent, EventCallback, UnsubscribeFunction };

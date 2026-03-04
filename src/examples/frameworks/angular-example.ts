/**
 * Angular example for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

import { Injectable, NgModule } from "@angular/core";
import {
  EventEmitter,
  createEventEmitter,
  type BaseEvent,
  type UnsubscribeFunction,
} from "@core";

export interface DataEvent<T = unknown> {
  id: string;
  payload: T;
  timestamp: number;
}

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private emitter: EventEmitter;
  private subscriptions: Map<string, UnsubscribeFunction> = new Map();

  constructor() {
    this.emitter = createEventEmitter({
      buffer: {
        maxSize: 500,
        ttl: 300000,
        strategy: "lru",
      },
      ssr: {
        enabled: true,
      },
    });
  }

  emit<T>(channel: string, data: T): void {
    this.emitter.emit<DataEvent<T>>(channel, {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      payload: data,
      timestamp: Date.now(),
    });
  }

  on<T>(
    channel: string,
    callback: (event: BaseEvent<DataEvent<T>>) => void
  ): UnsubscribeFunction {
    const unsubscribe = this.emitter.on<DataEvent<T>>(channel, callback);
    this.subscriptions.set(channel, unsubscribe);
    return unsubscribe;
  }

  once<T>(
    channel: string,
    callback: (event: BaseEvent<DataEvent<T>>) => void,
    options?: { timeout?: number; defaultValue?: T }
  ): UnsubscribeFunction {
    return this.emitter.once<DataEvent<T>>(channel, callback, {
      timeout: options?.timeout,
      defaultValue: options?.defaultValue,
    } as never);
  }

  onPattern<T>(
    pattern: string,
    callback: (event: BaseEvent<DataEvent<T>>) => void
  ): UnsubscribeFunction {
    return this.emitter.onPattern<DataEvent<T>>(pattern, callback);
  }

  off(channel: string): void {
    const unsubscribe = this.subscriptions.get(channel);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(channel);
    }
    this.emitter.off(channel);
  }

  getBuffered<T>(channel: string): BaseEvent<DataEvent<T>>[] {
    return this.emitter.getBuffered(channel) as BaseEvent<DataEvent<T>>[];
  }

  clear(channel?: string): void {
    this.emitter.clear(channel);
  }

  destroy(): void {
    for (const unsub of this.subscriptions.values()) {
      unsub();
    }
    this.subscriptions.clear();
    this.emitter.destroy();
  }

  getMetrics() {
    return this.emitter.getMetrics();
  }
}

@NgModule({
  providers: [NotificationService],
})
export class NotificationModule {}

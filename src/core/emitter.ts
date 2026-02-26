/**
 * Main EventEmitter class for The Base Event
 * Framework-agnostic event bus with intelligent replay and memory management
 * @author The Base Event Team
 * @since 1.0.0
 */

import type {
  BaseEvent,
  BufferedEvent,
  EventCallback,
  UnsubscribeFunction,
  EmitOptions,
  Middleware,
  PerformanceMetrics,
  BaseEventConfig,
  BufferConfig,
} from "./events/typing";

import { BufferManager, createBufferManager } from "./buffer";

export interface EventEmitterConfig extends BaseEventConfig {
  buffer?: BufferConfig;
  middleware?: Middleware[];
}

/**
 * Framework-agnostic event emitter with intelligent buffering
 */
export class EventEmitter {
  private buffer: BufferManager;
  private subscribers = new Map<string, Set<EventCallback<unknown>>>();
  private middleware: Middleware[] = [];
  private metrics: PerformanceMetrics;
  private destroyed = false;

  constructor(config: EventEmitterConfig = {}) {
    this.buffer = createBufferManager(config.buffer || {});
    this.middleware = config.middleware || [];

    this.metrics = {
      eventsPerSecond: 0,
      bufferUtilization: 0,
      memoryUsage: 0,
      activeSubscriptions: 0,
      middlewareLatency: 0,
    };
  }

  /**
   * Emit an event to a specific channel
   */
  emit<T>(channel: string, data: T, options?: EmitOptions): void {
    if (this.destroyed) {
      throw new Error("EventEmitter has been destroyed");
    }

    const event: BaseEvent<T> = {
      id: this.generateEventId(),
      channel,
      data,
      timestamp: Date.now(),
      type: options?.type || "standard",
    };

    // Process through middleware chain
    this.processMiddleware(event)
      .then(() => {
        // Add to buffer
        this.buffer.add(event);

        // Notify subscribers
        const subscribers = this.subscribers.get(channel);
        if (subscribers) {
          for (const callback of subscribers) {
            try {
              callback(event);
            } catch (error) {
              console.error("Error in event subscriber:", error);
            }
          }
        }

        this.updateMetrics("emit");
      })
      .catch(error => {
        console.error("Error in middleware chain:", error);
      });
  }

  /**
   * Subscribe to events on a specific channel
   */
  on<T>(channel: string, callback: EventCallback<T>): UnsubscribeFunction {
    if (this.destroyed) {
      throw new Error("EventEmitter has been destroyed");
    }

    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set<EventCallback<unknown>>());
    }

    this.subscribers.get(channel)!.add(callback as EventCallback<unknown>);
    this.metrics.activeSubscriptions++;

    // Replay buffered events for this channel
    this.replayBufferedEvents<T>(channel, callback);

    return () => this.unsubscribe(channel, callback);
  }

  /**
   * Subscribe to events only once
   */
  once<T>(channel: string, callback: EventCallback<T>): UnsubscribeFunction {
    let subscribed = true;

    const wrappedCallback: EventCallback<T> = event => {
      if (subscribed) {
        subscribed = false;
        callback(event);
        this.unsubscribe(channel, wrappedCallback);
      }
    };

    return this.on(channel, wrappedCallback);
  }

  /**
   * Remove all subscribers from a channel
   */
  off<T>(channel: string, callback?: EventCallback<T>): void {
    const subscribers = this.subscribers.get(channel);
    if (!subscribers) return;

    if (callback) {
      subscribers.delete(callback as EventCallback<unknown>);
    } else {
      subscribers.clear();
    }

    this.metrics.activeSubscriptions = subscribers.size;
  }

  /**
   * Remove all subscribers and clear buffer
   */
  destroy(): void {
    this.destroyed = true;
    this.subscribers.clear();
    this.buffer.clear();
    this.middleware = [];
    this.metrics.activeSubscriptions = 0;
  }

  /**
   * Get buffered events for a channel
   */
  getBuffered(channel: string): BufferedEvent<unknown>[] {
    return this.buffer.get(channel);
  }

  /**
   * Clear buffered events for a channel or all channels
   */
  clear(channel?: string): void {
    if (channel) {
      this.buffer.clear(channel);
    } else {
      this.buffer.clear();
    }
  }

  /**
   * Add middleware to the processing chain
   */
  use(middleware: Middleware): void {
    if (this.destroyed) {
      throw new Error("EventEmitter has been destroyed");
    }
    this.middleware.push(middleware);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateMetrics("check");
    return { ...this.metrics };
  }

  /**
   * Process middleware chain
   */
  private async processMiddleware<T>(event: BaseEvent<T>): Promise<void> {
    let index = 0;
    const next = async () => Promise.resolve();

    for (const middleware of this.middleware) {
      const startTime = Date.now();
      try {
        await middleware(event, next);
        this.metrics.middlewareLatency += Date.now() - startTime;
      } catch (error) {
        console.error("Error in middleware:", error);
        throw error;
      }
      index++;
    }
  }

  /**
   * Replay buffered events to a new subscriber
   */
  private replayBufferedEvents<T>(
    channel: string,
    callback: EventCallback<T>
  ): void {
    const bufferedEvents = this.buffer.get(channel);

    for (const event of bufferedEvents) {
      try {
        callback(event as BaseEvent<T>);
      } catch (error) {
        console.error("Error replaying buffered event:", error);
      }
    }
  }

  /**
   * Unsubscribe from a channel
   */
  private unsubscribe<T>(channel: string, callback: EventCallback<T>): void {
    const subscribers = this.subscribers.get(channel);
    if (subscribers) {
      subscribers.delete(callback as EventCallback<unknown>);
      this.metrics.activeSubscriptions = subscribers.size;

      if (subscribers.size === 0) {
        this.subscribers.delete(channel);
      }
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(
    operation: "emit" | "check" | "subscribe" | "unsubscribe"
  ): void {
    const now = Date.now();

    switch (operation) {
      case "emit":
        this.metrics.eventsPerSecond++;
        this.metrics.bufferUtilization =
          this.buffer.size / (this.buffer.getMetrics().totalEvents || 1);
        break;
      case "subscribe":
      case "unsubscribe":
        this.metrics.activeSubscriptions = Array.from(
          this.subscribers.values()
        ).reduce((total, set) => total + set.size, 0);
        break;
    }

    this.metrics.memoryUsage = this.buffer.size * 100; // Rough estimation
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create EventEmitter with configuration
 */
export function createEventEmitter(config?: EventEmitterConfig): EventEmitter {
  return new EventEmitter(config);
}

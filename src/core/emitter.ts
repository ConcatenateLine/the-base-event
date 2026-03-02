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
  OnceOptions,
} from "./events/typing";

import { BufferManager, createBufferManager } from "./buffer";
import { isSSR } from "./ssr/detection";
import {
  HydrationManager,
  type SSRConfig,
  DEFAULT_SSR_CONFIG,
} from "./ssr/hydration";
import { BufferSyncManager } from "./ssr/buffer-sync";
import { ClientWaitManager } from "./ssr/client-wait";
import { matchWildcard, compilePattern } from "./events/pattern-match";

export interface EventEmitterConfig extends BaseEventConfig {
  buffer?: BufferConfig;
  middleware?: Middleware[];
  ssr?: Partial<SSRConfig>;
}

interface OnceListenerConfig {
  callback: EventCallback<unknown>;
  attempts: number;
  maxAttempts: number;
  timeoutId?: ReturnType<typeof setTimeout>;
  resolved: boolean;
}

/**
 * Framework-agnostic event emitter with intelligent buffering and SSR support
 */
export class EventEmitter {
  private buffer: BufferManager;
  private subscribers = new Map<string, Set<EventCallback<unknown>>>();
  private patternSubscribers: Array<{
    pattern: ReturnType<typeof compilePattern>;
    callback: EventCallback<unknown>;
    regex: RegExp;
  }> = [];
  private onceListeners: Map<string, OnceListenerConfig> = new Map();
  private middleware: Middleware[] = [];
  private metrics: PerformanceMetrics;
  private destroyed = false;

  private hydrationManager: HydrationManager | null = null;
  private bufferSyncManager: BufferSyncManager | null = null;
  private clientWaitManager: ClientWaitManager | null = null;
  private ssrConfig: SSRConfig;

  constructor(config: EventEmitterConfig = {}) {
    this.buffer = createBufferManager(config.buffer || {});
    this.middleware = config.middleware || [];
    this.ssrConfig = { ...DEFAULT_SSR_CONFIG, ...config.ssr };

    if (this.ssrConfig.enabled) {
      this.hydrationManager = new HydrationManager(this.ssrConfig);
      this.bufferSyncManager = new BufferSyncManager(
        this.ssrConfig.bufferStrategy || "client-only",
        this.ssrConfig.syncMode || "on-hydration"
      );
      this.clientWaitManager = new ClientWaitManager(
        this.ssrConfig.hydrationDelay || 5000
      );
    }

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

    if (this.ssrConfig?.enabled && isSSR()) {
      this.bufferServerEvent({
        id: this.generateEventId(),
        channel,
        data,
        timestamp: Date.now(),
        type: options?.type || "standard",
      });
      return;
    }

    if (this.ssrConfig?.enabled && this.hydrationManager) {
      this.hydrationManager.waitForHydration().then(() => {
        this.emitInternal<T>(channel, data, options);
      });
      return;
    }

    this.emitInternal<T>(channel, data, options);
  }

  /**
   * Internal emit logic after SSR checks
   */
  private emitInternal<T>(
    channel: string,
    data: T,
    options?: EmitOptions
  ): void {
    const event: BaseEvent<T> = {
      id: this.generateEventId(),
      channel,
      data,
      timestamp: Date.now(),
      type: options?.type || "standard",
      version: options?.version,
    };

    this.processMiddleware(event)
      .then(() => {
        this.buffer.add(event);

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

        for (const patternSub of this.patternSubscribers) {
          if (matchWildcard(channel, patternSub.regex.source)) {
            try {
              patternSub.callback(event);
            } catch (error) {
              console.error("Error in pattern subscriber:", error);
            }
          }
        }

        this.handleOnceListeners<T>(channel, event);

        this.updateMetrics("emit");
      })
      .catch(error => {
        console.error("Error in middleware chain:", error);
      });
  }

  private handleOnceListeners<T>(channel: string, event: BaseEvent<T>): void {
    const onceConfig = this.onceListeners.get(channel);
    if (!onceConfig) return;

    onceConfig.attempts++;

    if (!onceConfig.resolved) {
      onceConfig.resolved = true;

      if (onceConfig.timeoutId) {
        clearTimeout(onceConfig.timeoutId);
      }

      try {
        onceConfig.callback(event as BaseEvent<unknown>);
      } catch (error) {
        console.error("Error in once listener:", error);
      }

      this.unsubscribe(channel, onceConfig.callback);
      this.onceListeners.delete(channel);
    } else if (onceConfig.attempts < onceConfig.maxAttempts) {
      onceConfig.resolved = false;
    }
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
   * Subscribe to events matching a wildcard pattern
   * Supports * for single segment and ** for multi-segment
   */
  onPattern<T>(
    pattern: string,
    callback: EventCallback<T>
  ): UnsubscribeFunction {
    if (this.destroyed) {
      throw new Error("EventEmitter has been destroyed");
    }

    const compiled = compilePattern(pattern);

    this.patternSubscribers.push({
      pattern: compiled,
      callback: callback as EventCallback<unknown>,
      regex: compiled.regex,
    });

    this.metrics.activeSubscriptions++;

    return () => {
      const idx = this.patternSubscribers.findIndex(
        sub => sub.callback === callback
      );
      if (idx !== -1) {
        this.patternSubscribers.splice(idx, 1);
        this.metrics.activeSubscriptions--;
      }
    };
  }

  /**
   * Subscribe to pattern events only once
   */
  oncePattern<T>(
    pattern: string,
    callback: EventCallback<T>,
    _options?: OnceOptions
  ): UnsubscribeFunction {
    let called = false;

    const wrappedCallback: EventCallback<T> = event => {
      if (!called) {
        called = true;
        callback(event);
      }
    };

    return this.onPattern(pattern, wrappedCallback);
  }

  /**
   * Subscribe to events only once
   */
  once<T>(
    channel: string,
    callback: EventCallback<T>,
    options?: OnceOptions
  ): UnsubscribeFunction {
    const maxAttempts = options?.maxAttempts ?? 1;
    const timeout = options?.timeout;
    const defaultValue = options?.defaultValue;

    let subscribed = true;

    const onceConfig: OnceListenerConfig = {
      callback: callback as EventCallback<unknown>,
      attempts: 0,
      maxAttempts,
      resolved: false,
    };

    if (timeout && timeout > 0) {
      const timeoutId = setTimeout(() => {
        if (!onceConfig.resolved) {
          onceConfig.resolved = true;
          if (defaultValue !== undefined) {
            try {
              callback({
                id: "",
                channel,
                data: defaultValue as T,
                timestamp: Date.now(),
              } as BaseEvent<T>);
            } catch (error) {
              console.error("Error in once timeout callback:", error);
            }
          }
          this.unsubscribe(channel, wrappedCallback);
          this.onceListeners.delete(channel);
        }
      }, timeout);

      onceConfig.timeoutId = timeoutId;
    }

    this.onceListeners.set(channel, onceConfig);

    const wrappedCallback: EventCallback<T> = event => {
      if (subscribed) {
        subscribed = false;
        callback(event);
        this.unsubscribe(channel, wrappedCallback);
        this.onceListeners.delete(channel);
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
    this.patternSubscribers = [];

    for (const [, onceConfig] of this.onceListeners) {
      if (onceConfig.timeoutId) {
        clearTimeout(onceConfig.timeoutId);
      }
    }
    this.onceListeners.clear();

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

  /**
   * Buffer server-side event for later replay
   */
  private bufferServerEvent<T>(event: BaseEvent<T>): void {
    if (!this.bufferSyncManager) return;

    const bufferedEvent: BufferedEvent<T> = {
      ...event,
      bufferedAt: Date.now(),
    };

    this.bufferSyncManager.bufferServerEvent(bufferedEvent);
  }

  /**
   * Replay server events to subscribers (called after hydration)
   */
  replayServerEvents(): void {
    if (!this.bufferSyncManager) return;

    const events = this.bufferSyncManager.replayServerEvents();

    for (const event of events) {
      const subscribers = this.subscribers.get(event.channel);
      if (subscribers) {
        for (const callback of subscribers) {
          try {
            callback(event as BaseEvent<unknown>);
          } catch (error) {
            console.error("Error replaying server event:", error);
          }
        }
      }
    }
  }

  /**
   * Check if running in SSR environment
   */
  isSSR(): boolean {
    return isSSR();
  }

  /**
   * Wait for client hydration to complete
   */
  waitForHydration(): Promise<void> {
    if (!this.hydrationManager) {
      return Promise.resolve();
    }
    return this.hydrationManager.waitForHydration();
  }

  /**
   * Get current SSR configuration
   */
  getSSRConfig(): SSRConfig {
    return { ...this.ssrConfig };
  }

  /**
   * Mark the application as hydrated (call after framework hydration)
   */
  markHydrated(): void {
    if (this.hydrationManager) {
      this.hydrationManager.markHydrated();
    }
    if (this.clientWaitManager) {
      this.clientWaitManager.onClientMount();
    }
    if (this.bufferSyncManager?.shouldSyncOnHydration()) {
      this.replayServerEvents();
    }
  }

  /**
   * Update SSR configuration at runtime
   */
  configureSSR(config: Partial<SSRConfig>): void {
    this.ssrConfig = { ...this.ssrConfig, ...config };

    if (this.hydrationManager) {
      this.hydrationManager.updateConfig(config);
    }

    if (this.bufferSyncManager) {
      if (config.bufferStrategy) {
        this.bufferSyncManager.setStrategy(config.bufferStrategy);
      }
      if (config.syncMode) {
        this.bufferSyncManager.setSyncMode(config.syncMode);
      }
    }
  }

  /**
   * Check if SSR is enabled
   */
  isSSREnabled(): boolean {
    return this.ssrConfig?.enabled ?? false;
  }
}

/**
 * Factory function to create EventEmitter with configuration
 */
export function createEventEmitter(config?: EventEmitterConfig): EventEmitter {
  return new EventEmitter(config);
}

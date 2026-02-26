/**
 * Buffer management system for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { BaseEvent, BufferedEvent, BufferConfig } from "../events/typing";

export interface BufferStrategy {
  add<T>(
    buffer: Map<string, BufferedEvent<unknown>[]>,
    event: BufferedEvent<T>
  ): void;
  onAccess<T>(
    buffer: Map<string, BufferedEvent<unknown>[]>,
    channel: string
  ): void;
  shouldEvict<T>(
    buffer: Map<string, BufferedEvent<unknown>[]>,
    channel: string
  ): boolean;
  evictOldest<T>(
    buffer: Map<string, BufferedEvent<unknown>[]>,
    channel: string
  ): BufferedEvent<unknown> | null;
}

export interface MemoryManager {
  cleanup<T>(buffer: Map<string, BufferedEvent<T>[]>): number;
  setTTL(ttl: number): void;
  setMaxSize(maxSize: number): void;
}

export interface SynchronizationManager {
  sync(event: BaseEvent<unknown>): void;
}

export interface BufferManager {
  // Core buffer operations
  add<T>(event: BaseEvent<T>): void;
  get(channel: string): BufferedEvent<unknown>[];
  has(channel: string): boolean;
  clear(channel?: string): void;
  size: number;

  // Buffer configuration
  configure(config: Partial<BufferConfig>): void;

  // Buffer management
  evictExpired(): number;
  getMetrics(): {
    totalEvents: number;
    bufferedEvents: number;
    memoryUsage: number;
    channels: number;
  };
}

/**
 * Creates a new buffer manager with the specified configuration
 */
export function createBufferManager(config: BufferConfig = {}): BufferManager {
  const buffer = new Map<string, BufferedEvent<unknown>[]>();
  let maxSize = config.maxSize || 1000;
  let ttl = config.ttl || 30000;
  let crossTabSync = config.crossTab || false;

  // Initialize strategy-specific components
  const strategy = createStrategy(config.strategy || "lru");
  const memoryManager = createMemoryManager(ttl, maxSize);
  const syncManager = crossTabSync ? createSynchronizationManager() : null;

  return new UniversalBufferManager(
    buffer,
    strategy,
    memoryManager,
    syncManager,
    maxSize,
    ttl
  );
}

/**
 * Universal buffer manager that delegates to strategy-specific implementations
 */
class UniversalBufferManager implements BufferManager {
  constructor(
    private buffer: Map<string, BufferedEvent<unknown>[]>,
    private strategy: BufferStrategy,
    private memoryManager: MemoryManager,
    private syncManager: SynchronizationManager | null,
    private maxSize: number,
    private ttl: number
  ) {}

  add<T>(event: BaseEvent<T>): void {
    const bufferedEvent: BufferedEvent<T> = {
      ...event,
      bufferedAt: Date.now(),
      ttl: this.ttl,
    };

    // Add to buffer using strategy
    this.strategy.add(this.buffer, bufferedEvent);

    // Clean up expired events
    this.memoryManager.cleanup(this.buffer);

    // Sync across tabs if enabled
    if (this.syncManager) {
      this.syncManager.sync(event);
    }
  }

  get(channel: string): BufferedEvent<unknown>[] {
    return this.buffer.get(channel) || [];
  }

  has(channel: string): boolean {
    return this.buffer.has(channel);
  }

  clear(channel?: string): void {
    if (channel) {
      this.buffer.delete(channel);
    } else {
      this.buffer.clear();
    }
  }

  get size(): number {
    let total = 0;
    for (const events of this.buffer.values()) {
      total += events.length;
    }
    return total;
  }

  configure(config: Partial<BufferConfig>): void {
    if (config.maxSize) {
      this.maxSize = config.maxSize;
      this.memoryManager.setMaxSize(config.maxSize);
    }
    if (config.ttl) {
      this.ttl = config.ttl;
      this.memoryManager.setTTL(config.ttl);
    }
  }

  evictExpired(): number {
    return this.memoryManager.cleanup(this.buffer);
  }

  getMetrics() {
    const totalEvents = this.size;
    let bufferedEvents = 0;
    let memoryUsage = 0;

    for (const [channel, events] of this.buffer.entries()) {
      bufferedEvents += events.length;
      memoryUsage += events.length * 100;
    }

    return {
      totalEvents,
      bufferedEvents,
      memoryUsage,
      channels: this.buffer.size,
    };
  }
}

/**
 * Strategy factory function - delegates to specific strategy implementation
 */
function createStrategy(strategy: string): BufferStrategy {
  switch (strategy) {
    case "fifo":
      return createFIFOStrategy();
    case "priority":
      return createPriorityStrategy();
    case "lru":
    default:
      return createLRUStrategy();
  }
}

/**
 * LRU strategy implementation
 */
function createLRUStrategy(): BufferStrategy {
  const accessOrder = new Map<string, number>();
  let accessCounter = 0;

  return {
    add<T>(
      buffer: Map<string, BufferedEvent<unknown>[]>,
      event: BufferedEvent<T>
    ): void {
      const channel = event.channel;
      let events = buffer.get(channel) || [];

      events.push(event);
      accessOrder.set(channel, ++accessCounter);

      if (events.length > 1000) {
        events.shift();
      }

      buffer.set(channel, events);
    },

    onAccess<T>(
      buffer: Map<string, BufferedEvent<unknown>[]>,
      channel: string
    ): void {
      accessOrder.set(channel, ++accessCounter);
    },

    shouldEvict<T>(
      buffer: Map<string, BufferedEvent<unknown>[]>,
      channel: string
    ): boolean {
      const events = buffer.get(channel) || [];
      return events.length >= 1000;
    },

    evictOldest<T>(
      buffer: Map<string, BufferedEvent<unknown>[]>,
      channel: string
    ): BufferedEvent<unknown> | null {
      const events = buffer.get(channel) || [];
      return events.length > 0 ? events.shift() || null : null;
    },
  };
}

/**
 * FIFO strategy implementation
 */
function createFIFOStrategy(): BufferStrategy {
  return {
    add<T>(
      buffer: Map<string, BufferedEvent<unknown>[]>,
      event: BufferedEvent<T>
    ): void {
      const channel = event.channel;
      let events = buffer.get(channel) || [];

      events.push(event);

      if (events.length > 1000) {
        events.shift();
      }

      buffer.set(channel, events);
    },

    onAccess<T>(): void {},

    shouldEvict<T>(
      buffer: Map<string, BufferedEvent<unknown>[]>,
      channel: string
    ): boolean {
      const events = buffer.get(channel) || [];
      return events.length >= 1000;
    },

    evictOldest<T>(
      buffer: Map<string, BufferedEvent<unknown>[]>,
      channel: string
    ): BufferedEvent<unknown> | null {
      const events = buffer.get(channel) || [];
      return events.length > 0 ? events.shift() || null : null;
    },
  };
}

/**
 * Priority strategy implementation
 */
function createPriorityStrategy(): BufferStrategy {
  return createFIFOStrategy();
}

/**
 * Memory manager factory function
 */
function createMemoryManager(ttl: number, maxSize: number): MemoryManager {
  return {
    cleanup<T>(buffer: Map<string, BufferedEvent<T>[]>): number {
      let cleanedCount = 0;
      const now = Date.now();

      for (const [channel, events] of buffer.entries()) {
        const originalLength = events.length;

        for (let i = events.length - 1; i >= 0; i--) {
          const event = events[i];
          if (event.ttl && now - event.bufferedAt > event.ttl) {
            events.splice(i, 1);
            cleanedCount++;
          }
        }

        if (events.length < originalLength) {
          buffer.set(channel, events);
        }
      }

      return cleanedCount;
    },

    setTTL(newTtl: number): void {
      ttl = newTtl;
    },

    setMaxSize(newMaxSize: number): void {
      maxSize = newMaxSize;
    },
  };
}

/**
 * Synchronization manager factory function
 */
function createSynchronizationManager(): SynchronizationManager {
  return {
    sync(): void {
      // Cross-tab synchronization not implemented in this version
    },
  };
}

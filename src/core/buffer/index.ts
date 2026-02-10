/**
 * Buffer management system for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { BaseEvent, BufferedEvent } from '../events/typing';
import type { BufferConfig } from '../events/typing';

export type { BufferStrategy } from './strategies/lru';
export type { MemoryManager } from './memory/ttl';
export type { SynchronizationManager } from './synchronization/cross-tab';

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
  let ttl = config.ttl || 30000; // 30 seconds default
  let crossTabSync = config.crossTab || false;
  
  // Initialize strategy-specific components
  const strategy = createStrategy(config.strategy || 'lru');
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
      ttl: this.ttl
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
      memoryUsage += events.length * 100; // Rough estimation
    }
    
    return {
      totalEvents,
      bufferedEvents,
      memoryUsage,
      channels: this.buffer.size
    };
  }
}

/**
 * Strategy factory function - delegates to specific strategy implementation
 */
function createStrategy(strategy: string): BufferStrategy {
  switch (strategy) {
    case 'fifo':
      return require('./strategies/fifo').default;
    case 'priority':
      return require('./strategies/priority').default;
    case 'lru':
    default:
      return require('./strategies/lru').default;
  }
}

/**
 * Memory manager factory function
 */
function createMemoryManager(ttl: number, maxSize: number): MemoryManager {
  return require('./memory/ttl').default(ttl, maxSize);
}

/**
 * Synchronization manager factory function
 */
function createSynchronizationManager(): SynchronizationManager {
  return require('./synchronization/cross-tab').default();
}
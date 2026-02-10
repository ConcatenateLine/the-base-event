/**
 * LRU (Least Recently Used) buffer strategy implementation
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { BaseEvent, BufferedEvent } from '../../events/typing';

export interface LRUConfig {
  maxSize: number;
}

/**
 * LRU strategy implementation for buffer eviction
 */
export default class LRUStrategy {
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  constructor(private config: LRUConfig) {}

  add<T>(
    buffer: Map<string, BufferedEvent<unknown>[]>, 
    event: BufferedEvent<T>
  ): void {
    const channel = event.channel;
    let events = buffer.get(channel) || [];
    
    // Add new event
    events.push(event);
    
    // Update access time
    this.accessOrder.set(channel, ++this.accessCounter);
    
    // Check if we need to evict
    if (events.length > this.config.maxSize) {
      // Evict oldest event (simple FIFO for LRU)
      events.shift();
    }
    
    // Update buffer
    buffer.set(channel, events);
  }

  onAccess<T>(buffer: Map<string, BufferedEvent<unknown>[]>, channel: string): void {
    // Update access time when channel is accessed
    this.accessOrder.set(channel, ++this.accessCounter);
    
    // Move accessed channel's events to end (LRU behavior)
    const events = buffer.get(channel);
    if (events && events.length > 1) {
      const lastEvent = events.pop();
      if (lastEvent) {
        events.unshift(lastEvent);
      }
      buffer.set(channel, events);
    }
  }

  shouldEvict<T>(buffer: Map<string, BufferedEvent<unknown>[]>, channel: string): boolean {
    const events = buffer.get(channel) || [];
    return events.length >= this.config.maxSize;
  }

  evictOldest<T>(buffer: Map<string, BufferedEvent<unknown>[]>, channel: string): BufferedEvent<unknown> | null {
    const events = buffer.get(channel) || [];
    return events.length > 0 ? events.shift() || null : null;
  }

  getLeastRecentlyUsed(): string[] {
    return Array.from(this.accessOrder.entries())
      .sort(([, a], [, b]) => a - b)
      .slice(0, 10) // Return top 10 least recently used
      .map(([channel]) => channel);
  }
}
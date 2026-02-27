/**
 * FIFO (First In, First Out) buffer strategy implementation
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { BaseEvent, BufferedEvent } from "../../events/typing";

export interface FIFOConfig {
  maxSize: number;
}

/**
 * FIFO strategy implementation for buffer eviction
 */
export default class FIFOStrategy {
  constructor(private config: FIFOConfig) {}

  add<T>(
    buffer: Map<string, BufferedEvent<unknown>[]>,
    event: BufferedEvent<T>
  ): void {
    const channel = event.channel;
    let events = buffer.get(channel) || [];

    // Add new event to end
    events.push(event);

    // Check if we need to evict
    if (events.length > this.config.maxSize) {
      // Evict oldest event (FIFO behavior)
      events.shift();
    }

    // Update buffer
    buffer.set(channel, events);
  }

  shouldEvict<T>(
    buffer: Map<string, BufferedEvent<unknown>[]>,
    channel: string
  ): boolean {
    const events = buffer.get(channel) || [];
    return events.length >= this.config.maxSize;
  }

  evictOldest<T>(
    buffer: Map<string, BufferedEvent<unknown>[]>,
    channel: string
  ): BufferedEvent<unknown> | null {
    const events = buffer.get(channel) || [];
    return events.length > 0 ? events.shift() || null : null;
  }
}
